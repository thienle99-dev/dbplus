mod column;
mod connection;
mod ddl_export;
mod function;
mod query;
mod schema;
mod table;
mod view;

pub use column::SQLiteColumn;
pub use connection::SQLiteConnection;
pub use function::SQLiteFunction;
pub use query::SQLiteQuery;
pub use schema::SQLiteSchema;
pub use table::SQLiteTable;
pub use view::SQLiteView;

use super::db_driver::QueryResult;
use super::driver::{
    ColumnManagement, ConnectionDriver, FunctionOperations, QueryDriver, SchemaIntrospection,
    TableOperations, ViewOperations,
};
use crate::models::entities::connection as ConnectionModel;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::SqlitePool;

#[derive(Clone, Debug)]
pub struct SqliteAttachedDatabase {
    pub name: String,
    pub file_path: String,
    pub read_only: bool,
}

pub struct SQLiteDriver {
    query: SQLiteQuery,
    schema: SQLiteSchema,
    table: SQLiteTable,
    column: SQLiteColumn,
    view: SQLiteView,
    function: SQLiteFunction,
}

impl SQLiteDriver {
    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        Self::new_with_attachments(connection, password, Vec::new()).await
    }

    pub async fn new_with_attachments(
        connection: &ConnectionModel::Model,
        password: &str,
        attachments: Vec<SqliteAttachedDatabase>,
    ) -> Result<Self> {
        let conn =
            SQLiteConnection::new_with_attachments(connection, password, &attachments).await?;
        let pool = conn.pool().clone();

        Ok(Self {
            query: SQLiteQuery::new(pool.clone()),
            schema: SQLiteSchema::new(pool.clone()),
            table: SQLiteTable::new(pool.clone()),
            column: SQLiteColumn::new(pool.clone()),
            view: SQLiteView::new(pool.clone()),
            function: SQLiteFunction::new(pool),
        })
    }

    pub fn pool(&self) -> &SqlitePool {
        self.query.pool()
    }
}

#[async_trait]
impl ConnectionDriver for SQLiteDriver {
    async fn test_connection(&self) -> Result<()> {
        self.query.test_connection().await
    }
}

#[async_trait]
impl QueryDriver for SQLiteDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        self.query.execute(query).await
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        self.query.query(query).await
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        self.query.execute_query(query).await
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        self.query.execute_script(script).await
    }

    async fn explain(&self, query: &str, analyze: bool) -> Result<serde_json::Value> {
        self.query.explain(query, analyze).await
    }
}

