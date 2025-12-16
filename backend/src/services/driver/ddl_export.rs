use crate::models::export_ddl::ExportDdlOptions;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait DdlExportDriver: Send + Sync {
    async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String>;
}
