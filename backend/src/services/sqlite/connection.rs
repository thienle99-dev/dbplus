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

        let options = SqliteConnectOptions::from_str(db_path)?.create_if_missing(true);

        let attachments = attachments.to_vec();
        // 🔥 OPTIMIZED: Increased pool size and added timeouts
        let pool = SqlitePoolOptions::new()
            .max_connections(25) // Increased from 10
            .min_connections(3) // Keep 3 connections warm
            .acquire_timeout(std::time::Duration::from_secs(5))
            .idle_timeout(Some(std::time::Duration::from_secs(300))) // Close idle after 5min
            .max_lifetime(Some(std::time::Duration::from_secs(1800))) // Recycle after 30min
            .after_connect(move |conn, _meta| {
                let attachments = attachments.clone();
                Box::pin(async move {
                    // 🔥 OPTIMIZED: Enable WAL mode for better concurrency
                    sqlx::query("PRAGMA journal_mode = WAL;")
                        .execute(&mut *conn)
                        .await?;

                    // 🔥 OPTIMIZED: Increase cache size (default is 2MB, set to 10MB)
                    sqlx::query("PRAGMA cache_size = -10000;")
                        .execute(&mut *conn)
                        .await?;

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

        tracing::info!(
            "[SQLiteConnection] Optimized pool created: max=25, min=3, WAL mode enabled"
        );
        Ok(Self { pool })
    }
}

fn quote_ident(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "\"\""))
}
