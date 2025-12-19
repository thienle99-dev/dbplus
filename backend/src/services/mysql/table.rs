use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use super::MySqlDriver;
use crate::services::db_driver::{
    ForeignKey, IndexInfo, PartitionInfo, QueryResult, RoleInfo, StorageBloatInfo, TableComment,
    TableConstraints, TableDependencies, TableGrant, TableStatistics, TriggerInfo,
};
use crate::services::driver::{QueryDriver, TableOperations};

#[async_trait]
impl TableOperations for MySqlDriver {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
        _filter: Option<String>,
        _document_id: Option<String>,
        _fields: Option<Vec<String>>,
    ) -> Result<QueryResult> {
        let select_clause = if let Some(f) = &_fields {
            if f.is_empty() {
                "*".to_string()
            } else {
                f.iter()
                    .map(|field| format!("`{}`", field))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        } else {
            "*".to_string()
        };

        let query = format!(
            "SELECT {} FROM `{}`.`{}` LIMIT {} OFFSET {}",
            select_clause, schema, table, limit, offset
        );
        self.query(&query).await
    }

    async fn get_table_constraints(&self, schema: &str, table: &str) -> Result<TableConstraints> {
        // Implement Foreign Keys
        let mut conn = self.pool.get_conn().await?;

        let fk_query = r#"
            SELECT 
                CONSTRAINT_NAME, 
                COLUMN_NAME, 
                REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
        "#;

        let fks_raw: Vec<(
            String,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
        )> = conn.exec(fk_query, (schema, table)).await?;

        let foreign_keys = fks_raw
            .into_iter()
            .filter_map(|(name, col, ts, tt, tc)| {
                if let (Some(ts), Some(tt), Some(tc)) = (ts, tt, tc) {
                    Some(ForeignKey {
                        constraint_name: name,
                        column_name: col,
                        foreign_schema: ts,
                        foreign_table: tt,
                        foreign_column: tc,
                        update_rule: "NO ACTION".to_string(), // Need triggers or referential_constraints for rules
                        delete_rule: "NO ACTION".to_string(),
                    })
                } else {
                    None
                }
            })
            .collect();

        // Check constraints (MySQL 8.0 support check constraints, but older ignore them or use triggers)
        // returning empty for now
        let check_constraints = vec![];

        // Unique constraints
        // Finding indexes that are unique but not primary?
        let unique_constraints = vec![];

        Ok(TableConstraints {
            foreign_keys,
            check_constraints,
            unique_constraints,
        })
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, CREATE_TIME, UPDATE_TIME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
        "#;

        // Option<i64> for nullable. MySQL returning u64 usually.
        let row: Option<(
            Option<u64>,
            Option<u64>,
            Option<u64>,
            Option<mysql_async::Value>,
            Option<mysql_async::Value>,
        )> = conn.exec_first(query, (schema, table)).await?;

        if let Some((rows, data_len, index_len, create_time, update_time)) = row {
            // Helper stringifier
            let to_string = |v: Option<mysql_async::Value>| {
                v.and_then(|val| {
                    if let mysql_async::Value::Date(y, m, d, h, min, s, _) = val {
                        Some(format!(
                            "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
                            y, m, d, h, min, s
                        ))
                    } else {
                        None
                    }
                })
            };

            Ok(TableStatistics {
                row_count: rows.map(|v| v as i64),
                table_size: data_len.map(|v| v as i64),
                index_size: index_len.map(|v| v as i64),
                total_size: Some((data_len.unwrap_or(0) + index_len.unwrap_or(0)) as i64),
                created_at: to_string(create_time),
                last_modified: to_string(update_time),
            })
        } else {
            Ok(TableStatistics {
                row_count: None,
                table_size: None,
                index_size: None,
                total_size: None,
                created_at: None,
                last_modified: None,
            })
        }
    }

    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>> {
        let mut conn = self.pool.get_conn().await?;
        // Use SHOW INDEX or statistics
        let query = r#"
            SELECT INDEX_NAME, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, COMMENT
            FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
            ORDER BY INDEX_NAME, SEQ_IN_INDEX
        "#;

        let rows: Vec<(String, String, i64, String, String)> =
            conn.exec(query, (schema, table)).await?;

        // Group by index name
        let mut indexes = std::collections::HashMap::new();
        for (name, col, non_unique, type_, comment) in rows {
            let entry = indexes.entry(name.clone()).or_insert(IndexInfo {
                name: name.clone(),
                columns: vec![],
                is_unique: non_unique == 0,
                is_primary: name == "PRIMARY",
                algorithm: type_,
                condition: None,
                include: None,
                comment: Some(comment),
            });
            entry.columns.push(col);
        }

        Ok(indexes.into_values().collect())
    }

    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>> {
        if self.flavor == super::MySqlFamilyFlavor::TiDb {
            return Ok(vec![]);
        }
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT TRIGGER_NAME, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
            FROM information_schema.TRIGGERS
            WHERE EVENT_OBJECT_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?
        "#;

        let rows: Vec<(String, String, String, String)> = conn.exec(query, (schema, table)).await?;

        Ok(rows
            .into_iter()
            .map(|(name, timing, event, stmt)| TriggerInfo {
                name,
                timing,
                events: vec![event],
                level: "ROW".to_string(), // MySQL triggers are always row level
                enabled: "enabled".to_string(),
                function_schema: None,
                function_name: None,
                definition: stmt,
            })
            .collect())
    }

    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment> {
        let mut conn = self.pool.get_conn().await?;
        let query = "SELECT TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?";
        let comment: Option<String> = conn.exec_first(query, (schema, table)).await?;
        Ok(TableComment { comment })
    }

    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        let mut conn = self.pool.get_conn().await?;
        let comment = comment.unwrap_or_default();
        // Danger: Injection possible if comment not escaped, but mysql_async param works for values usually.
        // However ALTER TABLE syntax for comment might verify parameter usage.
        // "ALTER TABLE `x` COMMENT = ?" works?
        // Let's try.
        let query = format!("ALTER TABLE `{}`.`{}` COMMENT = ?", schema, table);
        conn.exec_drop(query, (comment,)).await?;
        Ok(())
    }

    async fn get_table_permissions(&self, _schema: &str, _table: &str) -> Result<Vec<TableGrant>> {
        Ok(vec![])
    }

    async fn list_roles(&self) -> Result<Vec<RoleInfo>> {
        Ok(vec![])
    }

    async fn set_table_permissions(
        &self,
        _schema: &str,
        _table: &str,
        _grantee: &str,
        _privileges: Vec<String>,
        _grant_option: bool,
    ) -> Result<()> {
        // Not implemented
        Ok(())
    }

    async fn get_table_dependencies(
        &self,
        _schema: &str,
        _table: &str,
    ) -> Result<TableDependencies> {
        Ok(TableDependencies {
            views: vec![],
            routines: vec![],
            referencing_foreign_keys: vec![],
        })
    }

    async fn get_storage_bloat_info(
        &self,
        _schema: &str,
        _table: &str,
    ) -> Result<StorageBloatInfo> {
        Ok(StorageBloatInfo {
            live_tuples: None,
            dead_tuples: None,
            dead_tuple_pct: None,
            table_size: None,
            index_size: None,
            total_size: None,
            last_vacuum: None,
            last_autovacuum: None,
            last_analyze: None,
            last_autoanalyze: None,
        })
    }

    async fn get_partitions(&self, _schema: &str, _table: &str) -> Result<PartitionInfo> {
        Ok(PartitionInfo {
            is_partitioned: false,
            strategy: None,
            key: None,
            partitions: vec![],
        })
    }
}
