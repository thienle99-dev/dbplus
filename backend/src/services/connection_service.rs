use crate::models::entities::{connection, connection::Entity as Connection};
use crate::services::encryption_service::EncryptionService;
use anyhow::Result;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

/// Service for managing database connections and executing queries.
pub struct ConnectionService {
    db: DatabaseConnection,
    encryption: EncryptionService,
    database_override: Option<String>,
}

impl ConnectionService {
    /// Creates a new instance of ConnectionService with encryption support.
    pub fn new(db: DatabaseConnection) -> Result<Self> {
        let encryption = EncryptionService::new()?;
        Ok(Self {
            db,
            encryption,
            database_override: None,
        })
    }

    pub fn with_database_override(mut self, database: Option<String>) -> Self {
        self.database_override = database;
        self
    }

    fn apply_database_override(&self, mut connection: connection::Model) -> connection::Model {
        if let Some(db) = &self.database_override {
            let db = db.trim();
            if !db.is_empty() {
                connection.database = db.to_string();
            }
        }
        connection
    }

    /// Retrieves all connections from the database.
    pub async fn get_all_connections(&self) -> Result<Vec<connection::Model>, DbErr> {
        Connection::find().all(&self.db).await
    }

    /// Retrieves a single connection by its ID.
    pub async fn get_connection_by_id(&self, id: Uuid) -> Result<Option<connection::Model>, DbErr> {
        Connection::find_by_id(id).one(&self.db).await
    }

