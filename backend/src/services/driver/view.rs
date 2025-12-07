use anyhow::Result;
use async_trait::async_trait;
use crate::services::db_driver::ViewInfo;

#[async_trait]
pub trait ViewOperations: Send + Sync {
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>>;
    async fn get_view_definition(&self, schema: &str, view_name: &str) -> Result<ViewInfo>;
}
