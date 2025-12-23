use crate::services::db_driver::FunctionInfo;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait FunctionOperations: Send + Sync {
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>>;
    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo>;
    async fn get_function_permissions(
        &self,
        _schema: &str,
        _function_name: &str,
    ) -> Result<Vec<crate::services::db_driver::TableGrant>> {
        Err(anyhow::anyhow!("Operation not supported"))
    }
}
