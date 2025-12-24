use crate::models::entities::connection as ConnectionModel;
use crate::services::driver::ConnectionDriver;
use anyhow::Result;
use async_trait::async_trait;
use mongodb::{options::ClientOptions, Client};

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

        let client_options = ClientOptions::parse(&uri).await?;
        let client = Client::with_options(client_options)?;

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
