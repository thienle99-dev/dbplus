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
    pub is_foreign_key: bool,
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
pub struct ColumnMetadata {
    pub table_name: Option<String>,
    pub column_name: String,
    pub is_primary_key: bool,
    pub is_editable: bool,
    pub schema_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Value>>,
    pub affected_rows: u64,
    pub column_metadata: Option<Vec<ColumnMetadata>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total_count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub has_more: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub row_metadata: Option<Vec<Value>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub execution_time_ms: Option<u64>,
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
pub struct SchemaForeignKey {
    pub name: String,
    pub source_schema: String,
    pub source_table: String,
    pub source_column: String,
    pub target_schema: String,
    pub target_table: String,
    pub target_column: String,
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
pub struct TriggerInfo {
    pub name: String,
    pub timing: String,      // BEFORE / AFTER / INSTEAD OF
    pub events: Vec<String>, // INSERT / UPDATE / DELETE / TRUNCATE
    pub level: String,       // ROW / STATEMENT
    pub enabled: String,     // enabled / disabled / replica / always
    pub function_schema: Option<String>,
    pub function_name: Option<String>,
    pub definition: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableComment {
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableGrant {
    pub grantee: String,
    pub privilege: String,
    pub grantor: Option<String>,
    pub is_grantable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleInfo {
    pub name: String,
    pub can_login: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageBloatInfo {
    pub live_tuples: Option<i64>,
    pub dead_tuples: Option<i64>,
    pub dead_tuple_pct: Option<f64>,
    pub table_size: Option<i64>, // bytes
    pub index_size: Option<i64>, // bytes
    pub total_size: Option<i64>, // bytes
    pub last_vacuum: Option<String>,
    pub last_autovacuum: Option<String>,
    pub last_analyze: Option<String>,
    pub last_autoanalyze: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionChildInfo {
    pub schema: String,
    pub name: String,
    pub bound: Option<String>,
    pub table_size: Option<i64>, // bytes
    pub index_size: Option<i64>, // bytes
    pub total_size: Option<i64>, // bytes
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionInfo {
    pub is_partitioned: bool,
    pub strategy: Option<String>, // LIST / RANGE / HASH
    pub key: Option<String>,      // pg_get_partkeydef(...)
    pub partitions: Vec<PartitionChildInfo>,
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
    pub language: Option<String>,
    pub return_type: Option<String>,
    pub arguments: Option<String>,
    pub owner: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionInfo {
    pub name: String,
    pub version: String,
    pub schema: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependentViewInfo {
    pub schema: String,
    pub name: String,
    pub kind: String, // view / materialized_view
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependentRoutineInfo {
    pub schema: String,
    pub name: String,
    pub kind: String,      // function / procedure / aggregate / window
    pub arguments: String, // pg_get_function_identity_arguments(...)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub schema: String,
    pub name: String,
    pub r#type: String, // "TABLE", "VIEW", "FUNCTION"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReferencingForeignKeyInfo {
    pub schema: String,
    pub table: String,
    pub constraint_name: String,
    pub columns: Vec<String>,
    pub referenced_columns: Vec<String>,
    pub on_update: String,
    pub on_delete: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableDependencies {
    pub views: Vec<DependentViewInfo>,
    pub routines: Vec<DependentRoutineInfo>,
    pub referencing_foreign_keys: Vec<ReferencingForeignKeyInfo>,
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
        filter: Option<String>,
        document_id: Option<String>,
        fields: Option<Vec<String>>,
    ) -> Result<QueryResult>;
    async fn execute_query(&self, query: &str) -> Result<QueryResult>;
    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints>;
    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics>;
    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>>;
    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>>;
    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment>;
    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()>;
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
    async fn get_table_dependencies(&self, schema: &str, table: &str) -> Result<TableDependencies>;
    async fn get_storage_bloat_info(&self, schema: &str, table: &str) -> Result<StorageBloatInfo>;
    async fn get_partitions(&self, schema: &str, table: &str) -> Result<PartitionInfo>;
    async fn create_table(&self, schema: &str, table: &str) -> Result<()>;
    async fn drop_table(&self, schema: &str, table: &str) -> Result<()>;
    async fn update_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &std::collections::HashMap<String, serde_json::Value>,
        updates: &std::collections::HashMap<String, serde_json::Value>,
        row_metadata: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) -> Result<u64>;
    async fn delete_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &std::collections::HashMap<String, serde_json::Value>,
        row_metadata: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) -> Result<u64>;
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
    async fn list_extensions(&self) -> Result<Vec<ExtensionInfo>>;
    async fn explain(&self, query: &str, analyze: bool) -> Result<serde_json::Value>;
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
        filter: Option<String>,
        document_id: Option<String>,
        fields: Option<Vec<String>>,
    ) -> Result<QueryResult> {
        <Self as TableOperations>::get_table_data(
            self,
            schema,
            table,
            limit,
            offset,
            filter,
            document_id,
            fields,
        )
        .await
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

    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>> {
        <Self as TableOperations>::get_table_triggers(self, schema, table).await
    }

    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment> {
        <Self as TableOperations>::get_table_comment(self, schema, table).await
    }

    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        <Self as TableOperations>::set_table_comment(self, schema, table, comment).await
    }

    async fn get_table_permissions(&self, schema: &str, table: &str) -> Result<Vec<TableGrant>> {
        <Self as TableOperations>::get_table_permissions(self, schema, table).await
    }

    async fn list_roles(&self) -> Result<Vec<RoleInfo>> {
        <Self as TableOperations>::list_roles(self).await
    }

    async fn set_table_permissions(
        &self,
        schema: &str,
        table: &str,
        grantee: &str,
        privileges: Vec<String>,
        grant_option: bool,
    ) -> Result<()> {
        <Self as TableOperations>::set_table_permissions(
            self,
            schema,
            table,
            grantee,
            privileges,
            grant_option,
        )
        .await
    }

    async fn get_table_dependencies(&self, schema: &str, table: &str) -> Result<TableDependencies> {
        <Self as TableOperations>::get_table_dependencies(self, schema, table).await
    }

    async fn get_storage_bloat_info(&self, schema: &str, table: &str) -> Result<StorageBloatInfo> {
        <Self as TableOperations>::get_storage_bloat_info(self, schema, table).await
    }

    async fn get_partitions(&self, schema: &str, table: &str) -> Result<PartitionInfo> {
        <Self as TableOperations>::get_partitions(self, schema, table).await
    }

    async fn create_table(&self, schema: &str, table: &str) -> Result<()> {
        <Self as TableOperations>::create_table(self, schema, table).await
    }

    async fn drop_table(&self, schema: &str, table: &str) -> Result<()> {
        <Self as TableOperations>::drop_table(self, schema, table).await
    }

    async fn update_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &std::collections::HashMap<String, serde_json::Value>,
        updates: &std::collections::HashMap<String, serde_json::Value>,
        row_metadata: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) -> Result<u64> {
        <Self as TableOperations>::update_row(
            self,
            schema,
            table,
            primary_key,
            updates,
            row_metadata,
        )
        .await
    }

    async fn delete_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &std::collections::HashMap<String, serde_json::Value>,
        row_metadata: Option<&std::collections::HashMap<String, serde_json::Value>>,
    ) -> Result<u64> {
        <Self as TableOperations>::delete_row(self, schema, table, primary_key, row_metadata).await
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

    async fn list_extensions(&self) -> Result<Vec<ExtensionInfo>> {
        <Self as SchemaIntrospection>::get_extensions(self).await
    }

    async fn explain(&self, query: &str, analyze: bool) -> Result<serde_json::Value> {
        <Self as QueryDriver>::explain(self, query, analyze).await
    }
}

pub trait SQLDatabaseDriver: DatabaseDriver {}

impl<T> SQLDatabaseDriver for T where T: DatabaseDriver {}

#[async_trait]
pub trait NoSQLDatabaseDriver: ConnectionDriver + NoSQLOperations + Send + Sync {}

#[async_trait]
impl<T> NoSQLDatabaseDriver for T where T: ConnectionDriver + NoSQLOperations + Send + Sync {}
