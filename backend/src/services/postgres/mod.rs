mod column;
mod connection;
mod function;
mod query;
mod schema;
mod table;
mod view;

pub use column::PostgresColumn;
pub use connection::PostgresConnection;
pub use function::PostgresFunction;
pub use query::PostgresQuery;
pub use schema::PostgresSchema;
pub use table::PostgresTable;
pub use view::PostgresView;

use super::db_driver::QueryResult;
use super::driver::{
    ColumnManagement, ConnectionDriver, FunctionOperations, QueryDriver, SchemaIntrospection,
    TableOperations, ViewOperations,
};
use crate::models::entities::connection as ConnectionModel;
use anyhow::Result;
use async_trait::async_trait;

pub struct PostgresDriver {
    connection: PostgresConnection,
    query: PostgresQuery,
    schema: PostgresSchema,
    table: PostgresTable,
    column: PostgresColumn,
    view: PostgresView,
    function: PostgresFunction,
}

impl PostgresDriver {
    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        let conn = PostgresConnection::new(connection, password).await?;
        let pool = conn.pool().clone();

        Ok(Self {
            connection: conn,
            query: PostgresQuery::new(pool.clone()),
            schema: PostgresSchema::new(pool.clone()),
            table: PostgresTable::new(pool.clone()),
            column: PostgresColumn::new(pool.clone()),
            view: PostgresView::new(pool.clone()),
            function: PostgresFunction::new(pool),
        })
    }

    pub async fn new_for_test(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        let conn = PostgresConnection::new_for_test(connection, password).await?;
        let pool = conn.pool().clone();

        Ok(Self {
            connection: conn,
            query: PostgresQuery::new(pool.clone()),
            schema: PostgresSchema::new(pool.clone()),
            table: PostgresTable::new(pool.clone()),
            column: PostgresColumn::new(pool.clone()),
            view: PostgresView::new(pool.clone()),
            function: PostgresFunction::new(pool),
        })
    }

    pub async fn create_database_if_not_exists(
        connection: &ConnectionModel::Model,
        password: &str,
    ) -> Result<()> {
        PostgresConnection::create_database_if_not_exists(connection, password).await
    }
}

#[async_trait]
impl ConnectionDriver for PostgresDriver {
    async fn test_connection(&self) -> Result<()> {
        self.query.test_connection().await
    }
}

#[async_trait]
impl QueryDriver for PostgresDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        self.query.execute(query).await
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        self.query.query(query).await
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        self.query.execute_query(query).await
    }
}

#[async_trait]
impl SchemaIntrospection for PostgresDriver {
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
}

#[async_trait]
impl TableOperations for PostgresDriver {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult> {
        self.table
            .get_table_data(schema, table, limit, offset)
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
}

#[async_trait]
impl ColumnManagement for PostgresDriver {
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
impl ViewOperations for PostgresDriver {
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
impl FunctionOperations for PostgresDriver {
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
