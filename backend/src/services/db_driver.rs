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
pub struct TableMetadata {
    pub table_name: String,
    pub columns: Vec<String>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IndexInfo {
    pub name: String,
    pub columns: Vec<String>,
    pub is_unique: bool,
    pub is_primary: bool,
    pub algorithm: String,
    pub condition: Option<String>,
    pub include: Option<Vec<String>>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViewInfo {
    pub schema: String,
    pub name: String,
    pub definition: String,
    pub owner: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionInfo {
    pub schema: String,
    pub name: String,
    pub definition: String,
    pub return_type: String,
    pub language: String,
    pub owner: Option<String>,
}

use crate::services::driver::{
    ColumnManagement, ConnectionDriver, FunctionOperations, NoSQLOperations, QueryDriver,
    SchemaIntrospection, TableOperations, ViewOperations,
};

#[async_trait]
pub trait DatabaseDriver:
    ConnectionDriver
    + QueryDriver
    + SchemaIntrospection
    + TableOperations
    + ColumnManagement
    + ViewOperations
    + FunctionOperations
    + Send
    + Sync
{
    async fn execute(&self, query: &str) -> Result<u64>;
    async fn query(&self, query: &str) -> Result<QueryResult>;
    async fn test_connection(&self) -> Result<()>;
    async fn get_databases(&self) -> Result<Vec<String>>;
    async fn get_schemas(&self) -> Result<Vec<String>>;
    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>>;
    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>>;
    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>>;
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult>;
    async fn execute_query(&self, query: &str) -> Result<QueryResult>;
    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints>;
    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics>;
    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>>;
    async fn add_column(&self, schema: &str, table: &str, column: &ColumnDefinition) -> Result<()>;
    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()>;
    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()>;
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>>;
    async fn get_view_definition(&self, schema: &str, view_name: &str) -> Result<ViewInfo>;
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>>;
    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo>;
}

#[async_trait]
impl<T> DatabaseDriver for T
where
    T: ConnectionDriver
        + QueryDriver
        + SchemaIntrospection
        + TableOperations
        + ColumnManagement
        + ViewOperations
        + FunctionOperations
        + Send
        + Sync,
{
    async fn execute(&self, query: &str) -> Result<u64> {
        <Self as QueryDriver>::execute(self, query).await
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        <Self as QueryDriver>::query(self, query).await
    }

    async fn test_connection(&self) -> Result<()> {
        <Self as ConnectionDriver>::test_connection(self).await
    }

    async fn get_databases(&self) -> Result<Vec<String>> {
        <Self as SchemaIntrospection>::get_databases(self).await
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        <Self as SchemaIntrospection>::get_schemas(self).await
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        <Self as SchemaIntrospection>::get_tables(self, schema).await
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        <Self as SchemaIntrospection>::get_columns(self, schema, table).await
    }

    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>> {
        <Self as SchemaIntrospection>::get_schema_metadata(self, schema).await
    }

    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult> {
        <Self as TableOperations>::get_table_data(self, schema, table, limit, offset).await
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        <Self as QueryDriver>::execute_query(self, query).await
    }

    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints> {
        <Self as TableOperations>::get_table_constraints(self, schema, table).await
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        <Self as TableOperations>::get_table_statistics(self, schema, table).await
    }

    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>> {
        <Self as TableOperations>::get_table_indexes(self, schema, table).await
    }

    async fn add_column(&self, schema: &str, table: &str, column: &ColumnDefinition) -> Result<()> {
        <Self as ColumnManagement>::add_column(self, schema, table, column).await
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()> {
        <Self as ColumnManagement>::alter_column(self, schema, table, column_name, new_def).await
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        <Self as ColumnManagement>::drop_column(self, schema, table, column_name).await
    }

    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>> {
        <Self as ViewOperations>::list_views(self, schema).await
    }

    async fn get_view_definition(&self, schema: &str, view_name: &str) -> Result<ViewInfo> {
        <Self as ViewOperations>::get_view_definition(self, schema, view_name).await
    }

    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>> {
        <Self as FunctionOperations>::list_functions(self, schema).await
    }

    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo> {
        <Self as FunctionOperations>::get_function_definition(self, schema, function_name).await
    }
}

pub trait SQLDatabaseDriver: DatabaseDriver {}

impl<T> SQLDatabaseDriver for T where T: DatabaseDriver {}

#[async_trait]
pub trait NoSQLDatabaseDriver: ConnectionDriver + NoSQLOperations + Send + Sync {}

#[async_trait]
impl<T> NoSQLDatabaseDriver for T where T: ConnectionDriver + NoSQLOperations + Send + Sync {}
