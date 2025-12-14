use crate::services::db_driver::{IndexInfo, QueryResult, TableConstraints, TableStatistics, TriggerInfo};
use crate::services::driver::TableOperations;
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;
use serde_json::Value;

pub struct PostgresTable {
    pool: Pool,
}

impl PostgresTable {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl TableOperations for PostgresTable {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult> {
        tracing::info!(
            "[PostgresTable] get_table_data - schema: {}, table: {}, limit: {}, offset: {}",
            schema,
            table,
            limit,
            offset
        );

        if schema.contains(';')
            || table.contains(';')
            || schema.contains(' ')
            || table.contains(' ')
        {
            tracing::error!("[PostgresTable] Invalid schema or table name detected");
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        let query = format!(
            "SELECT * FROM \"{}\".\"{}\" LIMIT $1 OFFSET $2",
            schema, table
        );

        let client = self.pool.get().await?;
        let rows = client.query(&query, &[&limit, &offset]).await?;

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
        for row in rows {
            let mut current_row = Vec::new();
            for (i, _) in columns.iter().enumerate() {
                let value: Value = if let Ok(v) = row.try_get::<_, i32>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<_, String>(i) {
                    Value::String(v)
                } else if let Ok(v) = row.try_get::<_, bool>(i) {
                    Value::Bool(v)
                } else if let Ok(v) = row.try_get::<_, i64>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<_, f64>(i) {
                    serde_json::Number::from_f64(v)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
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
            "[PostgresTable] get_table_constraints - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let fk_query = "
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_schema AS foreign_schema,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column,
                rc.update_rule,
                rc.delete_rule
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            JOIN information_schema.referential_constraints rc
                ON rc.constraint_name = tc.constraint_name
                AND rc.constraint_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
            ORDER BY tc.constraint_name, kcu.ordinal_position";

        let fk_rows = client.query(fk_query, &[&schema, &table]).await?;
        let foreign_keys: Vec<super::super::db_driver::ForeignKey> = fk_rows
            .iter()
            .map(|row| super::super::db_driver::ForeignKey {
                constraint_name: row.get(0),
                column_name: row.get(1),
                foreign_schema: row.get(2),
                foreign_table: row.get(3),
                foreign_column: row.get(4),
                update_rule: row.get(5),
                delete_rule: row.get(6),
            })
            .collect();

        let check_query = "
            SELECT 
                con.conname AS constraint_name,
                pg_get_constraintdef(con.oid) AS check_clause
            FROM pg_constraint con
            JOIN pg_namespace nsp ON nsp.oid = con.connamespace
            JOIN pg_class cls ON cls.oid = con.conrelid
            WHERE con.contype = 'c'
                AND nsp.nspname = $1
                AND cls.relname = $2
            ORDER BY con.conname";

        let check_rows = client.query(check_query, &[&schema, &table]).await?;
        let check_constraints: Vec<super::super::db_driver::CheckConstraint> = check_rows
            .iter()
            .map(|row| super::super::db_driver::CheckConstraint {
                constraint_name: row.get(0),
                check_clause: row.get(1),
            })
            .collect();

        let unique_query = "
            SELECT 
                tc.constraint_name,
                array_agg(kcu.column_name::text ORDER BY kcu.ordinal_position) AS columns
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'UNIQUE'
                AND tc.table_schema = $1
                AND tc.table_name = $2
            GROUP BY tc.constraint_name
            ORDER BY tc.constraint_name";

        let unique_rows = client.query(unique_query, &[&schema, &table]).await?;
        let unique_constraints: Vec<super::super::db_driver::UniqueConstraint> = unique_rows
            .iter()
            .map(|row| super::super::db_driver::UniqueConstraint {
                constraint_name: row.get(0),
                columns: row.get::<_, Option<Vec<String>>>(1).unwrap_or_default(),
            })
            .collect();

        Ok(TableConstraints {
            foreign_keys,
            check_constraints,
            unique_constraints,
        })
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        tracing::info!(
            "[PostgresTable] get_table_statistics - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let stats_query = "
            SELECT 
                c.reltuples::bigint AS row_count,
                pg_total_relation_size(c.oid) AS total_size,
                pg_relation_size(c.oid) AS table_size,
                pg_indexes_size(c.oid) AS index_size,
                obj_description(c.oid) AS table_comment
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = $1
                AND c.relname = $2
                AND c.relkind = 'r'";

        let stats_row = client.query_opt(stats_query, &[&schema, &table]).await?;

        if let Some(row) = stats_row {
            let row_count: Option<i64> = row.get(0);
            let total_size: Option<i64> = row.get(1);
            let table_size: Option<i64> = row.get(2);
            let index_size: Option<i64> = row.get(3);

            tracing::info!(
                "[PostgresTable] get_table_statistics - RAW VALUES: row_count={:?}, table_size={:?}, index_size={:?}, total_size={:?}",
                row_count, table_size, index_size, total_size
            );

            let time_query = "
                SELECT 
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = $1
                    AND relname = $2";

            let time_row = client.query_opt(time_query, &[&schema, &table]).await?;

            let last_modified = if let Some(time_row) = time_row {
                let last_vacuum: Option<std::time::SystemTime> = time_row.try_get(0).ok().flatten();
                let last_autovacuum: Option<std::time::SystemTime> =
                    time_row.try_get(1).ok().flatten();
                let last_analyze: Option<std::time::SystemTime> =
                    time_row.try_get(2).ok().flatten();
                let last_autoanalyze: Option<std::time::SystemTime> =
                    time_row.try_get(3).ok().flatten();

                [last_vacuum, last_autovacuum, last_analyze, last_autoanalyze]
                    .iter()
                    .filter_map(|t| t.as_ref())
                    .max()
                    .and_then(|st| {
                        st.duration_since(std::time::UNIX_EPOCH).ok().map(|d| {
                            chrono::DateTime::<chrono::Utc>::from_timestamp(
                                d.as_secs() as i64,
                                d.subsec_nanos(),
                            )
                            .map(|dt| dt.to_string())
                            .unwrap_or_else(|| "".to_string())
                        })
                    })
            } else {
                None
            };

            let result = TableStatistics {
                row_count,
                table_size,
                index_size,
                total_size,
                created_at: None,
                last_modified,
            };

            tracing::info!(
                "[PostgresTable] get_table_statistics - FINAL RESULT: {:?}",
                result
            );

            Ok(result)
        } else {
            tracing::warn!("[PostgresTable] get_table_statistics - Table not found in pg_class");
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
        tracing::info!(
            "[PostgresTable] get_table_indexes - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let query = "
            SELECT 
                i.relname AS index_name,
                array_agg(a.attname ORDER BY array_position(ix.indkey, a.attnum)) AS columns,
                ix.indisunique AS is_unique,
                ix.indisprimary AS is_primary,
                am.amname AS algorithm,
                pg_get_expr(ix.indpred, ix.indrelid) AS condition,
                (
                    SELECT array_agg(attname ORDER BY attnum)
                    FROM pg_attribute
                    WHERE attrelid = i.oid
                        AND attnum > 0
                        AND attnum <= i.relnatts
                        AND attnum != ALL(ix.indkey)
                        AND attnum = ANY(ix.indkey::int[])
                ) AS include_columns,
                obj_description(i.oid, 'pg_class') AS comment
            FROM pg_index ix
            JOIN pg_class t ON t.oid = ix.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_class i ON i.oid = ix.indexrelid
            JOIN pg_am am ON am.oid = i.relam
            LEFT JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
            WHERE n.nspname = $1
                AND t.relname = $2
            GROUP BY i.relname, ix.indisunique, ix.indisprimary, am.amname, 
                     ix.indpred, ix.indrelid, i.oid, i.relnatts, ix.indkey
            ORDER BY i.relname";

        let rows = client.query(query, &[&schema, &table]).await?;

        let indexes: Vec<IndexInfo> = rows
            .iter()
            .map(|row| IndexInfo {
                name: row.get(0),
                columns: row.get(1),
                is_unique: row.get(2),
                is_primary: row.get(3),
                algorithm: row.get(4),
                condition: row.get(5),
                include: row.get(6),
                comment: row.get(7),
            })
            .collect();

        tracing::info!(
            "[PostgresTable] get_table_indexes - found {} indexes",
            indexes.len()
        );

        Ok(indexes)
    }

    async fn get_table_triggers(&self, schema: &str, table: &str) -> Result<Vec<TriggerInfo>> {
        tracing::info!(
            "[PostgresTable] get_table_triggers - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let query = r#"
            SELECT
                t.tgname AS name,
                CASE
                    WHEN (t.tgtype & 2) = 2 THEN 'BEFORE'
                    WHEN (t.tgtype & 64) = 64 THEN 'INSTEAD OF'
                    ELSE 'AFTER'
                END AS timing,
                array_remove(ARRAY[
                    CASE WHEN (t.tgtype & 4) = 4 THEN 'INSERT' END,
                    CASE WHEN (t.tgtype & 16) = 16 THEN 'UPDATE' END,
                    CASE WHEN (t.tgtype & 8) = 8 THEN 'DELETE' END,
                    CASE WHEN (t.tgtype & 32) = 32 THEN 'TRUNCATE' END
                ], NULL) AS events,
                CASE WHEN (t.tgtype & 1) = 1 THEN 'ROW' ELSE 'STATEMENT' END AS level,
                pn.nspname AS function_schema,
                p.proname AS function_name,
                t.tgenabled::text AS enabled,
                pg_get_triggerdef(t.oid, true) AS definition
            FROM pg_trigger t
            JOIN pg_class c ON c.oid = t.tgrelid
            JOIN pg_namespace n ON n.oid = c.relnamespace
            JOIN pg_proc p ON p.oid = t.tgfoid
            JOIN pg_namespace pn ON pn.oid = p.pronamespace
            WHERE NOT t.tgisinternal
                AND n.nspname = $1
                AND c.relname = $2
            ORDER BY t.tgname
        "#;

        let rows = client.query(query, &[&schema, &table]).await?;

        let mut triggers = Vec::new();
        for row in rows {
            let enabled: String = match row.get::<_, String>(6).as_str() {
                "O" => "enabled".to_string(),
                "D" => "disabled".to_string(),
                "R" => "replica".to_string(),
                "A" => "always".to_string(),
                other => other.to_string(),
            };

            triggers.push(TriggerInfo {
                name: row.get(0),
                timing: row.get(1),
                events: row.get::<_, Option<Vec<String>>>(2).unwrap_or_default(),
                level: row.get(3),
                function_schema: Some(row.get(4)),
                function_name: Some(row.get(5)),
                enabled,
                definition: row.get(7),
            });
        }

        Ok(triggers)
    }
}
