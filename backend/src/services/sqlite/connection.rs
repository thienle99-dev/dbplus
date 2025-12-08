use crate::models::entities::connection as ConnectionModel;
use anyhow::{Context, Result};
use sqlx::sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions};
use std::str::FromStr;

pub struct SQLiteConnection {
    pool: SqlitePool,
}

impl SQLiteConnection {
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    pub async fn new(connection: &ConnectionModel::Model, _password: &str) -> Result<Self> {
        let db_path = if connection.database.is_empty() {
            ":memory:"
        } else {
            &connection.database
        };

        tracing::info!(
            "[SQLiteConnection] Creating new connection pool to {}",
            db_path
        );

        let options = SqliteConnectOptions::from_str(db_path)?
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .connect_with(options)
            .await
            .context("Failed to create SQLite connection pool")?;

        tracing::info!("[SQLiteConnection] Connection pool created successfully");
        Ok(Self { pool })
    }

    pub async fn new_for_test(connection: &ConnectionModel::Model, _password: &str) -> Result<Self> {
        Self::new(connection, _password).await
    }
}