#[async_trait]
impl SchemaIntrospection for SQLiteDriver {
    async fn get_databases(&self) -> Result<Vec<String>> {
        self.schema.get_databases().await
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        self.schema.get_schemas().await
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<super::db_driver::TableInfo>> {
        self.schema.get_tables(schema).await
    }

    async fn get_columns(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<super::db_driver::TableColumn>> {
        self.schema.get_columns(schema, table).await
    }

    async fn get_schema_metadata(
        &self,
        schema: &str,
    ) -> Result<Vec<super::db_driver::TableMetadata>> {
        self.schema.get_schema_metadata(schema).await
    }

    async fn search_objects(&self, query: &str) -> Result<Vec<super::db_driver::SearchResult>> {
        self.schema.search_objects(query).await
    }

    async fn get_schema_foreign_keys(
        &self,
        schema: &str,
    ) -> Result<Vec<super::db_driver::SchemaForeignKey>> {
        self.schema.get_schema_foreign_keys(schema).await
    }

    async fn get_extensions(&self) -> Result<Vec<super::db_driver::ExtensionInfo>> {
        self.schema.get_extensions().await
    }
}

#[async_trait]
impl TableOperations for SQLiteDriver {
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
        self.table
            .get_table_data(schema, table, limit, offset, filter, document_id, fields)
            .await
    }

    async fn get_table_constraints(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableConstraints> {
        self.table.get_table_constraints(schema, table).await
    }

    async fn get_table_statistics(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableStatistics> {
        self.table.get_table_statistics(schema, table).await
    }

    async fn get_table_indexes(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<super::db_driver::IndexInfo>> {
        self.table.get_table_indexes(schema, table).await
    }

    async fn get_table_triggers(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<super::db_driver::TriggerInfo>> {
        self.table.get_table_triggers(schema, table).await
    }

    async fn get_table_comment(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableComment> {
        self.table.get_table_comment(schema, table).await
    }

    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        self.table.set_table_comment(schema, table, comment).await
    }

    async fn get_table_permissions(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<super::db_driver::TableGrant>> {
        self.table.get_table_permissions(schema, table).await
    }

    async fn list_roles(&self) -> Result<Vec<super::db_driver::RoleInfo>> {
        self.table.list_roles().await
    }

    async fn set_table_permissions(
        &self,
        schema: &str,
        table: &str,
        grantee: &str,
        privileges: Vec<String>,
        grant_option: bool,
    ) -> Result<()> {
        self.table
            .set_table_permissions(schema, table, grantee, privileges, grant_option)
            .await
    }

    async fn get_table_dependencies(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableDependencies> {
        self.table.get_table_dependencies(schema, table).await
    }

    async fn get_storage_bloat_info(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::StorageBloatInfo> {
        self.table.get_storage_bloat_info(schema, table).await
    }

    async fn get_partitions(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::PartitionInfo> {
        self.table.get_partitions(schema, table).await
    }
}

#[async_trait]
impl ColumnManagement for SQLiteDriver {
    async fn add_column(
        &self,
        schema: &str,
        table: &str,
        column: &super::db_driver::ColumnDefinition,
    ) -> Result<()> {
        self.column.add_column(schema, table, column).await
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &super::db_driver::ColumnDefinition,
    ) -> Result<()> {
        self.column
            .alter_column(schema, table, column_name, new_def)
            .await
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        self.column.drop_column(schema, table, column_name).await
    }
}

#[async_trait]
impl ViewOperations for SQLiteDriver {
    async fn list_views(&self, schema: &str) -> Result<Vec<super::db_driver::ViewInfo>> {
        self.view.list_views(schema).await
    }

    async fn get_view_definition(
        &self,
        schema: &str,
        view_name: &str,
    ) -> Result<super::db_driver::ViewInfo> {
        self.view.get_view_definition(schema, view_name).await
    }
}

#[async_trait]
impl DatabaseManagementDriver for SQLiteDriver {
    async fn create_database(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite does not support creating separate databases via this API"
        ))
    }

    async fn drop_database(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite does not support dropping databases via this API"
        ))
    }

    async fn create_schema(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite does not support schemas via this API"
        ))
    }

    async fn drop_schema(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite does not support schemas via this API"
        ))
    }

    async fn install_extension(
        &self,
        _name: &str,
        _schema: Option<&str>,
        _version: Option<&str>,
    ) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite extensions are not managed via this API yet"
        ))
    }

    async fn drop_extension(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "SQLite extensions are not managed via this API yet"
        ))
    }
}

#[async_trait]
impl FunctionOperations for SQLiteDriver {
    async fn list_functions(&self, schema: &str) -> Result<Vec<super::db_driver::FunctionInfo>> {
        self.function.list_functions(schema).await
    }

    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<super::db_driver::FunctionInfo> {
        self.function
            .get_function_definition(schema, function_name)
            .await
    }
}

#[async_trait]
impl super::driver::SessionOperations for SQLiteDriver {
    async fn get_active_sessions(&self) -> Result<Vec<super::db_driver::SessionInfo>> {
        Err(anyhow::anyhow!(
            "Session management not supported for SQLite yet"
        ))
    }
    async fn kill_session(&self, _pid: i32) -> Result<()> {
        Err(anyhow::anyhow!(
            "Session management not supported for SQLite yet"
        ))
    }
}
