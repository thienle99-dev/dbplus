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
        // Couchbase connection string format: couchbase://host (port is not supported in URL)
        // The SDK will use default ports (8091 for HTTP, 11210 for memcached)
        let connection_string = format!("couchbase://{}", connection.host);
        let username = &connection.username;

        let authenticator = PasswordAuthenticator::new(username, password);
        let mut options = ClusterOptions::new(authenticator.into());

        // 🔥 OPTIMIZED: Configure timeouts
        options = options
            .kv_timeout(std::time::Duration::from_secs(5))
            .query_timeout(std::time::Duration::from_secs(10))
            .analytics_timeout(std::time::Duration::from_secs(30))
            .search_timeout(std::time::Duration::from_secs(10));

        // Timeout configuration could be added here from connection options if available

        let cluster = Cluster::connect(&connection_string, options)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to connect to Couchbase: {}", e))?;

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
        self.cluster
            .ping(None)
            .await
            .map_err(|e| anyhow::anyhow!("Ping failed: {}", e))?;
        Ok(())
    }
}

#[async_trait]
impl crate::services::driver::SessionOperations for CouchbaseDriver {
    async fn get_active_sessions(&self) -> Result<Vec<crate::services::db_driver::SessionInfo>> {
        Ok(vec![])
    }
    async fn kill_session(&self, _pid: i32) -> Result<()> {
        Err(anyhow::anyhow!(
            "Session management not supported for Couchbase yet"
        ))
    }
}
