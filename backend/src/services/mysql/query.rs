use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;
use serde_json::Value;

use super::MySqlDriver;
use crate::services::db_driver::QueryResult;
use crate::services::driver::QueryDriver;

#[async_trait]
impl QueryDriver for MySqlDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        let mut conn = self.pool.get_conn().await?;
        let _ = conn.query_drop(query).await?;
        Ok(conn.affected_rows())
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let mut conn = self.pool.get_conn().await?;
        let result = conn.query_iter(query).await?;

        // Capture columns
        let columns = result
            .columns()
            .as_ref()
            .map(|cols| cols.iter().map(|c| c.name_str().to_string()).collect())
            .unwrap_or_default();

        let rows_raw: Vec<mysql_async::Row> = result.collect().await?;
        let affected_rows = conn.affected_rows();

        let rows: Vec<Vec<Value>> = rows_raw
            .into_iter()
            .map(|row| {
                (0..row.len())
                    .map(|i| {
                        // We use index access.
                        // mysql_async::Row::get returns FromValue.
                        // We want strictly the underlying Value to convert manually.
                        // Actually Row structure allows interacting with columns.
                        // let val: Option<mysql_async::Value> = row.get(i); // This tries to convert to T.
                        // To get raw value, we might use `row.as_ref(i)` if available or `row.get_opt`.

                        // `mysql_async::Row` implements `Index<usize>` returning `Value`.
                        let v = &row[i];
                        mysql_value_to_json(v.clone())
                    })
                    .collect()
            })
            .collect();

        Ok(QueryResult {
            columns,
            rows,
            affected_rows,
            column_metadata: None,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
        })
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        self.query(query).await
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        let mut conn = self.pool.get_conn().await?;
        conn.query_drop(script).await?;
        // Determine number of statements? crude count.
        let count = script.split(';').filter(|s| !s.trim().is_empty()).count() as u64;
        Ok(count)
    }

    async fn explain(&self, query: &str, analyze: bool) -> Result<Value> {
        let prefix = if analyze {
            "EXPLAIN ANALYZE"
        } else {
            "EXPLAIN"
        };
        let explain_sql = format!("{} {}", prefix, query);
        let result = self.query(&explain_sql).await?;
        Ok(serde_json::to_value(result.rows)?)
    }
}

fn mysql_value_to_json(v: mysql_async::Value) -> Value {
    use mysql_async::Value::*;
    match v {
        NULL => Value::Null,
        Bytes(b) => {
            // Strings are often returned as Bytes in MySQL protocol
            if let Ok(s) = String::from_utf8(b.clone()) {
                Value::String(s)
            } else {
                Value::String(String::from_utf8_lossy(&b).to_string())
            }
        }
        Int(i) => Value::Number(i.into()),
        UInt(u) => Value::Number(u.into()),
        Float(f) => serde_json::Number::from_f64(f.into())
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Double(f) => serde_json::Number::from_f64(f)
            .map(Value::Number)
            .unwrap_or(Value::Null),
        Date(y, m, d, h, min, s, us) => Value::String(format!(
            "{:04}-{:02}-{:02}T{:02}:{:02}:{:02}.{:06}",
            y, m, d, h, min, s, us
        )),
        Time(neg, d, h, m, s, us) => {
            let sign = if neg { "-" } else { "" };
            Value::String(format!(
                "{}{:02}d {:02}:{:02}:{:02}.{:06}",
                sign, d, h, m, s, us
            ))
        }
    }
}
