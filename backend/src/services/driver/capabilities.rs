use anyhow::Result;
use async_trait::async_trait;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DriverCapability {
    Schemas,
    Views,
    Functions,
    Indexes,
    Constraints,
    ColumnManagement,
    Transactions,
    PreparedStatements,
    Streaming,
    BulkOperations,
}

pub trait DriverCapabilities {
    fn supported_capabilities(&self) -> Vec<DriverCapability>;
    fn has_capability(&self, capability: DriverCapability) -> bool {
        self.supported_capabilities().contains(&capability)
    }
}

#[async_trait]
pub trait TransactionDriver: Send + Sync {
    async fn begin_transaction(&self) -> Result<String>;
    async fn commit_transaction(&self, transaction_id: &str) -> Result<()>;
    async fn rollback_transaction(&self, transaction_id: &str) -> Result<()>;
}

#[async_trait]
pub trait PreparedStatementDriver: Send + Sync {
    async fn prepare(&self, query: &str) -> Result<String>;
    async fn execute_prepared(&self, statement_id: &str, params: &[&dyn ToString]) -> Result<crate::services::db_driver::QueryResult>;
}
