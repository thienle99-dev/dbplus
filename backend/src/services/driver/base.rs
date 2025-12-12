use crate::services::db_driver::QueryResult;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait ConnectionDriver: Send + Sync {
    async fn test_connection(&self) -> Result<()>;
}

#[async_trait]
pub trait QueryDriver: Send + Sync {
    async fn execute(&self, query: &str) -> Result<u64>;
    async fn query(&self, query: &str) -> Result<QueryResult>;
    async fn execute_query(&self, query: &str) -> Result<QueryResult>;
    async fn explain(&self, query: &str, analyze: bool) -> Result<serde_json::Value>;
}
