use super::connection::CouchbaseDriver;
use crate::services::db_driver::{
    ExtensionInfo, SearchResult, TableColumn, TableInfo, TableMetadata,
};
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;

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
        let buckets = mgr
            .get_all_buckets(None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list buckets: {}", e))?;
        Ok(buckets.iter().map(|b| b.name.clone()).collect())
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        let scopes = mgr
            .get_all_scopes(None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list scopes: {}", e))?;
        Ok(scopes.iter().map(|s| s.name().to_string()).collect())
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let bucket = self.cluster.bucket(bucket_name);
        let mgr = bucket.collections();
        let scopes = mgr
            .get_all_scopes(None)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to list collections: {}", e))?;

        let mut tables = Vec::new();
        if let Some(scope) = scopes.iter().find(|s| s.name() == schema) {
            for col in scope.collections() {
                tables.push(TableInfo {
                    schema: schema.to_string(),
                    name: col.name().to_string(),
                    table_type: "COLLECTION".to_string(),
                });
            }
        }
        Ok(tables)
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        let bucket = self.bucket_name.as_deref().unwrap_or("default");
        let query = format!(
            "SELECT * FROM `{}`.`{}`.`{}` LIMIT 1",
            bucket, schema, table
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
                default_value: None,
            });
            columns.push(TableColumn {
                name: "value".to_string(),
                data_type: "JSON".to_string(),
                is_nullable: true,
                is_primary_key: false,
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
