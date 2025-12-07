use crate::services::db_driver::{TableColumn, TableInfo};
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
}
