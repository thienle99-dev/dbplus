use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;

#[async_trait]
pub trait StreamingDriver: Send + Sync {
    async fn stream_query(
        &self,
        query: &str,
        batch_size: usize,
    ) -> Result<Vec<Vec<Value>>>;
}

#[async_trait]
pub trait BulkOperationsDriver: Send + Sync {
    async fn bulk_insert(
        &self,
        schema: &str,
        table: &str,
        columns: &[String],
        rows: &[Vec<Value>],
    ) -> Result<u64>;

    async fn bulk_update(
        &self,
        schema: &str,
        table: &str,
        updates: &[(String, Value)],
        where_clause: &str,
    ) -> Result<u64>;

    async fn bulk_delete(
        &self,
        schema: &str,
        table: &str,
        where_clause: &str,
    ) -> Result<u64>;
}

#[async_trait]
pub trait DatabaseManagementDriver: Send + Sync {
    async fn create_database(&self, name: &str) -> Result<()>;
    async fn drop_database(&self, name: &str) -> Result<()>;
    async fn create_schema(&self, name: &str) -> Result<()>;
    async fn drop_schema(&self, name: &str) -> Result<()>;
}
