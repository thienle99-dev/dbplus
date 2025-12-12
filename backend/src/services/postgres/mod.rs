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
use crate::services::driver::extension::DatabaseManagementDriver;
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

    async fn explain(&self, query: &str, analyze: bool) -> Result<serde_json::Value> {
        self.query.explain(query, analyze).await
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

fn quote_postgres_ident(name: &str) -> Result<String> {
    let trimmed = name.trim();
    if trimmed.is_empty() {
        return Err(anyhow::anyhow!("Name cannot be empty"));
    }
    if trimmed.contains('\0') {
        return Err(anyhow::anyhow!("Name cannot contain NUL character"));
    }
    Ok(format!("\"{}\"", trimmed.replace("\"", "\"\"")))
}

fn quote_postgres_string_literal(value: &str) -> Result<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(anyhow::anyhow!("Value cannot be empty"));
    }
    if trimmed.contains('\0') {
        return Err(anyhow::anyhow!("Value cannot contain NUL character"));
    }
    Ok(format!("'{}'", trimmed.replace("'", "''")))
}

impl PostgresDriver {
    pub async fn create_database_with_options(
        &self,
        name: &str,
        options: Option<crate::handlers::database::CreateDatabaseOptions>,
    ) -> Result<()> {
        let client = self.connection.pool().get().await?;

        let db_ident = quote_postgres_ident(name)?;
        let mut sql = format!("CREATE DATABASE {}", db_ident);

        if let Some(options) = options {
            let mut parts: Vec<String> = Vec::new();

            if let Some(owner) = options.owner.as_deref().map(str::trim).filter(|s| !s.is_empty())
            {
                parts.push(format!("OWNER = {}", quote_postgres_ident(owner)?));
            }

            if let Some(template) = options
                .template
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                parts.push(format!("TEMPLATE = {}", quote_postgres_ident(template)?));
            }

            if let Some(encoding) = options
                .encoding
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                parts.push(format!(
                    "ENCODING = {}",
                    quote_postgres_string_literal(encoding)?
                ));
            }

            if let Some(lc_collate) = options
                .lc_collate
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                parts.push(format!(
                    "LC_COLLATE = {}",
                    quote_postgres_string_literal(lc_collate)?
                ));
            }

            if let Some(lc_ctype) = options
                .lc_ctype
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                parts.push(format!(
                    "LC_CTYPE = {}",
                    quote_postgres_string_literal(lc_ctype)?
                ));
            }

            if let Some(tablespace) = options
                .tablespace
                .as_deref()
                .map(str::trim)
                .filter(|s| !s.is_empty())
            {
                parts.push(format!(
                    "TABLESPACE = {}",
                    quote_postgres_ident(tablespace)?
                ));
            }

            if let Some(allow) = options.allow_connections {
                parts.push(format!(
                    "ALLOW_CONNECTIONS = {}",
                    if allow { "true" } else { "false" }
                ));
            }

            if let Some(limit) = options.connection_limit {
                parts.push(format!("CONNECTION LIMIT = {}", limit));
            }

            if let Some(is_template) = options.is_template {
                parts.push(format!(
                    "IS_TEMPLATE = {}",
                    if is_template { "true" } else { "false" }
                ));
            }

            if !parts.is_empty() {
                sql.push_str(" WITH ");
                sql.push_str(&parts.join(" "));
            }
        }

        client.execute(&sql, &[]).await?;
        Ok(())
    }
}

#[async_trait]
impl DatabaseManagementDriver for PostgresDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        self.create_database_with_options(name, None).await
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let client = self.connection.pool().get().await?;
        let ident = quote_postgres_ident(name)?;
        let sql = format!("DROP DATABASE {}", ident);
        client.execute(&sql, &[]).await.map_err(|e| {
            anyhow::anyhow!(
                "Failed to drop database '{}': {}. Close active connections to that database and try again.",
                name.trim(),
                e
            )
        })?;
        Ok(())
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        let client = self.connection.pool().get().await?;
        let ident = quote_postgres_ident(name)?;
        let sql = format!("CREATE SCHEMA {}", ident);
        client.execute(&sql, &[]).await?;
        Ok(())
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        let client = self.connection.pool().get().await?;
        let ident = quote_postgres_ident(name)?;
        let sql = format!("DROP SCHEMA {}", ident);
        client.execute(&sql, &[]).await.map_err(|e| {
            anyhow::anyhow!(
                "Failed to drop schema '{}': {}. Ensure the schema is empty (or drop objects first) and try again.",
                name.trim(),
                e
            )
        })?;
        Ok(())
    }
}
