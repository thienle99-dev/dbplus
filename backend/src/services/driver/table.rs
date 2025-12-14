use anyhow::Result;
use async_trait::async_trait;
use crate::services::db_driver::{IndexInfo, QueryResult, TableConstraints, TableStatistics, TriggerInfo};

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
}
