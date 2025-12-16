use crate::services::db_driver::QueryResult;
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use bytes::Bytes;
use futures_util::StreamExt;
use serde_json::Value;
use sqlx::Column;
use sqlx::{sqlite::SqlitePool, Row};
use tokio::sync::mpsc;

pub struct SQLiteQuery {
    pool: SqlitePool,
}

impl SQLiteQuery {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn stream_ndjson(
        &self,
        query: &str,
        limit: Option<i64>,
        offset: Option<i64>,
        include_total_count: bool,
        tx: mpsc::Sender<Bytes>,
    ) -> Result<()> {
        fn is_select_like(sql: &str) -> bool {
            let trimmed = sql.trim_start();
            let upper = trimmed.to_uppercase();
            upper.starts_with("SELECT") || upper.starts_with("WITH")
        }

        async fn send_line(tx: &mpsc::Sender<Bytes>, value: serde_json::Value) -> bool {
            let mut buf = serde_json::to_vec(&value).unwrap_or_else(|_| {
                b"{\"type\":\"error\",\"message\":\"serialization failed\"}".to_vec()
            });
            buf.push(b'\n');
            tx.send(Bytes::from(buf)).await.is_ok()
        }

        let trimmed = query.trim();
        let is_select = is_select_like(trimmed);
        if !is_select {
            let result = sqlx::query(trimmed).execute(&self.pool).await?;
            let _ = send_line(
                &tx,
                serde_json::json!({ "type": "done", "affected_rows": result.rows_affected() }),
            )
            .await;
            return Ok(());
        }

        let base = trimmed.trim_end_matches(';').to_string();
        let (sql_to_run, meta_limit, meta_offset, total_count) =
            if limit.is_some() || offset.is_some() || include_total_count {
                let meta_limit = limit.unwrap_or(1000).max(1);
                let meta_offset = offset.unwrap_or(0).max(0);
                let page_sql = format!(
                    "SELECT * FROM ({}) AS __dbplus_subq LIMIT {} OFFSET {}",
                    base, meta_limit, meta_offset
                );

                let total_count = if include_total_count {
                    let count_sql =
                        format!("SELECT COUNT(*) AS count FROM ({}) AS __dbplus_subq", base);
                    let row = sqlx::query(&count_sql).fetch_one(&self.pool).await?;
                    row.try_get::<i64, _>(0).ok()
                } else {
                    None
                };

                (page_sql, Some(meta_limit), Some(meta_offset), total_count)
            } else {
                (base, None, None, None)
            };

        let mut stream = sqlx::query(&sql_to_run).fetch(&self.pool);
        let first = match stream.next().await {
            None => {
                let _ = send_line(&tx, serde_json::json!({ "type": "meta", "columns": [] })).await;
                let _ = send_line(&tx, serde_json::json!({ "type": "done", "row_count": 0 })).await;
                return Ok(());
            }
            Some(Err(e)) => return Err(e.into()),
            Some(Ok(row)) => row,
        };

        let column_count = first.len();
        let columns: Vec<String> = first
            .columns()
            .iter()
            .enumerate()
            .map(|(i, c)| {
                let name = c.name();
                if name.is_empty() {
                    format!("column_{}", i)
                } else {
                    name.to_string()
                }
            })
            .collect();

        let _ = send_line(
            &tx,
            serde_json::json!({
                "type": "meta",
                "columns": columns,
                "total_count": total_count,
                "limit": meta_limit,
                "offset": meta_offset,
            }),
        )
        .await;

        async fn emit_row(
            tx: &mpsc::Sender<Bytes>,
            column_count: usize,
            row: sqlx::sqlite::SqliteRow,
        ) -> bool {
            let mut out = Vec::with_capacity(column_count);
            for i in 0..column_count {
                let value: Value = if let Ok(Some(v)) = row.try_get::<Option<i64>, _>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<Option<f64>, _>(i) {
                    serde_json::Number::from_f64(v)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
                } else if let Ok(Some(v)) = row.try_get::<Option<String>, _>(i) {
                    Value::String(v)
                } else if let Ok(Some(v)) = row.try_get::<Option<bool>, _>(i) {
                    Value::Bool(v)
                } else {
                    Value::Null
                };
                out.push(value);
            }
            send_line(tx, serde_json::json!({ "type": "row", "row": out })).await
        }

        let mut row_count: u64 = 0;
        if !emit_row(&tx, column_count, first).await {
            return Ok(());
        }
        row_count += 1;

        while let Some(item) = stream.next().await {
            let row = match item {
                Ok(r) => r,
                Err(e) => {
                    let _ = send_line(&tx, serde_json::json!({ "type": "error", "message": e.to_string() })).await;
                    break;
                }
            };
            if !emit_row(&tx, column_count, row).await {
                break;
            }
            row_count += 1;
        }

        let _ = send_line(&tx, serde_json::json!({ "type": "done", "row_count": row_count })).await;
        Ok(())
    }
}

#[async_trait]
impl ConnectionDriver for SQLiteQuery {
    async fn test_connection(&self) -> Result<()> {
        sqlx::query("SELECT 1").execute(&self.pool).await?;
        Ok(())
    }
}

#[async_trait]
impl QueryDriver for SQLiteQuery {
    async fn execute(&self, query: &str) -> Result<u64> {
        let result = sqlx::query(query).execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let query_result = sqlx::query(query).fetch_all(&self.pool).await?;

        if query_result.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            });
        }

        let first_row = &query_result[0];
        let column_count = first_row.len();
        let mut columns = Vec::new();

        for i in 0..column_count {
            columns.push(format!("column_{}", i));
        }

        let mut result_rows = Vec::new();
        for row in query_result {
            let mut current_row = Vec::new();
            for i in 0..column_count {
                let value: Value = if let Ok(v) = row.try_get::<i32, _>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<i64, _>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<f64, _>(i) {
                    serde_json::Number::from_f64(v)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
                } else if let Ok(v) = row.try_get::<String, _>(i) {
                    Value::String(v)
                } else if let Ok(v) = row.try_get::<bool, _>(i) {
                    Value::Bool(v)
                } else {
                    Value::Null
                };
                current_row.push(value);
            }
            result_rows.push(current_row);
        }

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
            column_metadata: None,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
        })
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        let query_upper = query.trim_start().to_uppercase();
        let is_select = query_upper.starts_with("SELECT") || query_upper.starts_with("WITH");

        if is_select {
            self.query(query).await
        } else {
            let affected = self.execute(query).await?;
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            })
        }
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        let statements = crate::utils::sql_script::split_sql_statements(script);
        if statements.is_empty() {
            return Ok(0);
        }

        let mut tx = self.pool.begin().await?;
        let mut count = 0u64;
        for stmt in statements {
            let trimmed = stmt.trim();
            if trimmed.is_empty() {
                continue;
            }
            sqlx::query(trimmed).execute(&mut *tx).await?;
            count += 1;
        }
        tx.commit().await?;
        Ok(count)
    }

    async fn explain(&self, query: &str, _analyze: bool) -> Result<Value> {
        let explain_query = format!("EXPLAIN QUERY PLAN {}", query);
        let result = self.query(&explain_query).await?;

        let mut plan = Vec::new();
        for row in result.rows {
            let mut node = serde_json::Map::new();
            for (i, col) in result.columns.iter().enumerate() {
                if let Some(val) = row.get(i) {
                    node.insert(col.clone(), val.clone());
                }
            }
            plan.push(Value::Object(node));
        }

        Ok(Value::Array(plan))
    }
}



