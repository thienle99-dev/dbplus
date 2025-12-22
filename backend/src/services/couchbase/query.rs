use crate::services::db_driver::QueryResult;
use crate::services::driver::QueryDriver;
use anyhow::Result;
use async_trait::async_trait;
use futures_util::stream::TryStreamExt;
use serde_json::Value;

use super::connection::CouchbaseDriver;

fn split_query(query: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current_stmt = String::new();
    let mut in_single_quote = false;
    let mut in_double_quote = false;
    let mut in_backtick = false;
    let mut chars = query.chars().peekable();

    while let Some(c) = chars.next() {
        match c {
            '\'' if !in_double_quote && !in_backtick => in_single_quote = !in_single_quote,
            '"' if !in_single_quote && !in_backtick => in_double_quote = !in_double_quote,
            '`' if !in_single_quote && !in_double_quote => in_backtick = !in_backtick,
            ';' if !in_single_quote && !in_double_quote && !in_backtick => {
                let stmt = current_stmt.trim();
                if !stmt.is_empty() {
                    statements.push(stmt.to_string());
                }
                current_stmt.clear();
                continue;
            }
            _ => {}
        }
        current_stmt.push(c);
    }

    let stmt = current_stmt.trim();
    if !stmt.is_empty() {
        statements.push(stmt.to_string());
    }
    statements
}

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
        let statements = split_query(query);
        if statements.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
                row_metadata: None,
            });
        }

        // Execute all but the last statement
        for stmt in &statements[..statements.len() - 1] {
            self.execute(stmt).await?;
        }

        // Execute the last statement and return its result
        let last_stmt = &statements[statements.len() - 1];

        let mut result = self
            .cluster
            .query(last_stmt, None)
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
        let mut row_metadata = Vec::new();

        for row in rows {
            if let Some(obj) = row.as_object() {
                // Extract metadata fields
                let mut meta = std::collections::HashMap::new();
                if let Some(v) = obj.get("_cas") {
                    meta.insert("_cas".to_string(), v.clone());
                }
                if let Some(v) = obj.get("_id") {
                    meta.insert("_id".to_string(), v.clone());
                }
                if let Some(v) = obj.get("_expiry") {
                    meta.insert("_expiry".to_string(), v.clone());
                }
                if let Some(v) = obj.get("_flags") {
                    meta.insert("_flags".to_string(), v.clone());
                }
                row_metadata.push(meta);

                let mut row_values = Vec::new();
                for col in &columns {
                    row_values.push(obj.get(col).cloned().unwrap_or(Value::Null));
                }
                grid_rows.push(row_values);
            } else {
                row_metadata.push(std::collections::HashMap::new());
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
            row_metadata: Some(
                row_metadata
                    .into_iter()
                    .map(|m| serde_json::to_value(m).unwrap_or(Value::Null))
                    .collect(),
            ),
        })
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        let statements = split_query(script);
        let mut total_affected = 0;
        for stmt in statements {
            total_affected += self.execute(&stmt).await?;
        }
        Ok(total_affected)
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
