use anyhow::Result;
use async_trait::async_trait;
use crate::services::db_driver::FunctionInfo;

#[async_trait]
pub trait FunctionOperations: Send + Sync {
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>>;
    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo>;
}
