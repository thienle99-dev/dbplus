use crate::services::db_driver::FunctionInfo;
use crate::services::driver::FunctionOperations;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::sqlite::SqlitePool;

pub struct SQLiteFunction {
    pool: SqlitePool,
}

impl SQLiteFunction {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl FunctionOperations for SQLiteFunction {
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>> {
        tracing::info!("[SQLiteFunction] list_functions - schema: {}", schema);

        if schema != "main" && !schema.is_empty() {
            return Ok(vec![]);
        }

        Ok(vec![])
    }

    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo> {
        tracing::info!(
            "[SQLiteFunction] get_function_definition - schema: {}, function: {}",
            schema,
            function_name
        );

        Err(anyhow::anyhow!("SQLite does not support user-defined functions in the same way as PostgreSQL"))
    }
}

