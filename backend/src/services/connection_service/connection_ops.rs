use super::ConnectionService;
use crate::models::entities::{connection, connection::Entity as Connection};
use anyhow::Result;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

impl ConnectionService {
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

    pub async fn update_connection(
        &self,
        id: Uuid,
        data: connection::Model,
    ) -> Result<connection::Model> {
        let existing = self
            .get_connection_by_id(id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let encrypted_password = if data.password != existing.password {
            self.encryption.encrypt(&data.password)?
        } else {
            data.password
        };

        let active_model = connection::ActiveModel {
            id: Set(id),
            name: Set(data.name),
            db_type: Set(data.db_type),
            host: Set(data.host),
            port: Set(data.port),
            database: Set(data.database),
            username: Set(data.username),
            password: Set(encrypted_password),
            ssl: Set(data.ssl),
            ssl_cert: Set(data.ssl_cert),
            updated_at: Set(Utc::now().into()),
            ..Default::default()
        };

        active_model
            .update(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn delete_connection(&self, id: Uuid) -> Result<()> {
        connection::Entity::delete_by_id(id)
            .exec(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))?;
        Ok(())
    }

    pub async fn update_connection_database(
        &self,
        id: Uuid,
        database: String,
    ) -> Result<connection::Model> {
        let _existing = self
            .get_connection_by_id(id)
            .await?
            .ok_or(anyhow::anyhow!("Connection not found"))?;

        let active_model = connection::ActiveModel {
            id: Set(id),
            database: Set(database),
            updated_at: Set(Utc::now().into()),
            ..Default::default()
        };

        active_model
            .update(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
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
                let driver = PostgresDriver::new(&connection, password).await?;
                driver.test_connection().await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, password).await?;
                driver.test_connection().await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
