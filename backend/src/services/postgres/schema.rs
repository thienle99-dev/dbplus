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
                "SELECT n.nspname, c.relname, 
                CASE 
                    WHEN c.relkind = 'v' THEN 'VIEW'
                    WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW'
                    WHEN c.relkind = 'f' THEN 'FOREIGN TABLE'
                    ELSE 'BASE TABLE'
                END as table_type
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = $1 
               AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
             ORDER BY c.relname",
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

        // Uses pg_catalog to support materialized views, foreign tables, partitioned tables
        let rows = client
            .query(
                "SELECT 
                a.attname, 
                format_type(a.atttypid, a.atttypmod) as data_type,
                NOT a.attnotnull as is_nullable,
                pg_get_expr(ad.adbin, ad.adrelid) as column_default,
                CASE WHEN pk.attname IS NOT NULL THEN true ELSE false END as is_primary_key
             FROM pg_attribute a
             JOIN pg_class c ON a.attrelid = c.oid
             JOIN pg_namespace n ON c.relnamespace = n.oid
             LEFT JOIN pg_attrdef ad ON a.attrelid = ad.adrelid AND a.attnum = ad.adnum
             LEFT JOIN (
                SELECT i.indrelid, a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attnum = ANY(i.indkey) AND a.attrelid = i.indrelid
                WHERE i.indisprimary
             ) pk ON pk.indrelid = c.oid AND pk.attname = a.attname
             WHERE n.nspname = $1 AND c.relname = $2
               AND a.attnum > 0 AND NOT a.attisdropped
             ORDER BY a.attnum",
                &[&schema, &table],
            )
            .await?;

        let columns: Vec<TableColumn> = rows
            .iter()
            .map(|row| TableColumn {
                name: row.get(0),
                data_type: row.get(1),
                is_nullable: row.get(2),
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
        // Using pg_catalog to include materialized views, partitioned tables, foreign tables
        // Use LEFT JOIN to ensure tables without columns are still included
        let rows = client
            .query(
                "SELECT c.relname, a.attname 
                 FROM pg_class c
                 JOIN pg_namespace n ON n.oid = c.relnamespace
                 LEFT JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
                 WHERE n.nspname = $1
                   AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
                 ORDER BY c.relname, a.attnum",
                &[&schema],
            )
            .await?;

        let mut result: Vec<TableMetadata> = Vec::new();
        for row in rows {
            let table_name: String = row.get(0);
            let column_name: Option<String> = row.get(1);

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
            if let Some(col) = column_name {
                result.last_mut().unwrap().columns.push(col);
            }
        }

        Ok(result)
    }

    async fn search_objects(&self, query: &str) -> Result<Vec<SearchResult>> {
        let client = self.pool.get().await?;
        let search_pattern = format!("%{}%", query);

        // Intentionally include pg_catalog and information_schema in search results
        // to allow users to find system tables and views.
        let sql = "
            SELECT n.nspname as schema, c.relname as name, 
                   CASE 
                     WHEN c.relkind = 'r' THEN 'TABLE' 
                     WHEN c.relkind = 'v' THEN 'VIEW' 
                     WHEN c.relkind = 'm' THEN 'MATERIALIZED VIEW'
                     WHEN c.relkind = 'f' THEN 'FOREIGN TABLE'
                     WHEN c.relkind = 'p' THEN 'TABLE' -- Partitioned table
                   END as type
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname NOT LIKE 'pg_toast%'
              AND n.nspname NOT LIKE 'pg_temp%'
              AND c.relkind IN ('r', 'v', 'm', 'f', 'p')
              AND c.relname ILIKE $1
            
            UNION ALL
            
            SELECT n.nspname as schema, p.proname as name, 'FUNCTION' as type
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname NOT LIKE 'pg_toast%'
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

    async fn get_extensions(&self) -> Result<Vec<crate::services::db_driver::ExtensionInfo>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT 
                    e.extname as name,
                    e.extversion as version,
                    n.nspname as schema,
                    c.description
                FROM pg_extension e
                JOIN pg_namespace n ON n.oid = e.extnamespace
                LEFT JOIN pg_description c ON c.objoid = e.oid AND c.classoid = 'pg_extension'::regclass
                WHERE e.extname != 'plpgsql'
                ORDER BY e.extname",
                &[],
            )
            .await?;

        Ok(rows
            .iter()
            .map(|row| crate::services::db_driver::ExtensionInfo {
                name: row.get(0),
                version: row.get(1),
                schema: row.get(2),
                description: row.get(3),
            })
            .collect())
    }
}
