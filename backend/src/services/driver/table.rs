use anyhow::Result;
use async_trait::async_trait;
use crate::services::db_driver::{
    IndexInfo, QueryResult, RoleInfo, TableComment, TableConstraints, TableGrant, TableStatistics,
    TriggerInfo, StorageBloatInfo, PartitionInfo,
};

#[async_trait]
pub trait TableOperations: Send + Sync {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult>;

    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints>;
    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics>;
    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>>;
    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>>;
    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment>;
    async fn set_table_comment(&self, schema: &str, table: &str, comment: Option<String>) -> Result<()>;
    async fn get_table_permissions(&self, schema: &str, table: &str) -> Result<Vec<TableGrant>>;
    async fn list_roles(&self) -> Result<Vec<RoleInfo>>;
    async fn set_table_permissions(
        &self,
        schema: &str,
        table: &str,
        grantee: &str,
        privileges: Vec<String>,
        grant_option: bool,
    ) -> Result<()>;
    async fn get_storage_bloat_info(&self, schema: &str, table: &str) -> Result<StorageBloatInfo>;
    async fn get_partitions(&self, schema: &str, table: &str) -> Result<PartitionInfo>;
}
