use crate::services::db_driver::{TableColumn, TableInfo, TableMetadata};
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;
use sqlx::{sqlite::SqlitePool, Row};

pub struct SQLiteSchema {
    pool: SqlitePool,
}

impl SQLiteSchema {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl SchemaIntrospection for SQLiteSchema {
    async fn get_databases(&self) -> Result<Vec<String>> {
        Ok(vec!["main".to_string()])
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        Ok(vec!["main".to_string()])
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let query = if schema == "main" || schema.is_empty() {
            "SELECT 'main' as schema, name, type FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name"
        } else {
            return Ok(vec![]);
        };

        let rows = sqlx::query(query).fetch_all(&self.pool).await?;

        Ok(rows
            .iter()
            .map(|row| TableInfo {
                schema: row.get::<String, _>(0),
                name: row.get::<String, _>(1),
                table_type: if row.get::<String, _>(2) == "view" {
                    "VIEW".to_string()
                } else {
                    "BASE TABLE".to_string()
                },
            })
            .collect())
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        tracing::info!(
            "[SQLiteSchema] get_columns - schema: {}, table: {}",
            schema,
            table
        );

        if schema != "main" && !schema.is_empty() {
            return Ok(vec![]);
        }

        let query = format!("PRAGMA table_info(\"{}\")", table);
        let rows = sqlx::query(&query).fetch_all(&self.pool).await?;

        let mut pk_columns = std::collections::HashSet::new();
        let pk_query = format!("PRAGMA table_info(\"{}\")", table);
        let pk_rows = sqlx::query(&pk_query).fetch_all(&self.pool).await?;
        for row in pk_rows {
            let pk: i32 = row.get(5);
            if pk > 0 {
                if let Ok(name) = row.try_get::<String, _>(1) {
                    pk_columns.insert(name);
                }
            }
        }

        let columns: Vec<TableColumn> = rows
            .iter()
            .map(|row| {
                let name: String = row.get(1);
                let data_type: String = row.get(2);
                let not_null: i32 = row.get(3);
                let default_value: Option<String> = row.get(4);
                let is_pk = pk_columns.contains(&name);

                TableColumn {
                    name,
                    data_type,
                    is_nullable: not_null == 0,
                    default_value,
                    is_primary_key: is_pk,
                }
            })
            .collect();

        tracing::info!(
            "[SQLiteSchema] get_columns - found {} columns",
            columns.len()
        );

        Ok(columns)
    }

    async fn get_schema_metadata(&self, schema: &str) -> Result<Vec<TableMetadata>> {
        if schema != "main" && !schema.is_empty() {
            return Ok(vec![]);
        }

        let tables_query = "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name";
        let rows = sqlx::query(tables_query).fetch_all(&self.pool).await?;

        let mut result = Vec::new();
        for row in rows {
            let table_name: String = row.get(0);
            let col_query = format!("PRAGMA table_info(\"{}\")", table_name);
            // It's safe to use format! here because table_name comes from sqlite_master
            // But quoting is good practice.
            let col_rows = sqlx::query(&col_query).fetch_all(&self.pool).await?;
            let columns: Vec<String> = col_rows.iter().map(|r| r.get(1)).collect();

            result.push(TableMetadata {
                table_name,
                columns,
            });
        }
        Ok(result)
    }
}
