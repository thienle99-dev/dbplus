use crate::services::db_driver::{IndexInfo, QueryResult, TableConstraints, TableStatistics};
use crate::services::driver::TableOperations;
use anyhow::Result;
use async_trait::async_trait;
use serde_json::Value;
use sqlx::{sqlite::SqlitePool, Row};

pub struct SQLiteTable {
    pool: SqlitePool,
}

impl SQLiteTable {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TableOperations for SQLiteTable {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult> {
        tracing::info!(
            "[SQLiteTable] get_table_data - schema: {}, table: {}, limit: {}, offset: {}",
            schema,
            table,
            limit,
            offset
        );

        if schema != "main" && !schema.is_empty() {
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

        let query = format!("SELECT * FROM \"{}\" LIMIT ? OFFSET ?", table);

        let rows = sqlx::query(&query)
            .bind(limit)
            .bind(offset)
            .fetch_all(&self.pool)
            .await?;

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

        let query_columns = format!("PRAGMA table_info(\"{}\")", table);
        let column_info = sqlx::query(&query_columns).fetch_all(&self.pool).await?;
        let columns: Vec<String> = column_info
            .iter()
            .map(|row| {
                let name: String = row.get(1);
                name
            })
            .collect();

        let column_count = columns.len();
        let mut result_rows = Vec::new();
        for row in rows {
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

    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints> {
        tracing::info!(
            "[SQLiteTable] get_table_constraints - schema: {}, table: {}",
            schema,
            table
        );

        if schema != "main" && !schema.is_empty() {
            return Ok(TableConstraints {
                foreign_keys: vec![],
                check_constraints: vec![],
                unique_constraints: vec![],
            });
        }

        let mut foreign_keys = Vec::new();
        let fk_query = format!("PRAGMA foreign_key_list(\"{}\")", table);
        let fk_rows = sqlx::query(&fk_query).fetch_all(&self.pool).await?;

        for row in fk_rows {
            let id: i32 = row.get(0);
            let seq: i32 = row.get(1);
            if seq == 0 {
                foreign_keys.push(crate::services::db_driver::ForeignKey {
                    constraint_name: format!("fk_{}_{}", table, id),
                    column_name: row.get::<String, _>(3),
                    foreign_schema: "main".to_string(),
                    foreign_table: row.get::<String, _>(2),
                    foreign_column: row.get::<String, _>(4),
                    update_rule: row.get::<String, _>(5),
                    delete_rule: row.get::<String, _>(6),
                });
            }
        }

        let mut unique_constraints = Vec::new();
        let index_query = format!("PRAGMA index_list(\"{}\")", table);
        let index_rows = sqlx::query(&index_query).fetch_all(&self.pool).await?;

        for row in index_rows {
            let is_unique: i32 = row.get(1);
            if is_unique == 1 {
                let index_name: String = row.get(0);
                let info_query = format!("PRAGMA index_info(\"{}\")", index_name);
                let info_rows = sqlx::query(&info_query).fetch_all(&self.pool).await?;
                let columns: Vec<String> =
                    info_rows.iter().map(|r| r.get::<String, _>(2)).collect();
                if !columns.is_empty() {
                    unique_constraints.push(crate::services::db_driver::UniqueConstraint {
                        constraint_name: index_name,
                        columns,
                    });
                }
            }
        }

        Ok(TableConstraints {
            foreign_keys,
            check_constraints: vec![],
            unique_constraints,
        })
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        tracing::info!(
            "[SQLiteTable] get_table_statistics - schema: {}, table: {}",
            schema,
            table
        );

        if schema != "main" && !schema.is_empty() {
            return Ok(TableStatistics {
                row_count: None,
                table_size: None,
                index_size: None,
                total_size: None,
                created_at: None,
                last_modified: None,
            });
        }

        let count_query = format!("SELECT COUNT(*) FROM \"{}\"", table);
        let count_row = sqlx::query(&count_query).fetch_one(&self.pool).await?;
        let row_count: i64 = count_row.get(0);

        let page_size_query = "PRAGMA page_size";
        let page_size_row = sqlx::query(page_size_query).fetch_one(&self.pool).await?;
        let page_size: i64 = page_size_row.get(0);

        let page_count_query = format!("PRAGMA page_count");
        let page_count_row = sqlx::query(&page_count_query).fetch_one(&self.pool).await?;
        let page_count: i64 = page_count_row.get(0);

        let total_size = Some(page_size * page_count);

        Ok(TableStatistics {
            row_count: Some(row_count),
            table_size: total_size,
            index_size: None,
            total_size,
            created_at: None,
            last_modified: None,
        })
    }

    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>> {
        tracing::info!(
            "[SQLiteTable] get_table_indexes - schema: {}, table: {}",
            schema,
            table
        );

        if schema != "main" && !schema.is_empty() {
            return Ok(vec![]);
        }

        let index_query = format!("PRAGMA index_list(\"{}\")", table);
        let index_rows = sqlx::query(&index_query).fetch_all(&self.pool).await?;

        let mut indexes = Vec::new();
        for row in index_rows {
            let index_name: String = row.get(0);
            let is_unique: i32 = row.get(1);
            let origin: String = row.get(2);
            let is_pk = origin == "pk";

            let info_query = format!("PRAGMA index_info(\"{}\")", index_name);
            let info_rows = sqlx::query(&info_query).fetch_all(&self.pool).await?;
            let columns: Vec<String> = info_rows.iter().map(|r| r.get::<String, _>(2)).collect();

            indexes.push(IndexInfo {
                name: index_name,
                columns,
                is_unique: is_unique == 1,
                is_primary: is_pk,
                algorithm: "btree".to_string(),
                condition: None,
                include: None,
                comment: None,
            });
        }

        tracing::info!(
            "[SQLiteTable] get_table_indexes - found {} indexes",
            indexes.len()
        );

        Ok(indexes)
    }
}
