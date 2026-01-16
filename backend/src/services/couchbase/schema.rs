use super::connection::CouchbaseDriver;
use crate::services::db_driver::{
    ExtensionInfo, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;
use tokio::time::{timeout, Duration};

#[async_trait]
impl SchemaIntrospection for CouchbaseDriver {
    async fn get_schema_foreign_keys(
        &self,
        _schema: &str,
    ) -> Result<Vec<crate::services::db_driver::SchemaForeignKey>> {
        Ok(vec![])
    }

    async fn get_databases(&self) -> Result<Vec<String>> {
        // Requires management permission
        let mgr = self.cluster.buckets();
        let buckets = timeout(Duration::from_secs(10), mgr.get_all_buckets(None))
            .await
            .map_err(|_| anyhow::anyhow!("Timeout listing databases (buckets)"))?
            .map_err(|e| anyhow::anyhow!("Failed to list databases: {}", e))?;
        Ok(buckets.iter().map(|b| b.name.clone()).collect())
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        tracing::info!("Couchbase: Listing schemas (scopes/buckets)...");
        if let Some(bucket_name) = &self.bucket_name {
            tracing::info!("Couchbase: Listing scopes for bucket: {}", bucket_name);
            let bucket = self.cluster.bucket(bucket_name);
            let mgr = bucket.collections();
            let scopes = timeout(Duration::from_secs(10), mgr.get_all_scopes(None))
                .await
                .map_err(|_| anyhow::anyhow!("Timeout listing scopes"))?
                .map_err(|e| anyhow::anyhow!("Failed to list scopes: {}", e))?;

            let names: Vec<String> = scopes.iter().map(|s| s.name().to_string()).collect();
            tracing::info!("Couchbase: Found {} scopes", names.len());
            Ok(names)
        } else {
            // If no bucket selected, list all scopes in all buckets as "bucket.scope"
            tracing::info!("Couchbase: No bucket selected, listing all scopes in all buckets");
            let mgr = self.cluster.buckets();
            let buckets = timeout(Duration::from_secs(10), mgr.get_all_buckets(None))
                .await
                .map_err(|_| anyhow::anyhow!("Timeout listing buckets"))?
                .map_err(|e| anyhow::anyhow!("Failed to list buckets: {}", e))?;

            let mut all_scopes = Vec::new();
            for b in buckets {
                let bucket = self.cluster.bucket(&b.name);
                let scopes_res = timeout(
                    Duration::from_secs(5),
                    bucket.collections().get_all_scopes(None),
                )
                .await;
                if let Ok(Ok(scopes)) = scopes_res {
                    for s in scopes {
                        all_scopes.push(format!("{}.{}", b.name, s.name()));
                    }
                } else {
                    // Fallback to bucket._default if scope listing fails or times out
                    all_scopes.push(format!("{}.{}", b.name, "_default"));
                }
            }

            tracing::info!("Couchbase: Found {} combined scopes", all_scopes.len());
            Ok(all_scopes)
        }
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        tracing::info!(
            "Couchbase: Listing tables (collections) for schema: {}",
            schema
        );
        let (bucket_name, scope_name) = self.resolve_scope(schema);

        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();

        // We need to check if the bucket exists and get its scopes
        let scopes = timeout(Duration::from_secs(10), mgr.get_all_scopes(None))
            .await
            .map_err(|_| anyhow::anyhow!("Timeout listing collections"))?
            .map_err(|e| {
                anyhow::anyhow!("Failed to list scopes for bucket {}: {}", bucket_name, e)
            })?;

        let mut tables = Vec::new();
        if let Some(scope) = scopes.iter().find(|s| s.name() == scope_name) {
            for col in scope.collections() {
                tables.push(TableInfo {
                    schema: schema.to_string(), // Keep original schema arg references
                    name: col.name().to_string(),
                    table_type: "COLLECTION".to_string(),
                });
            }
        }
        tracing::info!(
            "Couchbase: Found {} collections in {}/{}",
            tables.len(),
            bucket_name,
            scope_name
        );
        Ok(tables)
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        let (bucket_name, scope_name) = self.resolve_scope(schema);

        let query = format!(
            "SELECT * FROM `{}`.`{}`.`{}` LIMIT 1",
            bucket_name, scope_name, table
        );

        let driver_query =
            crate::services::driver::QueryDriver::execute_query(self, &query).await?;

        let mut columns = Vec::new();
        // The query results will include columns inferred from the row
        for col_name in driver_query.columns {
            columns.push(TableColumn {
                name: col_name.clone(),
                data_type: "JSON".to_string(), // Generic type for now
                is_nullable: true,
                is_primary_key: col_name == "id" || col_name == "_id",
                is_foreign_key: false,
                default_value: None,
            });
        }

        if columns.is_empty() {
            // Fallback for empty collections
            columns.push(TableColumn {
                name: "_id".to_string(),
                data_type: "STRING".to_string(),
                is_nullable: false,
                is_primary_key: true,
                is_foreign_key: false,
                default_value: None,
            });
            columns.push(TableColumn {
                name: "value".to_string(),
                data_type: "JSON".to_string(),
                is_nullable: true,
                is_primary_key: false,
                is_foreign_key: false,
                default_value: None,
            });
        }

        Ok(columns)
    }

    async fn get_schema_metadata(&self, _schema: &str) -> Result<Vec<TableMetadata>> {
        Ok(vec![])
    }

    async fn get_extensions(&self) -> Result<Vec<ExtensionInfo>> {
        Ok(vec![])
    }

    async fn search_objects(&self, _query: &str) -> Result<Vec<SearchResult>> {
        // Simple search in buckets/scopes/collections
        // Note: Full hierarchy search is expensive, maybe just match bucket names or basic collections if we cache them.
        // For now, this is a placeholder.
        Ok(vec![])
    }
}
