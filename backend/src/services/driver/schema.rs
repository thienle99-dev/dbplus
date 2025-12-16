use crate::services::db_driver::{
    ExtensionInfo, SchemaForeignKey, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait SchemaIntrospection: Send + Sync {
    async fn get_databases(&self) -> Result<Vec<String>>;
    async fn get_schemas(&self) -> Result<Vec<String>>;
    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>>;
    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>>;
    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>>;
    async fn search_objects(&self, query: &str) -> Result<Vec<SearchResult>>;
    async fn get_schema_foreign_keys(&self, schema: &str) -> Result<Vec<SchemaForeignKey>>;
    async fn get_extensions(&self) -> Result<Vec<ExtensionInfo>>;
}
