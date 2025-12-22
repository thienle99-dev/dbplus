use super::connection::CouchbaseDriver;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
impl DatabaseManagementDriver for CouchbaseDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        let _mgr = self.cluster.buckets();
        // TODO: Implement using BucketSettings when API is confirmed
        Err(anyhow::anyhow!("Bucket creation for Couchbase is not yet fully implemented in this version of the SDK. Please use the Couchbase Web Console."))
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        mgr.drop_bucket(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop bucket '{}': {}", name, e))?;
        Ok(())
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.create_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create scope '{}': {}", name, e))?;
        Ok(())
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.drop_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop scope '{}': {}", name, e))?;
        Ok(())
    }
}
