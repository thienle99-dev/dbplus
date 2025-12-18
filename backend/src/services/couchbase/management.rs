use super::connection::CouchbaseDriver;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
impl DatabaseManagementDriver for CouchbaseDriver {
    async fn create_database(&self, _name: &str) -> Result<()> {
        // mgr.create_bucket(...) requires BucketSettings which has many required fields
        // For now, return a placeholder error that's more specific
        Err(anyhow::anyhow!(
            "Couchbase bucket creation via API requires configuration options not yet exposed"
        ))
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        mgr.drop_bucket(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop bucket '{}': {}", name, e))
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self
            .bucket_name
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("No bucket selected"))?;
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.create_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create scope '{}': {}", name, e))
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self
            .bucket_name
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("No bucket selected"))?;
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.drop_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop scope '{}': {}", name, e))
    }
}
