use crate::services::db_driver::{ColumnMetadata, QueryResult};
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

        let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
            .await
            .unwrap_or(None);

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
            column_metadata,
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

            let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
                .await
                .unwrap_or(None);

            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: 0,
                column_metadata,
            })
        } else {
            let affected = client.execute(&statement, &[]).await?;
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
                column_metadata: None,
            })
        }
    }
}
