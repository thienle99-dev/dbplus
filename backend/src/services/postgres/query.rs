use crate::services::db_driver::QueryResult;
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;
use serde_json::Value;

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
            for (i, _) in columns.iter().enumerate() {
                let value: Value = if let Ok(v) = row.try_get::<_, i32>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<_, String>(i) {
                    Value::String(v)
                } else if let Ok(v) = row.try_get::<_, bool>(i) {
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
                for (i, _) in columns.iter().enumerate() {
                    let value: Value = if let Ok(v) = row.try_get::<_, i32>(i) {
                        Value::Number(v.into())
                    } else if let Ok(v) = row.try_get::<_, String>(i) {
                        Value::String(v)
                    } else if let Ok(v) = row.try_get::<_, bool>(i) {
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
