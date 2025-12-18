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
        let result = self
            .cluster
            .query(query, None)
            .await
            .map_err(|e| anyhow::anyhow!("Query failed: {}", e))?;

        let meta = result
            .metadata()
            .map_err(|e| anyhow::anyhow!("Failed to get metadata: {}", e))?;
        Ok(meta.metrics.map(|m| m.mutation_count).unwrap_or(0) as u64)
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

        // Check for "nested select *" pattern: all rows have exactly one identical key which is an object
        let mut first_key: Option<String> = None;
        let mut is_nested_select_star = !rows.is_empty();

        for i in 0..sample_size {
            if let Some(obj) = rows[i].as_object() {
                if obj.len() == 1 {
                    let key = obj.keys().next().unwrap().clone();
                    if let Some(ref fk) = first_key {
                        if fk != &key {
                            is_nested_select_star = false;
                        }
                    } else {
                        first_key = Some(key);
                    }
                    if !obj.values().next().unwrap().is_object() {
                        is_nested_select_star = false;
                    }
                } else {
                    is_nested_select_star = false;
                }
            } else {
                is_nested_select_star = false;
            }
            if !is_nested_select_star {
                break;
            }
        }

        let unwrapped_key = if is_nested_select_star {
            first_key
        } else {
            None
        };

        if let Some(ref uk) = unwrapped_key {
            for i in 0..sample_size {
                if let Some(obj) = rows[i].as_object() {
                    if let Some(inner) = obj.get(uk).and_then(|v| v.as_object()) {
                        for key in inner.keys() {
                            column_set.insert(key.clone());
                        }
                    }
                }
            }
        } else {
            for i in 0..sample_size {
                if let Some(obj) = rows[i].as_object() {
                    for key in obj.keys() {
                        column_set.insert(key.clone());
                    }
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
                if let Some(ref uk) = unwrapped_key {
                    if let Some(inner) = obj.get(uk).and_then(|v| v.as_object()) {
                        for col in &columns {
                            row_values.push(inner.get(col).cloned().unwrap_or(Value::Null));
                        }
                    } else {
                        for col in &columns {
                            row_values.push(Value::Null);
                        }
                    }
                } else {
                    for col in &columns {
                        row_values.push(obj.get(col).cloned().unwrap_or(Value::Null));
                    }
                }
                grid_rows.push(row_values);
            } else {
                grid_rows.push(vec![row]);
            }
        }

        let meta_data = result
            .metadata()
            .map_err(|e| anyhow::anyhow!("Failed to get metadata: {}", e))?;
        let affected_rows = meta_data.metrics.map(|m| m.mutation_count).unwrap_or(0) as u64;

        // Try to infer table metadata for editing
        let mut column_metadata = None;
        let query_upper = query.to_uppercase();
        if query_upper.starts_with("SELECT") {
            if let Some(from_pos) = query_upper.find("FROM") {
                let rest = &query[from_pos + 4..].trim();
                if let Some(keyspace) = rest.split_whitespace().next() {
                    let parts: Vec<&str> = keyspace.split('.').collect();
                    let (schema, table) = match parts.len() {
                        3 => (Some(parts[1].trim_matches('`')), parts[2].trim_matches('`')),
                        2 => (Some(parts[0].trim_matches('`')), parts[1].trim_matches('`')),
                        1 => (None, parts[0].trim_matches('`')),
                        _ => (None, ""),
                    };

                    if !table.is_empty() {
                        let mut meta_list = Vec::new();
                        for col in &columns {
                            meta_list.push(crate::services::db_driver::ColumnMetadata {
                                table_name: Some(table.to_string()),
                                column_name: col.clone(),
                                is_primary_key: col == "_id" || col == "id",
                                is_editable: true,
                                schema_name: schema.map(|s| s.to_string()),
                            });
                        }
                        column_metadata = Some(meta_list);
                    }
                }
            }
        }

        Ok(QueryResult {
            columns,
            rows: grid_rows,
            affected_rows,
            column_metadata,
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
