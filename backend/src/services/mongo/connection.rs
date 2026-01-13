use crate::models::entities::connection as ConnectionModel;
use crate::services::driver::ConnectionDriver;
use anyhow::Result;
use async_trait::async_trait;
use mongodb::options::{ClientOptions, Compressor, ServerApi, ServerApiVersion};
use mongodb::Client;
use std::time::Duration;

pub struct MongoDriver {
    pub client: Client,
    pub database_name: Option<String>,
}

impl MongoDriver {
    pub async fn new(connection: &ConnectionModel::Model, _password: &str) -> Result<Self> {
        // Mongo connection string format if not provided: mongodb://[user:pass@]host:port/db
        // Actually the password should be used in the URI if not already there,
        // or we can build the options manually.

        // For now, assume host is the connection string or just host:port
        let mut uri = if connection.host.contains("://") {
            connection.host.clone()
        } else {
            let port = if connection.port > 0 {
                format!(":{}", connection.port)
            } else {
                ":27017".to_string()
            };
            format!("mongodb://{}{}", connection.host, port)
        };

        // If username is provided, we need to inject it and the password
        if !connection.username.is_empty() {
            if let Some(pos) = uri.find("://") {
                let (schem, rest) = uri.split_at(pos + 3);
                uri = format!("{}{}:{}@{}", schem, connection.username, _password, rest);
            }
        }

        let mut client_options = ClientOptions::parse(&uri).await?;

        // 🔥 OPTIMIZED: Connection pool configuration
        client_options.min_pool_size = Some(3); // Keep 3 connections warm
        client_options.max_pool_size = Some(20); // Max 20 concurrent connections
        client_options.max_idle_time = Some(Duration::from_secs(300)); // Close idle after 5min

        // 🔥 OPTIMIZED: Timeouts
        client_options.connect_timeout = Some(Duration::from_secs(5));
        client_options.server_selection_timeout = Some(Duration::from_secs(5));
        // client_options.socket_timeout = Some(Duration::from_secs(30)); // Field is private

        // 🔥 OPTIMIZED: Compression
        // 🔥 OPTIMIZED: Compression
        client_options.compressors = Some(vec![
            Compressor::Snappy,
            Compressor::Zlib { level: Some(6) },
            Compressor::Zstd { level: Some(3) },
        ]);

        // Server API version for stable API
        let server_api = ServerApi::builder().version(ServerApiVersion::V1).build();
        client_options.server_api = Some(server_api);

        let client = Client::with_options(client_options)?;

        tracing::info!("[MongoConnection] Optimized pool: min=3, max=20, compression enabled");

        Ok(Self {
            client,
            database_name: if connection.database.is_empty() {
                None
            } else {
                Some(connection.database.clone())
            },
        })
    }
}

#[async_trait]
impl ConnectionDriver for MongoDriver {
    async fn test_connection(&self) -> Result<()> {
        // Ping the database
        self.client
            .database("admin")
            .run_command(mongodb::bson::doc! {"ping": 1})
            .await?;
        Ok(())
    }
}

#[async_trait]
impl crate::services::driver::SessionOperations for MongoDriver {
    async fn get_active_sessions(&self) -> Result<Vec<crate::services::db_driver::SessionInfo>> {
        // MongoDB doesn't have a direct equivalent to PG sessions in the same way,
        // but we could use `currentOp` in the future.
        Ok(vec![])
    }
    async fn kill_session(&self, _pid: i32) -> Result<()> {
        Err(anyhow::anyhow!(
            "Session management not supported for MongoDB yet"
        ))
    }
}
