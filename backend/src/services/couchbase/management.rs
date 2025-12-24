use super::connection::CouchbaseDriver;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;

use couchbase::management::buckets::bucket_settings::{BucketSettings, BucketType};

#[async_trait]
impl DatabaseManagementDriver for CouchbaseDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        let settings = BucketSettings::new(name.to_string())
            .ram_quota_mb(100)
            .bucket_type(BucketType::COUCHBASE);

        mgr.create_bucket(settings, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create bucket '{}': {}", name, e))?;
        Ok(())
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        mgr.drop_bucket(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop bucket '{}': {}", name, e))?;
        Ok(())
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self
            .bucket_name
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("No bucket selected. Please select a bucket first."))?;
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.create_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create scope '{}': {}", name, e))?;
        Ok(())
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        let bucket_name = self
            .bucket_name
            .as_deref()
            .ok_or_else(|| anyhow::anyhow!("No bucket selected. Please select a bucket first."))?;
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        mgr.drop_scope(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop scope '{}': {}", name, e))?;
        Ok(())
    }

    async fn install_extension(
        &self,
        _name: &str,
        _schema: Option<&str>,
        _version: Option<&str>,
    ) -> Result<()> {
        Err(anyhow::anyhow!(
            "Couchbase does not support extensions via this API"
        ))
    }

    async fn drop_extension(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "Couchbase does not support extensions via this API"
        ))
    }
}
