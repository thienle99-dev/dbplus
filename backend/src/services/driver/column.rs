use anyhow::Result;
use async_trait::async_trait;
use crate::services::db_driver::ColumnDefinition;

#[async_trait]
pub trait ColumnManagement: Send + Sync {
    async fn add_column(
        &self,
        schema: &str,
        table: &str,
        column: &ColumnDefinition,
    ) -> Result<()>;

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()>;

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()>;
}
