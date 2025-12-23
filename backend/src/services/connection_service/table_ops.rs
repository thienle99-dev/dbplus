use super::ConnectionService;
use crate::services::db_driver::{DatabaseDriver, QueryResult};
use crate::services::driver::{ColumnManagement, SchemaIntrospection, TableOperations};
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;
use uuid::Uuid;

impl ConnectionService {
    pub async fn get_tables(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::TableInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                SchemaIntrospection::get_tables(&driver, schema).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                SchemaIntrospection::get_tables(&driver, schema).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                SchemaIntrospection::get_tables(&driver, schema).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                SchemaIntrospection::get_tables(&driver, schema).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_tables(&driver, schema).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn create_table(&self, connection_id: Uuid, schema: &str, table: &str) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::create_table(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::create_table(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::create_table(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::create_table(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                TableOperations::create_table(&driver, schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn drop_table(&self, connection_id: Uuid, schema: &str, table: &str) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::drop_table(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::drop_table(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::drop_table(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::drop_table(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                TableOperations::drop_table(&driver, schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_columns(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::TableColumn>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                SchemaIntrospection::get_columns(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                SchemaIntrospection::get_columns(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                SchemaIntrospection::get_columns(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                SchemaIntrospection::get_columns(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_columns(&driver, schema, table).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn get_table_data(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
        filter: Option<String>,
        document_id: Option<String>,
        fields: Option<Vec<String>>,
    ) -> Result<crate::services::db_driver::QueryResult> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        let start_time = std::time::Instant::now();

        let mut result = match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_data(
                    &driver,
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
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_data(
                    &driver,
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
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_data(
                    &driver,
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
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_data(
                    &driver,
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
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                TableOperations::get_table_data(
                    &driver,
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
            _ => Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                column_metadata: None,
                total_count: None,
                limit: Some(limit),
                offset: Some(offset as i64),
                has_more: None,
                row_metadata: None,
                execution_time_ms: None,
                json: None,
                display_mode: None,
            }),
        };

        let duration = start_time.elapsed();
        result.map(|mut res| {
            res.execution_time_ms = Some(duration.as_millis() as u64);
            res
        })
    }

    pub async fn add_column(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        column: &crate::services::db_driver::ColumnDefinition,
    ) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                ColumnManagement::add_column(&driver, schema, table, column).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                ColumnManagement::add_column(&driver, schema, table, column).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                ColumnManagement::add_column(&driver, schema, table, column).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                ColumnManagement::add_column(&driver, schema, table, column).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn alter_column(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &crate::services::db_driver::ColumnDefinition,
    ) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                ColumnManagement::alter_column(&driver, schema, table, column_name, new_def).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                ColumnManagement::alter_column(&driver, schema, table, column_name, new_def).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                ColumnManagement::alter_column(&driver, schema, table, column_name, new_def).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                ColumnManagement::alter_column(&driver, schema, table, column_name, new_def).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn drop_column(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        column_name: &str,
    ) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                ColumnManagement::drop_column(&driver, schema, table, column_name).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                ColumnManagement::drop_column(&driver, schema, table, column_name).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                ColumnManagement::drop_column(&driver, schema, table, column_name).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                ColumnManagement::drop_column(&driver, schema, table, column_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_constraints(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableConstraints> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_constraints(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_constraints(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_constraints(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_constraints(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_constraints(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::TableConstraints {
                foreign_keys: vec![],
                check_constraints: vec![],
                unique_constraints: vec![],
            }),
        }
    }

    pub async fn get_table_statistics(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableStatistics> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_statistics(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_statistics(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_statistics(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_statistics(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_statistics(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::TableStatistics {
                row_count: None,
                table_size: None,
                index_size: None,
                total_size: None,
                created_at: None,
                last_modified: None,
            }),
        }
    }

    pub async fn get_table_indexes(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::IndexInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_indexes(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_indexes(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_indexes(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_indexes(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_indexes(&driver, schema, table).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn get_table_triggers(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::TriggerInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_triggers(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_triggers(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_triggers(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_triggers(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_triggers(&driver, schema, table).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn get_table_comment(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableComment> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_comment(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_comment(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_comment(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_comment(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_comment(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::TableComment { comment: None }),
        }
    }

    pub async fn set_table_comment(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::set_table_comment(&driver, schema, table, comment).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::set_table_comment(&driver, schema, table, comment).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::set_table_comment(&driver, schema, table, comment).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::set_table_comment(&driver, schema, table, comment).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::set_table_comment(&driver, schema, table, comment).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_permissions(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::TableGrant>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_permissions(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_permissions(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_permissions(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_permissions(&driver, schema, table).await
            }
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;
                DatabaseDriver::get_table_permissions(&driver, schema, table).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn list_roles(
        &self,
        connection_id: Uuid,
    ) -> Result<Vec<crate::services::db_driver::RoleInfo>> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::list_roles(&driver).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::list_roles(&driver).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::list_roles(&driver).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::list_roles(&driver).await
            }
            _ => Ok(vec![]),
        }
    }

    pub async fn set_table_permissions(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        grantee: &str,
        privileges: Vec<String>,
        grant_option: bool,
    ) -> Result<()> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::set_table_permissions(
                    &driver,
                    schema,
                    table,
                    grantee,
                    privileges,
                    grant_option,
                )
                .await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::set_table_permissions(
                    &driver,
                    schema,
                    table,
                    grantee,
                    privileges,
                    grant_option,
                )
                .await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::set_table_permissions(
                    &driver,
                    schema,
                    table,
                    grantee,
                    privileges,
                    grant_option,
                )
                .await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::set_table_permissions(
                    &driver,
                    schema,
                    table,
                    grantee,
                    privileges,
                    grant_option,
                )
                .await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_dependencies(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableDependencies> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_table_dependencies(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_table_dependencies(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_table_dependencies(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_table_dependencies(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::TableDependencies {
                views: vec![],
                routines: vec![],
                referencing_foreign_keys: vec![],
            }),
        }
    }

    pub async fn get_storage_bloat_info(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::StorageBloatInfo> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_storage_bloat_info(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_storage_bloat_info(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_storage_bloat_info(&driver, schema, table).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_storage_bloat_info(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::StorageBloatInfo {
                live_tuples: None,
                dead_tuples: None,
                dead_tuple_pct: None,
                table_size: None,
                index_size: None,
                total_size: None,
                last_vacuum: None,
                last_autovacuum: None,
                last_analyze: None,
                last_autoanalyze: None,
            }),
        }
    }

    pub async fn get_partitions(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::PartitionInfo> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                TableOperations::get_partitions(&driver, schema, table).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                TableOperations::get_partitions(&driver, schema, table).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                TableOperations::get_partitions(&driver, schema, table).await
            }
            "mysql" | "mariadb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                TableOperations::get_partitions(&driver, schema, table).await
            }
            _ => Ok(crate::services::db_driver::PartitionInfo {
                is_partitioned: false,
                strategy: None,
                key: None,
                partitions: vec![],
            }),
        }
    }
    pub async fn update_row(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        primary_key: HashMap<String, Value>,
        updates: HashMap<String, Value>,
        row_metadata: Option<HashMap<String, Value>>,
    ) -> Result<u64> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        // For now only Couchbase supports update_row via TableOperations
        match connection.db_type.as_str() {
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;

                TableOperations::update_row(
                    &driver,
                    schema,
                    table,
                    &primary_key,
                    &updates,
                    row_metadata.as_ref(),
                )
                .await
            }
            _ => Err(anyhow::anyhow!(
                "Update row via TableOperations not supported for this driver yet"
            )),
        }
    }

    pub async fn delete_row(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        primary_key: HashMap<String, Value>,
        row_metadata: Option<HashMap<String, Value>>,
    ) -> Result<u64> {
        let (connection, password) = self.get_connection_with_password(connection_id).await?;

        match connection.db_type.as_str() {
            "couchbase" => {
                let driver = crate::services::couchbase::connection::CouchbaseDriver::new(
                    &connection,
                    &password,
                )
                .await?;

                TableOperations::delete_row(
                    &driver,
                    schema,
                    table,
                    &primary_key,
                    row_metadata.as_ref(),
                )
                .await
            }
            _ => Err(anyhow::anyhow!(
                "Delete row via TableOperations not supported for this driver yet"
            )),
        }
    }
}
