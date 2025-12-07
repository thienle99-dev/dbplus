use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;

#[derive(Debug, Clone)]
pub struct CollectionInfo {
    pub name: String,
    pub count: Option<u64>,
    pub size: Option<u64>,
}

#[derive(Debug, Clone)]
pub struct DocumentResult {
    pub documents: Vec<Value>,
    pub total: Option<u64>,
}

#[async_trait]
pub trait NoSQLOperations: Send + Sync {
    async fn list_collections(&self, database: &str) -> Result<Vec<CollectionInfo>>;
    async fn get_collection_data(
        &self,
        database: &str,
        collection: &str,
        limit: i64,
        offset: i64,
    ) -> Result<DocumentResult>;
    async fn get_collection_count(&self, database: &str, collection: &str) -> Result<u64>;
}
