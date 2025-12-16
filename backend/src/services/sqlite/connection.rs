use crate::models::entities::connection as ConnectionModel;
use crate::services::sqlite::SqliteAttachedDatabase;
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
        Self::new_with_attachments(connection, _password, &[]).await
    }

    pub async fn new_with_attachments(
        connection: &ConnectionModel::Model,
        _password: &str,
        attachments: &[SqliteAttachedDatabase],
    ) -> Result<Self> {
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

        let attachments = attachments.to_vec();
        let pool = SqlitePoolOptions::new()
            .max_connections(10)
            .after_connect(move |conn, _meta| {
                let attachments = attachments.clone();
                Box::pin(async move {
                    for a in attachments {
                        let alias = quote_ident(&a.name);
                        let attach_sql = format!("ATTACH DATABASE ? AS {}", alias);
                        let path = if a.read_only
                            && !a.file_path.contains("?mode=")
                            && !a.file_path.starts_with("file:")
                            && !a.file_path.starts_with("sqlite:")
                        {
                            format!("file:{}?mode=ro", a.file_path)
                        } else {
                            a.file_path
                        };
                        sqlx::query(&attach_sql)
                            .bind(path)
                            .execute(&mut *conn)
                            .await?;
                    }
                    Ok(())
                })
            })
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

fn quote_ident(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "\"\""))
}



