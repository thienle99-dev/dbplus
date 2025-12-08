use crate::services::db_driver::QueryResult;
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use sqlx::{sqlite::SqlitePool, Row};
use serde_json::Value;

pub struct SQLiteQuery {
    pool: SqlitePool,
}

impl SQLiteQuery {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ConnectionDriver for SQLiteQuery {
    async fn test_connection(&self) -> Result<()> {
        sqlx::query("SELECT 1")
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[async_trait]
impl QueryDriver for SQLiteQuery {
    async fn execute(&self, query: &str) -> Result<u64> {
        let result = sqlx::query(query)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected())
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let query_result = sqlx::query(query)
            .fetch_all(&self.pool)
            .await?;

        if query_result.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
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
            })
        }
    }
}
