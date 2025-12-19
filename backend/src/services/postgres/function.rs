use crate::services::db_driver::FunctionInfo;
use crate::services::driver::FunctionOperations;
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;

pub struct PostgresFunction {
    pool: Pool,
}

impl PostgresFunction {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl FunctionOperations for PostgresFunction {
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>> {
        tracing::info!("[PostgresFunction] list_functions - schema: {}", schema);

        let client = self.pool.get().await?;
        let query = "
            SELECT 
                n.nspname AS schema,
                p.proname AS name,
                pg_get_functiondef(p.oid) AS definition,
                pg_catalog.format_type(p.prorettype, NULL) AS return_type,
                l.lanname AS language,
                pg_catalog.pg_get_userbyid(p.proowner) AS owner,
                pg_catalog.pg_get_function_arguments(p.oid) AS arguments
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            JOIN pg_language l ON l.oid = p.prolang
            WHERE n.nspname = $1
                AND p.prokind = 'f'
            ORDER BY p.proname";

        let rows = client.query(query, &[&schema]).await?;

        let functions = rows
            .iter()
            .map(|row| FunctionInfo {
                schema: row.get(0),
                name: row.get(1),
                definition: row.get(2),
                language: Some(row.get(4)),
                return_type: Some(row.get(3)),
                arguments: Some(row.get(6)),
                owner: row.get(5),
            })
            .collect();

        tracing::info!(
            "[PostgresFunction] list_functions - found {} functions",
            rows.len()
        );
        Ok(functions)
    }

    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo> {
        tracing::info!(
            "[PostgresFunction] get_function_definition - schema: {}, function: {}",
            schema,
            function_name
        );

        let client = self.pool.get().await?;
        let query = "
            SELECT 
                n.nspname AS schema,
                p.proname AS name,
                pg_get_functiondef(p.oid) AS definition,
                pg_catalog.format_type(p.prorettype, NULL) AS return_type,
                l.lanname AS language,
                pg_catalog.pg_get_userbyid(p.proowner) AS owner,
                pg_catalog.pg_get_function_arguments(p.oid) AS arguments
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            JOIN pg_language l ON l.oid = p.prolang
            WHERE n.nspname = $1 
                AND p.proname = $2
                AND p.prokind = 'f'
            LIMIT 1";

        let row = client.query_one(query, &[&schema, &function_name]).await?;

        Ok(FunctionInfo {
            schema: row.get(0),
            name: row.get(1),
            definition: row.get(2),
            language: Some(row.get(4)),
            return_type: Some(row.get(3)),
            arguments: Some(row.get(6)),
            owner: row.get(5),
        })
    }
}
