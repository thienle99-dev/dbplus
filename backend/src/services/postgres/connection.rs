use crate::models::entities::connection as ConnectionModel;
use anyhow::{Context, Result};
use deadpool_postgres::{Config, ManagerConfig, Pool, RecyclingMethod, Runtime};
use tokio_postgres::NoTls;

pub struct PostgresConnection {
    pool: Pool,
}

impl PostgresConnection {
    pub fn pool(&self) -> &Pool {
        &self.pool
    }

    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        tracing::info!(
            "[PostgresConnection] Creating new connection pool to {}:{}/{}",
            connection.host,
            connection.port,
            connection.database
        );

        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some(connection.database.clone());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        // Handle Read-Only
        if connection.is_read_only {
            cfg.options = Some("-c default_transaction_read_only=on".to_string());
        }

        // Handle SSL (Placeholder as dependencies are missing)
        if connection.ssl || connection.ssl_mode.as_deref().unwrap_or("disable") != "disable" {
            tracing::warn!(
                "SSL/TLS requested but not fully supported in this build. Proceeding with NoTls."
            );
        }

        tracing::debug!("[PostgresConnection] Pool config created, attempting to create pool...");

        match cfg.create_pool(Some(Runtime::Tokio1), NoTls) {
            Ok(pool) => {
                tracing::info!("[PostgresConnection] Connection pool created successfully");
                Ok(Self { pool })
            }
            Err(e) => {
                let error_msg = e.to_string();
                tracing::error!("[PostgresConnection] Failed to create pool: {}", error_msg);
                let error_lower = error_msg.to_lowercase();

                if error_lower.contains("does not exist")
                    || error_lower.contains("3d000")
                    || error_lower.contains("database") && error_lower.contains("not exist")
                {
                    return Err(anyhow::anyhow!(
                        "Database '{}' does not exist. Please create it first or use an existing database name. You can list available databases after testing the connection.",
                        connection.database
                    ));
                }
                Err(anyhow::anyhow!("Failed to create connection pool: {}", e))
            }
        }
    }

    pub async fn new_for_test(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        if connection.host.is_empty() {
            return Err(anyhow::anyhow!("Host cannot be empty"));
        }
        if connection.username.is_empty() {
            return Err(anyhow::anyhow!("Username cannot be empty"));
        }
        if password.is_empty() {
            return Err(anyhow::anyhow!("Password cannot be empty"));
        }

        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some("postgres".to_string());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        // Handle Read-Only
        if connection.is_read_only {
            cfg.options = Some("-c default_transaction_read_only=on".to_string());
        }

        // Handle SSL
        if connection.ssl || connection.ssl_mode.as_deref().unwrap_or("disable") != "disable" {
            tracing::warn!(
                "SSL/TLS requested but not fully supported in this build. Proceeding with NoTls."
            );
        }

        match cfg.create_pool(Some(Runtime::Tokio1), NoTls) {
            Ok(pool) => Ok(Self { pool }),
            Err(e) => {
                let error_msg = e.to_string();
                let error_lower = error_msg.to_lowercase();

                if error_lower.contains("connection refused")
                    || error_lower.contains("could not connect")
                {
                    Err(anyhow::anyhow!(
                        "Connection refused. Please check if PostgreSQL is running on {}:{}",
                        connection.host,
                        connection.port
                    ))
                } else if error_lower.contains("password authentication failed")
                    || error_lower.contains("authentication failed")
                {
                    Err(anyhow::anyhow!(
                        "Authentication failed. Please check your username and password."
                    ))
                } else if error_lower.contains("timeout") {
                    Err(anyhow::anyhow!("Connection timeout. Please check your network connection and firewall settings."))
                } else {
                    Err(anyhow::anyhow!(
                        "Failed to connect to PostgreSQL server: {}",
                        error_msg
                    ))
                }
            }
        }
    }
}