    pub async fn get_connection_with_password(
        &self,
        id: Uuid,
    ) -> Result<(connection::Model, String)> {
        let connection = self
            .get_connection_by_id(id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        Ok((connection, password))
    }

    /// Creates a new connection with encrypted password.
    pub async fn create_connection(&self, data: connection::Model) -> Result<connection::Model> {
        let encrypted_password = self.encryption.encrypt(&data.password)?;

        let active_model = connection::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(data.name),
            db_type: Set(data.db_type),
            host: Set(data.host),
            port: Set(data.port),
            database: Set(data.database),
            username: Set(data.username),
            password: Set(encrypted_password),
            ssl: Set(data.ssl),
            ssl_cert: Set(data.ssl_cert),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
            ..Default::default()
        };

        active_model
            .insert(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn get_databases(&self, connection_id: Uuid) -> Result<Vec<String>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.get_databases().await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_databases().await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for listing databases"
            )),
        }
    }

    pub async fn create_database(
        &self,
        connection_id: Uuid,
        name: &str,
        options: Option<crate::handlers::database::CreateDatabaseOptions>,
    ) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.create_database_with_options(name, options).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support creating separate databases via this API"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for create_database"
            )),
        }
    }

    pub async fn drop_database(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.drop_database(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support dropping databases via this API"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for drop_database"
            )),
        }
    }

    pub async fn get_schemas(&self, connection_id: Uuid) -> Result<Vec<String>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_schemas().await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_schemas().await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn create_schema(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.create_schema(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support schemas via this API"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for create_schema"
            )),
        }
    }

    pub async fn drop_schema(&self, connection_id: Uuid, name: &str) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::driver::extension::DatabaseManagementDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.drop_schema(name).await
            }
            "sqlite" => Err(anyhow::anyhow!(
                "SQLite does not support schemas via this API"
            )),
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for drop_schema"
            )),
        }
    }

    pub async fn get_tables(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::TableInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_tables(schema).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_tables(schema).await
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_columns(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_columns(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_schema_metadata(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::TableMetadata>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_schema_metadata(schema).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_schema_metadata(schema).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_data(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<crate::services::db_driver::QueryResult> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_data(schema, table, limit, offset).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_data(schema, table, limit, offset).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn execute_query(
        &self,
        connection_id: Uuid,
        query: &str,
    ) -> Result<crate::services::db_driver::QueryResult> {
        self.execute_query_with_options(connection_id, query, None, None, false)
            .await
    }

    pub async fn execute_query_with_options(
        &self,
        connection_id: Uuid,
        query: &str,
        limit: Option<i64>,
        offset: Option<i64>,
        include_total_count: bool,
    ) -> Result<crate::services::db_driver::QueryResult> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        let trimmed = query.trim_start();
        let upper = trimmed.to_uppercase();
        let is_select = upper.starts_with("SELECT") || upper.starts_with("WITH");

        // For SELECT/WITH queries we support server-side pagination by wrapping into a subquery.
        // This avoids materializing huge result sets in the backend and frontend.
        if is_select && (limit.is_some() || offset.is_some() || include_total_count) {
            let base = query.trim().trim_end_matches(';').to_string();
            let limit = limit.unwrap_or(1000).max(1);
            let offset = offset.unwrap_or(0).max(0);

            let page_sql = format!(
                "SELECT * FROM ({}) AS __dbplus_subq LIMIT {} OFFSET {}",
                base, limit, offset
            );
            let count_sql = format!("SELECT COUNT(*) AS count FROM ({}) AS __dbplus_subq", base);

            let mut result = match connection.db_type.as_str() {
                "postgres" => {
                    let driver = PostgresDriver::new(&connection, &password).await?;
                    driver.query(&page_sql).await?
                }
                "sqlite" => {
                    let driver = SQLiteDriver::new(&connection, &password).await?;
                    driver.query(&page_sql).await?
                }
                _ => return Err(anyhow::anyhow!("Unsupported database type")),
            };

            result.limit = Some(limit);
            result.offset = Some(offset);

            if include_total_count {
                let count_result = match connection.db_type.as_str() {
                    "postgres" => {
                        let driver = PostgresDriver::new(&connection, &password).await?;
                        driver.query(&count_sql).await?
                    }
                    "sqlite" => {
                        let driver = SQLiteDriver::new(&connection, &password).await?;
                        driver.query(&count_sql).await?
                    }
                    _ => return Err(anyhow::anyhow!("Unsupported database type")),
                };

                let total = count_result
                    .rows
                    .get(0)
                    .and_then(|r| r.get(0))
                    .and_then(|v| match v {
                        serde_json::Value::Number(n) => n.as_i64(),
                        serde_json::Value::String(s) => s.parse::<i64>().ok(),
                        _ => None,
                    });

                result.total_count = total;
                if let Some(total_count) = total {
                    let fetched = result.rows.len() as i64;
                    result.has_more = Some(offset + fetched < total_count);
                }
            }

            return Ok(result);
        }

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.execute_query(query).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.execute_query(query).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn update_connection(
        &self,
        id: Uuid,
        data: connection::Model,
    ) -> Result<connection::Model> {
        let mut active_model: connection::ActiveModel = Connection::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?
            .into();

        active_model.name = Set(data.name);
        active_model.db_type = Set(data.db_type);
        active_model.host = Set(data.host);
        active_model.port = Set(data.port);
        active_model.database = Set(data.database);
        active_model.username = Set(data.username);

        // Only update password if provided (and different)
        if !data.password.is_empty() && data.password != "********" {
            let encrypted_password = self.encryption.encrypt(&data.password)?;
            active_model.password = Set(encrypted_password);
        }

        active_model.ssl = Set(data.ssl);
        active_model.ssl_cert = Set(data.ssl_cert);
        active_model.updated_at = Set(Utc::now().into());

        active_model
            .update(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn update_connection_database(&self, id: Uuid, database: String) -> Result<connection::Model> {
        let mut active_model: connection::ActiveModel = Connection::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?
            .into();

        active_model.database = Set(database);
        active_model.updated_at = Set(Utc::now().into());

        active_model
            .update(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn delete_connection(&self, id: Uuid) -> Result<DeleteResult, DbErr> {
        Connection::delete_by_id(id).exec(&self.db).await
    }

    pub async fn test_connection(
        &self,
        connection: connection::Model,
        password: &str,
    ) -> Result<()> {
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, password).await?;
                driver.test_connection().await?;
                Ok(())
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, password).await?;
                driver.test_connection().await?;
                Ok(())
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_constraints(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_constraints(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_statistics(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableStatistics> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_statistics(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_statistics(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_indexes(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::IndexInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_indexes(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_indexes(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_triggers(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::TriggerInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_triggers(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_triggers(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_table_comment(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::TableComment> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_comment(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_comment(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn set_table_comment(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.set_table_comment(schema, table, comment).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.set_table_comment(schema, table, comment).await
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_permissions(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_permissions(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn list_roles(
        &self,
        connection_id: Uuid,
    ) -> Result<Vec<crate::services::db_driver::RoleInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.list_roles().await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.list_roles().await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver
                    .set_table_permissions(schema, table, grantee, privileges, grant_option)
                    .await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver
                    .set_table_permissions(schema, table, grantee, privileges, grant_option)
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_dependencies(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_table_dependencies(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_storage_bloat_info(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::StorageBloatInfo> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_storage_bloat_info(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_storage_bloat_info(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_partitions(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
    ) -> Result<crate::services::db_driver::PartitionInfo> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_partitions(schema, table).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_partitions(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn add_column(
        &self,
        connection_id: Uuid,
        schema: &str,
        table: &str,
        column: &crate::services::db_driver::ColumnDefinition,
    ) -> Result<()> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.add_column(schema, table, column).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.add_column(schema, table, column).await
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver
                    .alter_column(schema, table, column_name, new_def)
                    .await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver
                    .alter_column(schema, table, column_name, new_def)
                    .await
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.drop_column(schema, table, column_name).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.drop_column(schema, table, column_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn list_views(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::ViewInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.list_views(schema).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.list_views(schema).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_view_definition(
        &self,
        connection_id: Uuid,
        schema: &str,
        view_name: &str,
    ) -> Result<crate::services::db_driver::ViewInfo> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_view_definition(schema, view_name).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_view_definition(schema, view_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn list_functions(
        &self,
        connection_id: Uuid,
        schema: &str,
    ) -> Result<Vec<crate::services::db_driver::FunctionInfo>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.list_functions(schema).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.list_functions(schema).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }

    pub async fn get_function_definition(
        &self,
        connection_id: Uuid,
        schema: &str,
        function_name: &str,
    ) -> Result<crate::services::db_driver::FunctionInfo> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;
        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);
        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;
        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_function_definition(schema, function_name).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.get_function_definition(schema, function_name).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
    pub async fn execute(&self, connection_id: Uuid, query: &str) -> Result<u64> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;
        let connection = self.apply_database_override(connection);

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.execute(query).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.execute(query).await
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;
        use crate::services::sqlite::SQLiteDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.explain(query, analyze).await
            }
            "sqlite" => {
                let driver = SQLiteDriver::new(&connection, &password).await?;
                driver.explain(query, analyze).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
