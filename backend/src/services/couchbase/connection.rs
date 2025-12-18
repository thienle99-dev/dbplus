use crate::models::entities::connection as ConnectionModel;
use crate::services::driver::ConnectionDriver;
use anyhow::Result;
use async_trait::async_trait;
use couchbase::authenticator::PasswordAuthenticator;
use couchbase::cluster::Cluster;
use couchbase::options::cluster_options::ClusterOptions;

pub struct CouchbaseDriver {
    pub cluster: Cluster,
    pub bucket_name: Option<String>,
}

impl CouchbaseDriver {
    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        let host = if connection.host.is_empty() {
            "127.0.0.1"
        } else {
            &connection.host
        };
        // Couchbase connection string format:
        // - couchbase://host (default KV port 11210)
        // - host:8091=manager (bootstrap via management port 8091)
        let connection_string = format!("couchbase://{}", host);

        let username = if connection.username.is_empty() {
            "Administrator"
        } else {
            &connection.username
        };

        let authenticator = PasswordAuthenticator::new(username, password);
        let options = ClusterOptions::new(authenticator.into());

        // Timeout configuration could be added here from connection options if available

        let cluster = tokio::time::timeout(
            std::time::Duration::from_secs(10),
            Cluster::connect(&connection_string, options),
        )
        .await
        .map_err(|_| anyhow::anyhow!("Connection timeout to Couchbase at {}", connection_string))?
        .map_err(|e| {
            anyhow::anyhow!(
                "Failed to connect to Couchbase at {}: {}",
                connection_string,
                e
            )
        })?;

        Ok(Self {
            cluster,
            bucket_name: if connection.database.is_empty() {
                None
            } else {
                Some(connection.database.clone())
            },
        })
    }
}

#[async_trait]
impl ConnectionDriver for CouchbaseDriver {
    async fn test_connection(&self) -> Result<()> {
        tokio::time::timeout(std::time::Duration::from_secs(5), self.cluster.ping(None))
            .await
            .map_err(|_| anyhow::anyhow!("Ping timeout"))?
            .map_err(|e| anyhow::anyhow!("Ping failed: {}", e))?;
        Ok(())
    }
}
