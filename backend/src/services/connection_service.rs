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
}

impl ConnectionService {
    /// Creates a new instance of ConnectionService with encryption support.
    pub fn new(db: DatabaseConnection) -> Result<Self> {
        let encryption = EncryptionService::new()?;
        Ok(Self { db, encryption })
    }

    /// Retrieves all connections from the database.
    pub async fn get_all_connections(&self) -> Result<Vec<connection::Model>, DbErr> {
        Connection::find().all(&self.db).await
    }

    /// Retrieves a single connection by its ID.
    pub async fn get_connection_by_id(&self, id: Uuid) -> Result<Option<connection::Model>, DbErr> {
        Connection::find_by_id(id).one(&self.db).await
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

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, &password).await?;
                driver.get_databases().await
            }
            _ => Err(anyhow::anyhow!(
                "Unsupported database type for listing databases"
            )),
        }
    }

    pub async fn get_schemas(&self, connection_id: Uuid) -> Result<Vec<String>> {
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_schemas().await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_columns(schema, table).await
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
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
        let connection = self
            .get_connection_by_id(connection_id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let password = self.encryption.decrypt(&connection.password)?;

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
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

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new_for_test(&connection, password).await?;
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
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

        use crate::services::db_driver::DatabaseDriver;
        use crate::services::postgres_driver::PostgresDriver;

        match connection.db_type.as_str() {
            "postgres" => {
                let driver = PostgresDriver::new(&connection, &password).await?;
                driver.get_table_statistics(schema, table).await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
