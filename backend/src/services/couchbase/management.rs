use super::connection::CouchbaseDriver;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
impl DatabaseManagementDriver for CouchbaseDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        // Minimal default settings for a bucket: 100MB RAM, Couchbase type
        // Note: The specific API for BucketSettings in the Rust SDK beta
        // might require using a builder or struct. Trying a common pattern:
        use couchbase::management::buckets::bucket_settings::BucketSettings;

        let settings = BucketSettings::new(name.to_string()).ram_quota_mb(100);

        mgr.create_bucket(settings, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to create bucket '{}': {}", name, e))
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let mgr = self.cluster.buckets();
        mgr.drop_bucket(name, None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to drop bucket '{}': {}", name, e))
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        let (bucket_name, scope_name) = if let Some((b, s)) = name.split_once('.') {
            (b.to_string(), s.to_string())
        } else {
            let b = self.bucket_name.as_deref().ok_or_else(|| {
                anyhow::anyhow!(
                    "No bucket selected. Please specify, e.g., 'bucket_name.scope_name'"
                )
            })?;
            (b.to_string(), name.to_string())
        };

        let bucket = self.cluster.bucket(&bucket_name);
        let mgr = bucket.collections();
        mgr.create_scope(&scope_name, None).await.map_err(|e| {
            anyhow::anyhow!(
                "Failed to create scope '{}.{}': {}",
                bucket_name,
                scope_name,
                e
            )
        })
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
