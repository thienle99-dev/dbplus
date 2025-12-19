use crate::services::db_driver::{
    IndexInfo, PartitionInfo, QueryResult, StorageBloatInfo, TableComment, TableConstraints,
    TableDependencies, TableGrant, TableStatistics, TriggerInfo,
};
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
        _filter: Option<String>,
        _document_id: Option<String>,
    ) -> Result<QueryResult> {
        tracing::info!(
            "[SQLiteTable] get_table_data - schema: {}, table: {}, limit: {}, offset: {}",
            schema,
            table,
            limit,
            offset
        );

        let schema = normalize_schema(schema);
        let query = format!(
            "SELECT * FROM {}.{} LIMIT ? OFFSET ?",
            quote_ident(&schema),
            quote_ident(table)
        );

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

        let query_columns = format!(
            "PRAGMA {}.table_info({})",
            quote_ident(&schema),
            quote_ident(table)
        );
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

        let schema = normalize_schema(schema);

        let mut foreign_keys = Vec::new();
        let fk_query = format!(
            "PRAGMA {}.foreign_key_list({})",
            quote_ident(&schema),
            quote_ident(table)
        );
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
        let index_query = format!(
            "PRAGMA {}.index_list({})",
            quote_ident(&schema),
            quote_ident(table)
        );
        let index_rows = sqlx::query(&index_query).fetch_all(&self.pool).await?;

        for row in index_rows {
            let is_unique: i32 = row.get(2);
            if is_unique == 1 {
                let index_name: String = row.get(1);
                let info_query = format!(
                    "PRAGMA {}.index_info({})",
                    quote_ident(&schema),
                    quote_ident(&index_name)
                );
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

        let schema = normalize_schema(schema);

        let count_query = format!(
            "SELECT COUNT(*) FROM {}.{}",
            quote_ident(&schema),
            quote_ident(table)
        );
        let count_row = sqlx::query(&count_query).fetch_one(&self.pool).await?;
        let row_count: i64 = count_row.get(0);

        let page_size_query = "PRAGMA page_size";
        let page_size_row = sqlx::query(page_size_query).fetch_one(&self.pool).await?;
        let page_size: i64 = page_size_row.get(0);

        let page_count_query = format!("PRAGMA {}.page_count", quote_ident(&schema));
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

        let schema = normalize_schema(schema);

        let index_query = format!(
            "PRAGMA {}.index_list({})",
            quote_ident(&schema),
            quote_ident(table)
        );
        let index_rows = sqlx::query(&index_query).fetch_all(&self.pool).await?;

        let mut indexes = Vec::new();
        for row in index_rows {
            let index_name: String = row.get(1);
            let is_unique: i32 = row.get(2);
            let origin: String = row.get(3);
            let is_pk = origin == "pk";

            let info_query = format!(
                "PRAGMA {}.index_info({})",
                quote_ident(&schema),
                quote_ident(&index_name)
            );
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

    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>> {
        tracing::info!(
            "[SQLiteTable] get_table_triggers - schema: {}, table: {}",
            schema,
            table
        );

        let schema = normalize_schema(schema);

        let q = format!(
            "SELECT name, sql FROM {}.sqlite_master WHERE type = 'trigger' AND tbl_name = ? ORDER BY name",
            quote_ident(&schema)
        );
        let rows = sqlx::query(&q).bind(table).fetch_all(&self.pool).await?;

        let mut triggers = Vec::new();
        for row in rows {
            let name: String = row.get(0);
            let definition: Option<String> = row.try_get(1).ok();
            let definition = definition.unwrap_or_default();
            let def_upper = definition.to_uppercase();

            let timing = if def_upper.contains("INSTEAD OF") {
                "INSTEAD OF"
            } else if def_upper.contains("BEFORE") {
                "BEFORE"
            } else if def_upper.contains("AFTER") {
                "AFTER"
            } else {
                "UNKNOWN"
            };

            let mut events = Vec::new();
            if def_upper.contains("INSERT") {
                events.push("INSERT".to_string());
            }
            if def_upper.contains("UPDATE") {
                events.push("UPDATE".to_string());
            }
            if def_upper.contains("DELETE") {
                events.push("DELETE".to_string());
            }

            triggers.push(TriggerInfo {
                name,
                timing: timing.to_string(),
                events,
                level: "ROW".to_string(),
                enabled: "enabled".to_string(),
                function_schema: None,
                function_name: None,
                definition,
            });
        }

        Ok(triggers)
    }

    async fn get_table_comment(&self, _schema: &str, _table: &str) -> Result<TableComment> {
        Ok(TableComment { comment: None })
    }

    async fn set_table_comment(
        &self,
        _schema: &str,
        _table: &str,
        _comment: Option<String>,
    ) -> Result<()> {
        Err(anyhow::anyhow!(
            "Table comments are not supported for sqlite"
        ))
    }

    async fn get_table_permissions(&self, _schema: &str, _table: &str) -> Result<Vec<TableGrant>> {
        Err(anyhow::anyhow!("Permissions are not supported for sqlite"))
    }

    async fn list_roles(&self) -> Result<Vec<crate::services::db_driver::RoleInfo>> {
        Err(anyhow::anyhow!("Roles are not supported for sqlite"))
    }

    async fn set_table_permissions(
        &self,
        _schema: &str,
        _table: &str,
        _grantee: &str,
        _privileges: Vec<String>,
        _grant_option: bool,
    ) -> Result<()> {
        Err(anyhow::anyhow!("Permissions are not supported for sqlite"))
    }

    async fn get_table_dependencies(
        &self,
        _schema: &str,
        _table: &str,
    ) -> Result<TableDependencies> {
        Err(anyhow::anyhow!("Dependencies are not supported for sqlite"))
    }

    async fn get_storage_bloat_info(
        &self,
        _schema: &str,
        _table: &str,
    ) -> Result<StorageBloatInfo> {
        Err(anyhow::anyhow!(
            "Storage & bloat info is not supported for sqlite"
        ))
    }

    async fn get_partitions(&self, _schema: &str, _table: &str) -> Result<PartitionInfo> {
        Err(anyhow::anyhow!("Partitions are not supported for sqlite"))
    }
}

fn normalize_schema(schema: &str) -> String {
    let s = schema.trim();
    if s.is_empty() {
        "main".to_string()
    } else {
        s.to_string()
    }
}

fn quote_ident(s: &str) -> String {
    format!("\"{}\"", s.replace('"', "\"\""))
}

#[cfg(test)]
mod tests {
    use super::SQLiteTable;
    use crate::services::driver::TableOperations;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn sqlite_index_list_decoding_matches_sqlite_pragma_shape() {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

        sqlx::query("CREATE TABLE t (id INTEGER PRIMARY KEY, email TEXT)")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("CREATE UNIQUE INDEX idx_t_email ON t(email)")
            .execute(&pool)
            .await
            .unwrap();

        let table = SQLiteTable::new(pool);

        let indexes = table.get_table_indexes("main", "t").await.unwrap();
        assert!(indexes
            .iter()
            .any(|idx| idx.name == "idx_t_email" && idx.is_unique));

        let constraints = table.get_table_constraints("main", "t").await.unwrap();
        assert!(constraints
            .unique_constraints
            .iter()
            .any(|uc| uc.constraint_name == "idx_t_email" && uc.columns == vec!["email"]));
    }
}
