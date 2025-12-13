use crate::services::db_driver::{ColumnMetadata, QueryResult};
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use deadpool_postgres::Pool;
use rust_decimal::Decimal;
use serde_json::Value;
use std::collections::HashMap;
use std::net::IpAddr;
use uuid::Uuid;

pub struct PostgresQuery {
    pool: Pool,
}

impl PostgresQuery {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    async fn resolve_metadata(
        client: &deadpool_postgres::Client,
        columns: &[tokio_postgres::Column],
    ) -> Result<Option<Vec<ColumnMetadata>>> {
        let mut table_oids: Vec<u32> = columns.iter().filter_map(|c| c.table_oid()).collect();

        if table_oids.is_empty() {
            return Ok(None);
        }

        table_oids.sort();
        table_oids.dedup();

        let metadata_query = "
            SELECT 
                c.oid, 
                n.nspname, 
                c.relname,
                ARRAY(
                    SELECT a.attname 
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = c.oid AND i.indisprimary
                ) as pk_cols
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.oid = ANY($1)
        ";

        let rows = client.query(metadata_query, &[&table_oids]).await?;

        let mut lookup = std::collections::HashMap::new();
        for row in rows {
            let oid: u32 = row.get("oid");
            let schema: String = row.get("nspname");
            let table: String = row.get("relname");
            let pk_cols: Vec<String> = row.get("pk_cols");
            lookup.insert(oid, (schema, table, pk_cols));
        }

        let mut metadata = Vec::new();
        for col in columns {
            if let Some(oid) = col.table_oid() {
                if let Some((schema, table, pks)) = lookup.get(&oid) {
                    let col_name = col.name().to_string();
                    let is_primary_key = pks.contains(&col_name);

                    metadata.push(ColumnMetadata {
                        table_name: Some(table.clone()),
                        column_name: col_name,
                        is_primary_key,
                        is_editable: true, // Generally valid if we have table info, refinement possible later
                        schema_name: Some(schema.clone()),
                    });
                    continue;
                }
            }

            // Fallback for expression columns or failed lookup
            metadata.push(ColumnMetadata {
                table_name: None,
                column_name: col.name().to_string(),
                is_primary_key: false,
                is_editable: false,
                schema_name: None,
            });
        }

        Ok(Some(metadata))
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
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        let mut result_rows = Vec::new();
        for row in &rows {
            let mut current_row = Vec::new();
            for (i, col) in columns.iter().enumerate() {
                let col_type = row.columns()[i].type_();

                tracing::info!(
                    "Processing column '{}' (index {}) with PostgreSQL type: '{}'",
                    col,
                    i,
                    col_type.name()
                );

                // Handle NUMERIC/DECIMAL types FIRST (before any other type checks)
                // This is critical because NUMERIC can't be parsed as String or i64 directly
                let value: Value = if col_type.name() == "numeric" || col_type.name() == "decimal" {
                    match row.try_get::<_, Option<Decimal>>(i) {
                        Ok(Some(v)) => {
                            tracing::info!("Column '{}' parsed as Decimal: {}", col, v);
                            Value::String(v.to_string())
                        }
                        Ok(None) => {
                            tracing::info!("Column '{}' is NULL (numeric)", col);
                            Value::Null
                        }
                        Err(e) => {
                            tracing::warn!("Column '{}' failed Decimal parse: {}", col, e);
                            Value::Null
                        }
                    }
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i64>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i32>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<i16>>(i) {
                    Value::Number(v.into())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Decimal>>(i) {
                    // Handle other NUMERIC/DECIMAL/MONEY types
                    tracing::info!("Column '{}' parsed as Decimal: {}", col, v);
                    Value::String(v.to_string())
                } else if col_type.name() == "numeric" || col_type.name() == "decimal" {
                    // Workaround: If Decimal fails but type is numeric, try reading as string
                    if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                        tracing::info!(
                            "Column '{}' (type: {}) read as string: {}",
                            col,
                            col_type.name(),
                            v
                        );
                        Value::String(v)
                    } else {
                        tracing::warn!(
                            "Column '{}' is numeric type but failed to read as string",
                            col
                        );
                        Value::Null
                    }
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
                } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveTime>>(i) {
                    // Handle TIME type
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Utc>>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Local>>>(i) {
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<IpAddr>>(i) {
                    // Handle INET/CIDR types
                    Value::String(v.to_string())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<u8>>>(i) {
                    // Handle BYTEA - encode as base64 for JSON compatibility
                    Value::String(base64::Engine::encode(
                        &base64::engine::general_purpose::STANDARD,
                        &v,
                    ))
                } else if let Ok(Some(v)) =
                    row.try_get::<_, Option<HashMap<String, Option<String>>>>(i)
                {
                    // Handle HSTORE - convert to JSON object
                    let obj: serde_json::Map<String, Value> = v
                        .into_iter()
                        .map(|(k, v)| (k, v.map(Value::String).unwrap_or(Value::Null)))
                        .collect();
                    Value::Object(obj)
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<String>>>(i) {
                    // Handle TEXT[] arrays
                    Value::Array(v.into_iter().map(Value::String).collect())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i32>>>(i) {
                    // Handle INT[] arrays
                    Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect())
                } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i64>>>(i) {
                    // Handle BIGINT[] arrays
                    Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect())
                } else if let Ok(v) = row.try_get::<_, Value>(i) {
                    // Handle JSONB/JSON types
                    v
                } else if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                    Value::String(v)
                } else if let Ok(Some(v)) = row.try_get::<_, Option<bool>>(i) {
                    Value::Bool(v)
                } else {
                    tracing::warn!(
                        "Column '{}' (index {}) with type '{}' failed all type conversions",
                        col,
                        i,
                        col_type.name()
                    );
                    Value::Null
                };
                current_row.push(value);
            }
            result_rows.push(current_row);
        }

        let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
            .await
            .unwrap_or(None);

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
            column_metadata,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
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
                    column_metadata: None,
                    total_count: None,
                    limit: None,
                    offset: None,
                    has_more: None,
                });
            }

            let columns: Vec<String> = rows[0]
                .columns()
                .iter()
                .map(|c| c.name().to_string())
                .collect();

            let mut result_rows = Vec::new();
            for row in &rows {
                let mut current_row = Vec::new();
                for (i, col) in columns.iter().enumerate() {
                    let col_type = row.columns()[i].type_();

                    tracing::info!("[execute_query] Processing column '{}' (index {}) with PostgreSQL type: '{}'", col, i, col_type.name());

                    // Handle NUMERIC/DECIMAL types FIRST (before any other type checks)
                    // This is critical because NUMERIC can't be parsed as String or i64 directly
                    let value: Value = if col_type.name() == "numeric"
                        || col_type.name() == "decimal"
                    {
                        match row.try_get::<_, Option<Decimal>>(i) {
                            Ok(Some(v)) => {
                                tracing::info!(
                                    "[execute_query] Column '{}' parsed as Decimal: {}",
                                    col,
                                    v
                                );
                                Value::String(v.to_string())
                            }
                            Ok(None) => {
                                tracing::info!(
                                    "[execute_query] Column '{}' is NULL (numeric)",
                                    col
                                );
                                Value::Null
                            }
                            Err(e) => {
                                tracing::warn!(
                                    "[execute_query] Column '{}' failed Decimal parse: {}",
                                    col,
                                    e
                                );
                                Value::Null
                            }
                        }
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i64>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i32>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<i16>>(i) {
                        Value::Number(v.into())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Decimal>>(i) {
                        // Handle other NUMERIC/DECIMAL/MONEY types
                        tracing::info!("[execute_query] Column '{}' parsed as Decimal: {}", col, v);
                        Value::String(v.to_string())
                    } else if col_type.name() == "numeric" || col_type.name() == "decimal" {
                        // Workaround: If Decimal fails but type is numeric, try reading as string
                        if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                            tracing::info!(
                                "[execute_query] Column '{}' (type: {}) read as string: {}",
                                col,
                                col_type.name(),
                                v
                            );
                            Value::String(v)
                        } else {
                            tracing::warn!("[execute_query] Column '{}' is numeric type but failed to read as string", col);
                            Value::Null
                        }
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
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<NaiveTime>>(i) {
                        // Handle TIME type
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Utc>>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Local>>>(i) {
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<IpAddr>>(i) {
                        // Handle INET/CIDR types
                        Value::String(v.to_string())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<u8>>>(i) {
                        // Handle BYTEA - encode as base64 for JSON compatibility
                        Value::String(base64::Engine::encode(
                            &base64::engine::general_purpose::STANDARD,
                            &v,
                        ))
                    } else if let Ok(Some(v)) =
                        row.try_get::<_, Option<HashMap<String, Option<String>>>>(i)
                    {
                        // Handle HSTORE - convert to JSON object
                        let obj: serde_json::Map<String, Value> = v
                            .into_iter()
                            .map(|(k, v)| (k, v.map(Value::String).unwrap_or(Value::Null)))
                            .collect();
                        Value::Object(obj)
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<String>>>(i) {
                        // Handle TEXT[] arrays
                        Value::Array(v.into_iter().map(Value::String).collect())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i32>>>(i) {
                        // Handle INT[] arrays
                        Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect())
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i64>>>(i) {
                        // Handle BIGINT[] arrays
                        Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect())
                    } else if let Ok(v) = row.try_get::<_, Value>(i) {
                        // Handle JSONB/JSON types
                        v
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<String>>(i) {
                        Value::String(v)
                    } else if let Ok(Some(v)) = row.try_get::<_, Option<bool>>(i) {
                        Value::Bool(v)
                    } else {
                        tracing::warn!("[execute_query] Column '{}' (index {}) with type '{}' failed all type conversions", col, i, col_type.name());
                        Value::Null
                    };
                    current_row.push(value);
                }
                result_rows.push(current_row);
            }

            let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
                .await
                .unwrap_or(None);

            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: 0,
                column_metadata,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            })
        } else {
            let affected = client.execute(&statement, &[]).await?;
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

    async fn explain(&self, query: &str, analyze: bool) -> Result<Value> {
        let client = self.pool.get().await?;
        let explain_query = if analyze {
            // BUFFERS provides IO/cache insight (helps detect seq scan / missing indexes / heavy reads)
            format!("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {}", query)
        } else {
            format!("EXPLAIN (FORMAT JSON) {}", query)
        };
        let rows = client.query(explain_query.as_str(), &[]).await?;

        if !rows.is_empty() {
            let plan_json: Value = rows[0].get(0);
            Ok(plan_json)
        } else {
            Ok(Value::Null)
        }
    }
}
