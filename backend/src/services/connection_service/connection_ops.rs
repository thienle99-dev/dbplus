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

        // Try getting from keychain first
        let password = if let Ok(Some(p)) = self.credentials.get_password(&id, "password") {
            p
        } else {
            // Fallback to database encryption for existing connections
            self.encryption.decrypt(&connection.password)?
        };

        let connection = self.apply_database_override(connection);
        Ok((connection, password))
    }

    /// Creates a new connection with encrypted password.
    pub async fn create_connection(&self, data: connection::Model) -> Result<connection::Model> {
        let id = Uuid::new_v4();

        // Save to keychain
        if let Err(e) = self
            .credentials
            .set_password(&id, "password", &data.password)
        {
            tracing::error!("Failed to save password to keychain: {}", e);
        }

        if let Some(ref ssh_pass) = data.ssh_password {
            if !ssh_pass.is_empty() {
                if let Err(e) = self.credentials.set_password(&id, "ssh_password", ssh_pass) {
                    tracing::error!("Failed to save SSH password to keychain: {}", e);
                }
            }
        }

        if let Some(ref passphrase) = data.ssh_key_passphrase {
            if !passphrase.is_empty() {
                if let Err(e) = self
                    .credentials
                    .set_password(&id, "ssh_key_passphrase", passphrase)
                {
                    tracing::error!("Failed to save SSH key passphrase to keychain: {}", e);
                }
            }
        }

        // Still encrypt in DB as a secondary/legacy fallback if keychain fails or isn't available
        let encrypted_password = self.encryption.encrypt(&data.password)?;
        let encrypted_ssh_password = if let Some(ref p) = data.ssh_password {
            if !p.is_empty() {
                Some(self.encryption.encrypt(p)?)
            } else {
                None
            }
        } else {
            None
        };
        let encrypted_ssh_passphrase = if let Some(ref p) = data.ssh_key_passphrase {
            if !p.is_empty() {
                Some(self.encryption.encrypt(p)?)
            } else {
                None
            }
        } else {
            None
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
            ssl_mode: Set(data.ssl_mode),
            ssl_ca_file: Set(data.ssl_ca_file),
            ssl_key_file: Set(data.ssl_key_file),
            ssl_cert_file: Set(data.ssl_cert_file),
            status_color: Set(data.status_color),
            tags: Set(data.tags),
            ssh_enabled: Set(data.ssh_enabled),
            ssh_host: Set(data.ssh_host),
            ssh_port: Set(data.ssh_port),
            ssh_user: Set(data.ssh_user),
            ssh_auth_type: Set(data.ssh_auth_type),
            ssh_password: Set(encrypted_ssh_password),
            ssh_key_file: Set(data.ssh_key_file),
            ssh_key_passphrase: Set(encrypted_ssh_passphrase),
            is_read_only: Set(data.is_read_only),
            environment: Set(data.environment),
            safe_mode_level: Set(data.safe_mode_level),
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

        let encrypted_password = if !data.password.is_empty() && data.password != existing.password
        {
            // Update keychain
            if let Err(e) = self
                .credentials
                .set_password(&id, "password", &data.password)
            {
                tracing::error!("Failed to update password in keychain: {}", e);
            }
            self.encryption.encrypt(&data.password)?
        } else {
            existing.password
        };

        let mut active_model = connection::ActiveModel {
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
            ssl_mode: Set(data.ssl_mode),
            ssl_ca_file: Set(data.ssl_ca_file),
            ssl_key_file: Set(data.ssl_key_file),
            ssl_cert_file: Set(data.ssl_cert_file),
            status_color: Set(data.status_color),
            tags: Set(data.tags),
            ssh_enabled: Set(data.ssh_enabled),
            ssh_host: Set(data.ssh_host),
            ssh_port: Set(data.ssh_port),
            ssh_user: Set(data.ssh_user),
            ssh_auth_type: Set(data.ssh_auth_type),
            is_read_only: Set(data.is_read_only),
            environment: Set(data.environment),
            safe_mode_level: Set(data.safe_mode_level),
            updated_at: Set(Utc::now().into()),
            ..Default::default()
        };

        if let Some(ssh_password) = data.ssh_password {
            if !ssh_password.is_empty() && Some(&ssh_password) != existing.ssh_password.as_ref() {
                if let Err(e) = self
                    .credentials
                    .set_password(&id, "ssh_password", &ssh_password)
                {
                    tracing::error!("Failed to update SSH password in keychain: {}", e);
                }
                active_model.ssh_password = Set(Some(self.encryption.encrypt(&ssh_password)?));
            } else {
                active_model.ssh_password = Set(existing.ssh_password);
            }
        } else {
            active_model.ssh_password = Set(existing.ssh_password);
        }

        if let Some(passphrase) = data.ssh_key_passphrase {
            if !passphrase.is_empty() && Some(&passphrase) != existing.ssh_key_passphrase.as_ref() {
                if let Err(e) =
                    self.credentials
                        .set_password(&id, "ssh_key_passphrase", &passphrase)
                {
                    tracing::error!("Failed to update SSH key passphrase in keychain: {}", e);
                }
                active_model.ssh_key_passphrase = Set(Some(self.encryption.encrypt(&passphrase)?));
            } else {
                active_model.ssh_key_passphrase = Set(existing.ssh_key_passphrase);
            }
        } else {
            active_model.ssh_key_passphrase = Set(existing.ssh_key_passphrase);
        }

        active_model.ssh_key_file = Set(data.ssh_key_file);

        active_model
            .update(&self.db)
            .await
            .map_err(|e| anyhow::anyhow!(e))
    }

    pub async fn delete_connection(&self, id: Uuid) -> Result<()> {
        // Cleanup keychain
        if let Err(e) = self.credentials.delete_passwords(&id) {
            tracing::warn!("Failed to delete passwords for {} from keychain: {}", id, e);
        }

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
            "postgres" | "cockroachdb" | "cockroach" => {
                let driver = PostgresDriver::new(&connection, password).await?;
                driver.test_connection().await
            }
            "sqlite" => {
                let driver = self.sqlite_driver(&connection, password).await?;
                driver.test_connection().await
            }
            "clickhouse" => {
                let driver =
                    crate::services::clickhouse::ClickHouseDriver::new(&connection, password)
                        .await?;
                driver.test_connection().await
            }
            "mysql" | "mariadb" | "tidb" => {
                let driver =
                    crate::services::mysql::MySqlDriver::from_model(&connection, password).await?;
                driver.test_connection().await
            }
            "couchbase" => {
                let driver =
                    crate::services::couchbase::CouchbaseDriver::new(&connection, password).await?;
                driver.test_connection().await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        }
    }
}
