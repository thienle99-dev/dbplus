use crate::services::db_driver::{
    SchemaForeignKey, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;

pub struct PostgresSchema {
    pool: Pool,
}

impl PostgresSchema {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SchemaIntrospection for PostgresSchema {
    async fn get_databases(&self) -> Result<Vec<String>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname",
                &[],
            )
            .await?;

        Ok(rows.iter().map(|row| row.get(0)).collect())
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT schema_name FROM information_schema.schemata 
             WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') 
             AND schema_name NOT LIKE 'pg_temp_%' 
             AND schema_name NOT LIKE 'pg_toast_temp_%'
             ORDER BY schema_name",
                &[],
            )
            .await?;

        Ok(rows.iter().map(|row| row.get(0)).collect())
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT table_schema, table_name, table_type 
             FROM information_schema.tables 
             WHERE table_schema = $1 
             ORDER BY table_name",
                &[&schema],
            )
            .await?;

        Ok(rows
            .iter()
            .map(|row| TableInfo {
                schema: row.get(0),
                name: row.get(1),
                table_type: row.get(2),
            })
            .collect())
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        tracing::info!(
            "[PostgresSchema] get_columns - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let rows = client
            .query(
                "SELECT 
                c.column_name, 
                c.data_type, 
                c.is_nullable, 
                c.column_default,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
             FROM information_schema.columns c
             LEFT JOIN (
                SELECT kcu.table_schema, kcu.table_name, kcu.column_name
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc 
                  ON kcu.constraint_name = tc.constraint_name
                  AND kcu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
             ) pk ON c.table_schema = pk.table_schema 
                  AND c.table_name = pk.table_name 
                  AND c.column_name = pk.column_name
             WHERE c.table_schema = $1 AND c.table_name = $2
             ORDER BY c.ordinal_position",
                &[&schema, &table],
            )
            .await?;

        let columns: Vec<TableColumn> = rows
            .iter()
            .map(|row| TableColumn {
                name: row.get(0),
                data_type: row.get(1),
                is_nullable: row.get::<_, String>(2) == "YES",
                default_value: row.get(3),
                is_primary_key: row.get(4),
            })
            .collect();

        tracing::info!(
            "[PostgresSchema] get_columns - found {} columns",
            columns.len()
        );

        Ok(columns)
    }
    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>> {
        let client = self.pool.get().await?;
        // Get all columns for all tables in schema
        let rows = client
            .query(
                "SELECT table_name, column_name 
                 FROM information_schema.columns 
                 WHERE table_schema = $1 
                 ORDER BY table_name, ordinal_position",
                &[&schema],
            )
            .await?;

        let mut result: Vec<TableMetadata> = Vec::new();
        for row in rows {
            let table_name: String = row.get(0);
            let column_name: String = row.get(1);

            if result
                .last()
                .map(|t| t.table_name != table_name)
                .unwrap_or(true)
            {
                result.push(TableMetadata {
                    table_name: table_name.clone(),
                    columns: Vec::new(),
                });
            }
            result.last_mut().unwrap().columns.push(column_name);
        }

        Ok(result)
    }

    async fn search_objects(&self, query: &str) -> Result<Vec<SearchResult>> {
        let client = self.pool.get().await?;
        let search_pattern = format!("%{}%", query);

        let sql = "
            SELECT n.nspname as schema, c.relname as name, 
                   CASE 
                     WHEN c.relkind = 'r' THEN 'TABLE' 
                     WHEN c.relkind = 'v' THEN 'VIEW' 
                     WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW'
                   END as type
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT IN ('information_schema', 'pg_catalog')
              AND n.nspname NOT LIKE 'pg_toast%'
              AND n.nspname NOT LIKE 'pg_temp%'
              AND c.relkind IN ('r', 'v', 'm')
              AND c.relname ILIKE $1
            
            UNION ALL
            
            SELECT n.nspname as schema, p.proname as name, 'FUNCTION' as type
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname NOT IN ('information_schema', 'pg_catalog')
              AND n.nspname NOT LIKE 'pg_toast%'
              AND n.nspname NOT LIKE 'pg_temp%'
              AND p.proname ILIKE $1
            
            LIMIT 50
       ";

        let rows = client.query(sql, &[&search_pattern]).await?;

        Ok(rows
            .iter()
            .map(|row| SearchResult {
                schema: row.get(0),
                name: row.get(1),
                r#type: row.get(2),
            })
            .collect())
    }

    async fn get_schema_foreign_keys(&self, schema: &str) -> Result<Vec<SchemaForeignKey>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT
                    tc.constraint_name,
                    tc.table_schema,
                    tc.table_name,
                    kcu.column_name,
                    ccu.table_schema AS foreign_schema,
                    ccu.table_name AS foreign_table,
                    ccu.column_name AS foreign_column
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = $1",
                &[&schema],
            )
            .await?;

        Ok(rows
            .iter()
            .map(|row| SchemaForeignKey {
                name: row.get(0),
                source_schema: row.get(1),
                source_table: row.get(2),
                source_column: row.get(3),
                target_schema: row.get(4),
                target_table: row.get(5),
                target_column: row.get(6),
            })
            .collect())
    }
}
