use crate::services::db_driver::QueryResult;
use crate::services::driver::QueryDriver;
use anyhow::Result;
use async_trait::async_trait;
use futures_util::stream::TryStreamExt;
use serde_json::Value;

use super::connection::CouchbaseDriver;

#[async_trait]
impl QueryDriver for CouchbaseDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        let _result = self
            .cluster
            .query(query, None)
            .await
            .map_err(|e| anyhow::anyhow!("Query failed: {}", e))?;

        // Couchbase SDK might return metrics in metadata
        // For now return 0 or implement metrics parsing if available in the crate
        // let metrics = result.meta_data().metrics();
        // Ok(metrics.mutation_count())
        Ok(0)
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        self.execute_query(query).await
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        let mut result = self
            .cluster
            .query(query, None)
            .await
            .map_err(|e| anyhow::anyhow!("Query failed: {}", e))?;

        let rows: Vec<Value> = result
            .rows::<Value>()
            .try_collect()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to decode rows: {}", e))?;

        // Scan up to 50 rows to infer column names from all keys present
        let mut column_set = std::collections::BTreeSet::new();
        let sample_size = rows.len().min(50);
        for i in 0..sample_size {
            if let Some(obj) = rows[i].as_object() {
                for key in obj.keys() {
                    column_set.insert(key.clone());
                }
            }
        }

        let columns: Vec<String> = if column_set.is_empty() {
            if !rows.is_empty() {
                vec!["value".to_string()]
            } else {
                vec![]
            }
        } else {
            column_set.into_iter().collect()
        };

        let mut grid_rows = Vec::new();
        for row in rows {
            if let Some(obj) = row.as_object() {
                let mut row_values = Vec::new();
                for col in &columns {
                    row_values.push(obj.get(col).cloned().unwrap_or(Value::Null));
                }
                grid_rows.push(row_values);
            } else {
                grid_rows.push(vec![row]);
            }
        }

        Ok(QueryResult {
            columns,
            rows: grid_rows,
            affected_rows: 0,
            column_metadata: None,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
        })
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        // TODO: splitting script
        self.execute(script).await
    }

    async fn explain(&self, query: &str, _analyze: bool) -> Result<serde_json::Value> {
        let explain_stmt = format!("EXPLAIN {}", query);
        let mut result = self
            .cluster
            .query(explain_stmt, None)
            .await
            .map_err(|e| anyhow::anyhow!("Explain failed: {}", e))?;

        let rows: Vec<Value> = result
            .rows::<Value>()
            .try_collect()
            .await
            .map_err(|e| anyhow::anyhow!("Failed to fetch explain rows: {}", e))?;
        Ok(serde_json::json!(rows))
    }
}
