use super::ConnectionService;
use crate::services::driver::QueryDriver;
use anyhow::Result;
use sqlparser::ast::Statement;
use sqlparser::dialect::{Dialect, GenericDialect, MySqlDialect, PostgreSqlDialect, SQLiteDialect};
use sqlparser::parser::Parser;
use uuid::Uuid;

impl ConnectionService {
    pub async fn execute_query(
        &self,
        connection_id: Uuid,
        query: &str,
    ) -> Result<crate::services::db_driver::QueryResult> {
        self.execute_query_with_options(connection_id, query, None, None, false, false)
            .await
    }

    pub async fn execute_script(&self, connection_id: Uuid, script: &str) -> Result<u64> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::QueryDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::execute(&driver, script).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::execute_script(&driver, script).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::execute_script(&driver, script).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                QueryDriver::execute_script(&driver, script).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::execute_script(&driver, script).await
            }
            "mongodb" | "mongo" => {
                let driver =
                    crate::services::mongo::MongoDriver::new(&connection, &password).await?;
                QueryDriver::execute_script(&driver, script).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn execute_query_with_options(
        &self,
        connection_id: Uuid,
        query: &str,
        limit: Option<i64>,
        offset: Option<i64>,
        include_total_count: bool,
        confirmed_unsafe: bool,
    ) -> Result<crate::services::db_driver::QueryResult> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        // Guardrails Logic
        let is_prod = connection.environment.to_lowercase() == "production";
        let safe_level = if is_prod && connection.safe_mode_level == 0 {
            1 // Default to warning for prod if off
        } else {
            connection.safe_mode_level
        };

        if safe_level > 0 && !confirmed_unsafe {
            let dialect: Box<dyn Dialect> = match connection.db_type.as_str() {
                "postgres" | "cockroachdb" | "cockroach" => Box::new(PostgreSqlDialect {}),
                "sqlite" => Box::new(SQLiteDialect {}),
                "mysql" | "mariadb" | "tidb" => Box::new(MySqlDialect {}),
                "clickhouse" => Box::new(GenericDialect {}), // Generic for now
                "couchbase" => Box::new(GenericDialect {}),
                _ => Box::new(GenericDialect {}),
            };

            // Non-blocking parse error (if we can't parse, we let DB handle it, or we could be strict)
            if let Ok(statements) = Parser::parse_sql(&*dialect, query) {
                for stmt in statements {
                    let mut warning: Option<String> = None;
                    match stmt {
                        Statement::Delete { selection, .. } => {
                            if selection.is_none() {
                                warning = Some("DELETE without WHERE clause".to_string());
                            }
                        }
                        Statement::Update { selection, .. } => {
                            if selection.is_none() {
                                warning = Some("UPDATE without WHERE clause".to_string());
                            }
                        }
                        Statement::Drop { object_type, .. } => match object_type {
                            sqlparser::ast::ObjectType::Table => {
                                warning = Some("DROP TABLE detected".to_string())
                            }
                            _ => {}
                        },
                        Statement::Truncate { .. } => {
                            warning = Some("TRUNCATE TABLE detected".to_string());
                        }
                        _ => {}
                    }

                    if let Some(msg) = warning {
                        if safe_level == 2 {
                            return Err(anyhow::anyhow!(
                                "UNSAFE_OPERATION_BLOCKED: {} (Strict Mode)",
                                msg
                            ));
                        } else {
                            return Err(anyhow::anyhow!("UNSAFE_CONFIRMATION_REQUIRED: {}", msg));
                        }
                    }
                }
            }
        }

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        let start_time = std::time::Instant::now();

        let mut result = match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            "mongodb" | "mongo" => {
                let driver =
                    crate::services::mongo::MongoDriver::new(&connection, &password).await?;
                DatabaseDriver::execute_query(&driver, query).await?
            }
            _ => return Err(anyhow::anyhow!("Unsupported database type")),
        };

        let duration = start_time.elapsed();
        result.execution_time_ms = Some(duration.as_millis() as u64);

        // Apply pagination if specified
        if let (Some(limit_val), Some(offset_val)) = (limit, offset) {
            let total_rows = result.rows.len();
            let start = offset_val.min(total_rows as i64) as usize;
            let end = (offset_val + limit_val).min(total_rows as i64) as usize;

            result.rows = result.rows[start..end].to_vec();
            result.limit = Some(limit_val);
            result.offset = Some(offset_val);
            result.has_more = Some(end < total_rows);

            if include_total_count {
                result.total_count = Some(total_rows as i64);
            }
        }

        Ok(result)
    }

    pub async fn execute(&self, connection_id: Uuid, query: &str) -> Result<u64> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::execute(&driver, query).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::execute(&driver, query).await
            }
            "mongodb" | "mongo" => {
                let driver =
                    crate::services::mongo::MongoDriver::new(&connection, &password).await?;
                QueryDriver::execute(&driver, query).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn explain_query(
        &self,
        connection_id: Uuid,
        query: &str,
        analyze: bool,
    ) -> Result<serde_json::Value> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            "mongodb" | "mongo" => {
                let driver =
                    crate::services::mongo::MongoDriver::new(&connection, &password).await?;
                QueryDriver::explain(&driver, query, analyze).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn search_objects(
        &self,
        connection_id: Uuid,
        query: &str,
    ) -> Result<Vec<crate::services::db_driver::SearchResult>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::SchemaIntrospection;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.search_objects(query).await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, &password).await?;
                driver.search_objects(query).await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, &password)
                        .await?;
                driver.search_objects(query).await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, &password).await?;
                driver.search_objects(query).await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, &password)
                        .await?;
                driver.search_objects(query).await
            }
            "mongodb" | "mongo" => {
                let driver =
                    crate::services::mongo::MongoDriver::new(&connection, &password).await?;
                crate::services::driver::SchemaIntrospection::search_objects(&driver, query).await
            }
            _ => Ok(vec![]),
        }
    }
}
