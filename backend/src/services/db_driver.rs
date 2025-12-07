use anyhow::Result;
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableColumn {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableInfo {
    pub schema: String,
    pub name: String,
    pub table_type: String, // "BASE TABLE" or "VIEW"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
    pub affected_rows: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForeignKey {
    pub constraint_name: String,
    pub column_name: String,
    pub foreign_schema: String,
    pub foreign_table: String,
    pub foreign_column: String,
    pub update_rule: String,
    pub delete_rule: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckConstraint {
    pub constraint_name: String,
    pub check_clause: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UniqueConstraint {
    pub constraint_name: String,
    pub columns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableConstraints {
    pub foreign_keys: Vec<ForeignKey>,
    pub check_constraints: Vec<CheckConstraint>,
    pub unique_constraints: Vec<UniqueConstraint>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableStatistics {
    pub row_count: Option<i64>,
    pub table_size: Option<i64>, // in bytes
    pub index_size: Option<i64>, // in bytes
    pub total_size: Option<i64>, // in bytes
    pub created_at: Option<String>,
    pub last_modified: Option<String>,
}

#[async_trait]
pub trait DatabaseDriver: Send + Sync {
    async fn execute(&self, query: &str) -> Result<u64>;
    async fn query(&self, query: &str) -> Result<QueryResult>;
    async fn test_connection(&self) -> Result<()>;

    // Schema Introspection
    async fn get_databases(&self) -> Result<Vec<String>>;
    async fn get_schemas(&self) -> Result<Vec<String>>;
    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>>;
    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>>;
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult>;

    // Query Execution
    async fn execute_query(&self, query: &str) -> Result<QueryResult>;

    // Table Info Enhancements
    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints>;
    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics>;
}
