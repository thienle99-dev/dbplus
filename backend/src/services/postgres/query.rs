use crate::services::db_driver::QueryResult;
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, Utc};
use deadpool_postgres::Pool;
use serde_json::Value;
use uuid::Uuid;

pub struct PostgresQuery {
    pool: Pool,
}

impl PostgresQuery {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ConnectionDriver for PostgresQuery {
    async fn test_connection(&self) -> Result<()> {
        let client = self.pool.get().await?;
        client.execute("SELECT 1", &[]).await?;
        Ok(())
    }
}

#[async_trait]
impl QueryDriver for PostgresQuery {
    async fn execute(&self, query: &str) -> Result<u64> {
        let client = self.pool.get().await?;
        let rows_affected = client.execute(query, &[]).await?;
        Ok(rows_affected)
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let client = self.pool.get().await?;
        let rows = client.query(query, &[]).await?;

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        let mut result_rows = Vec::new();
        for row in rows {
            let mut current_row = Vec::new();
            for (i, col) in columns.iter().enumerate() {
                let col_type = row.columns()[i].type_();

                // Check if column is NULL first
                let is_null: bool = row.try_get::<_, Option<String>>(i).ok().flatten().is_none()
                    && row.try_get::<_, Option<i64>>(i).ok().flatten().is_none();

                let value: Value = if is_null {
                    Value::Null
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i64>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i32>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i16>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<f64>>(i) {
                    Value::Number(
                        serde_json::Number::from_f64(v).unwrap_or(serde_json::Number::from(0)),
                    )
                } else if let Ok(Some(v)) = row.try_get::<_, Option<f32>>(i) {
                    Value::Number(
                        serde_json::Number::from_f64(v as f64)
                            .unwrap_or(serde_json::Number::from(0)),
                    )
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Uuid>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDateTime>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDate>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Utc>>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Local>>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(v) = row.try_get::<_, Value>(i) {
                    // Handle JSONB/JSON types
                    v
                } else if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                    Value::String(v)
                } else if let Ok(Some(v)) = row.try_get::<_, Option<bool>>(i) {
                    Value::Bool(v)
                } else {
                    eprintln!("[QUERY DEBUG] Column '{}' (index {}) with type '{}' failed all type conversions", 
                        col, i, col_type.name());
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
        let client = self.pool.get().await?;
        let statement = client.prepare(query).await?;

        let is_select = query.trim_start().to_uppercase().starts_with("SELECT")
            || query.trim_start().to_uppercase().starts_with("WITH");

        if is_select {
            let rows = client.query(&statement, &[]).await?;

            if rows.is_empty() {
                return Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                });
            }

            let columns: Vec<String> = rows[0]
                .columns()
                .iter()
                .map(|c| c.name().to_string())
                .collect();

            let mut result_rows = Vec::new();
            for row in rows {
                let mut current_row = Vec::new();
                for (i, col) in columns.iter().enumerate() {
                    let col_type = row.columns()[i].type_();

                    // Check if column is NULL first
                    let is_null: bool =
                        row.try_get::<_, Option<String>>(i).ok().flatten().is_none()
                            && row.try_get::<_, Option<i64>>(i).ok().flatten().is_none();

                    let value: Value = if is_null {
                        Value::Null
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i64>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i32>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i16>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<f64>>(i) {
                        Value::Number(
                            serde_json::Number::from_f64(v).unwrap_or(serde_json::Number::from(0)),
                        )
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<f32>>(i) {
                        Value::Number(
                            serde_json::Number::from_f64(v as f64)
                                .unwrap_or(serde_json::Number::from(0)),
                        )
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Uuid>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDateTime>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDate>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Utc>>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Local>>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(v) = row.try_get::<_, Value>(i) {
                        // Handle JSONB/JSON types
                        v
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                        Value::String(v)
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<bool>>(i) {
                        Value::Bool(v)
                    } else {
                        eprintln!("[EXECUTE_QUERY DEBUG] Column '{}' (index {}) with type '{}' failed all type conversions", 
                        col, i, col_type.name());
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
        } else {
            let affected = client.execute(&statement, &[]).await?;
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
            })
        }
    }
}
