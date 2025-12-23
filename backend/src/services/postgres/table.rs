use crate::services::db_driver::{
    DependentRoutineInfo, DependentViewInfo, IndexInfo, PartitionChildInfo, PartitionInfo,
    QueryResult, ReferencingForeignKeyInfo, RoleInfo, StorageBloatInfo, TableComment,
    TableConstraints, TableDependencies, TableGrant, TableStatistics, TriggerInfo,
};
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
        _filter: Option<String>,
        _document_id: Option<String>,
        _fields: Option<Vec<String>>,
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

        let select_clause = if let Some(f) = &_fields {
            if f.is_empty() {
                "*".to_string()
            } else {
                f.iter()
                    .map(|field| format!("\"{}\"", field))
                    .collect::<Vec<_>>()
                    .join(", ")
            }
        } else {
            "*".to_string()
        };

        let query = format!(
            "SELECT {} FROM \"{}\".\"{}\" LIMIT $1 OFFSET $2",
            select_clause, schema, table
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
                row_metadata: None,
                execution_time_ms: None,
                json: None,
                display_mode: None,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        // Use the comprehensive type decoder from query module
        let mut result_rows = Vec::new();
        for row in rows {
            let mut current_row = Vec::new();
            for i in 0..columns.len() {
                let col_type = row.columns()[i].type_();
                let type_name = col_type.name();

                let value: Value = if type_name == "json" || type_name == "jsonb" {
                    row.try_get::<_, Option<Value>>(i)
                        .ok()
                        .flatten()
                        .unwrap_or(Value::Null)
                } else if let Ok(v) = row.try_get::<_, i64>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<_, i32>(i) {
                    Value::Number(v.into())
                } else if let Ok(v) = row.try_get::<_, f64>(i) {
                    serde_json::Number::from_f64(v)
                        .map(Value::Number)
                        .unwrap_or(Value::Null)
                } else if let Ok(v) = row.try_get::<_, bool>(i) {
                    Value::Bool(v)
                } else if let Ok(v) = row.try_get::<_, String>(i) {
                    Value::String(v)
                } else {
                    // Fallback for other types
                    match row.try_get::<_, Option<Value>>(i) {
                        Ok(Some(v)) => v,
                        _ => Value::Null,
                    }
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
            row_metadata: None,
            execution_time_ms: None,
            json: None,
            display_mode: None,
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

    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment> {
        tracing::info!(
            "[PostgresTable] get_table_comment - schema: {}, table: {}",
            schema,
            table
        );

        if schema.contains(';')
            || table.contains(';')
            || schema.contains(' ')
            || table.contains(' ')
        {
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        let client = self.pool.get().await?;
        let row = client
            .query_opt(
                r#"
                SELECT obj_description(c.oid) AS table_comment
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                    AND c.relname = $2
                    AND c.relkind = 'r'
                "#,
                &[&schema, &table],
            )
            .await?;

        let comment: Option<String> = row.and_then(|r| r.get::<_, Option<String>>(0));
        Ok(TableComment { comment })
    }

    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        tracing::info!(
            "[PostgresTable] set_table_comment - schema: {}, table: {}",
            schema,
            table
        );

        if schema.contains(';')
            || table.contains(';')
            || schema.contains(' ')
            || table.contains(' ')
        {
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        let comment_param: Option<&str> = comment.as_deref();
        let query = format!("COMMENT ON TABLE \"{}\".\"{}\" IS $1", schema, table);

        let client = self.pool.get().await?;
        client.execute(&query, &[&comment_param]).await?;
        Ok(())
    }

    async fn get_table_permissions(&self, schema: &str, table: &str) -> Result<Vec<TableGrant>> {
        tracing::info!(
            "[PostgresTable] get_table_permissions - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;
        let query = r#"
            SELECT
                grantee,
                privilege_type,
                grantor,
                is_grantable
            FROM information_schema.role_table_grants
            WHERE table_schema = $1
              AND table_name = $2
            ORDER BY grantee, privilege_type
        "#;

        let rows = client.query(query, &[&schema, &table]).await?;
        let mut grants = Vec::new();
        for row in rows {
            let is_grantable: String = row.get(3);
            grants.push(TableGrant {
                grantee: row.get(0),
                privilege: row.get(1),
                grantor: row.get::<_, Option<String>>(2),
                is_grantable: is_grantable.eq_ignore_ascii_case("YES"),
            });
        }

        Ok(grants)
    }

    async fn list_roles(&self) -> Result<Vec<RoleInfo>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                r#"
                SELECT rolname, rolcanlogin
                FROM pg_roles
                ORDER BY rolname
                "#,
                &[],
            )
            .await?;

        Ok(rows
            .into_iter()
            .map(|r| RoleInfo {
                name: r.get(0),
                can_login: r.get(1),
            })
            .collect())
    }

    async fn set_table_permissions(
        &self,
        schema: &str,
        table: &str,
        grantee: &str,
        privileges: Vec<String>,
        grant_option: bool,
    ) -> Result<()> {
        fn quote_ident(s: &str) -> String {
            format!("\"{}\"", s.replace('"', "\"\""))
        }

        fn normalize_priv(p: &str) -> Option<&'static str> {
            match p.trim().to_uppercase().as_str() {
                "SELECT" => Some("SELECT"),
                "INSERT" => Some("INSERT"),
                "UPDATE" => Some("UPDATE"),
                "DELETE" => Some("DELETE"),
                "TRUNCATE" => Some("TRUNCATE"),
                "REFERENCES" => Some("REFERENCES"),
                "TRIGGER" => Some("TRIGGER"),
                _ => None,
            }
        }

        if schema.trim().is_empty() || table.trim().is_empty() {
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        // grantee can be quoted identifiers in postgres; allow a broader set by quoting,
        // but reject control chars / empty.
        if grantee.trim().is_empty() || grantee.chars().any(|c| c.is_control()) {
            return Err(anyhow::anyhow!("Invalid grantee"));
        }

        let mut normalized_privs = Vec::new();
        for p in privileges {
            let Some(np) = normalize_priv(&p) else {
                return Err(anyhow::anyhow!("Unsupported privilege: {}", p));
            };
            if !normalized_privs.contains(&np.to_string()) {
                normalized_privs.push(np.to_string());
            }
        }

        let target = format!("{}.{}", quote_ident(schema), quote_ident(table));
        let grantee_ident = quote_ident(grantee);

        let mut client = self.pool.get().await?;
        let tx = client.transaction().await?;

        // Revoke all explicit grants first (idempotent)
        let revoke_all = format!(
            "REVOKE ALL PRIVILEGES ON TABLE {} FROM {}",
            target, grantee_ident
        );
        tx.execute(&revoke_all, &[]).await?;
        let revoke_go = format!(
            "REVOKE GRANT OPTION FOR ALL PRIVILEGES ON TABLE {} FROM {}",
            target, grantee_ident
        );
        tx.execute(&revoke_go, &[]).await?;

        if !normalized_privs.is_empty() {
            let priv_list = normalized_privs.join(", ");
            let grant = format!(
                "GRANT {} ON TABLE {} TO {}{}",
                priv_list,
                target,
                grantee_ident,
                if grant_option {
                    " WITH GRANT OPTION"
                } else {
                    ""
                }
            );
            tx.execute(&grant, &[]).await?;
        }

        tx.commit().await?;
        Ok(())
    }

    async fn get_table_dependencies(&self, schema: &str, table: &str) -> Result<TableDependencies> {
        tracing::info!(
            "[PostgresTable] get_table_dependencies - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let views = client
            .query(
                r#"
                WITH target AS (
                    SELECT c.oid AS relid
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = $1
                      AND c.relname = $2
                )
                SELECT DISTINCT
                    nv.nspname AS schema,
                    v.relname AS name,
                    CASE v.relkind
                        WHEN 'v' THEN 'view'
                        WHEN 'm' THEN 'materialized_view'
                        ELSE v.relkind::text
                    END AS kind
                FROM target t
                JOIN pg_depend d
                  ON d.refobjid = t.relid
                 AND d.classid = 'pg_rewrite'::regclass
                JOIN pg_rewrite r ON r.oid = d.objid
                JOIN pg_class v ON v.oid = r.ev_class
                JOIN pg_namespace nv ON nv.oid = v.relnamespace
                WHERE v.relkind IN ('v', 'm')
                ORDER BY 1, 2
                "#,
                &[&schema, &table],
            )
            .await?
            .into_iter()
            .map(|r| DependentViewInfo {
                schema: r.get(0),
                name: r.get(1),
                kind: r.get(2),
            })
            .collect::<Vec<_>>();

        let routines = client
            .query(
                r#"
                WITH target AS (
                    SELECT c.oid AS relid
                    FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = $1
                      AND c.relname = $2
                )
                SELECT DISTINCT
                    np.nspname AS schema,
                    p.proname AS name,
                    CASE p.prokind
                        WHEN 'f' THEN 'function'
                        WHEN 'p' THEN 'procedure'
                        WHEN 'a' THEN 'aggregate'
                        WHEN 'w' THEN 'window'
                        ELSE p.prokind::text
                    END AS kind,
                    pg_get_function_identity_arguments(p.oid) AS arguments
                FROM target t
                JOIN pg_depend d
                  ON d.refobjid = t.relid
                 AND d.classid = 'pg_proc'::regclass
                JOIN pg_proc p ON p.oid = d.objid
                JOIN pg_namespace np ON np.oid = p.pronamespace
                ORDER BY 1, 2, 4
                "#,
                &[&schema, &table],
            )
            .await?
            .into_iter()
            .map(|r| DependentRoutineInfo {
                schema: r.get(0),
                name: r.get(1),
                kind: r.get(2),
                arguments: r.get(3),
            })
            .collect::<Vec<_>>();

        let referencing_foreign_keys = client
            .query(
                r#"
                SELECT
                    n.nspname AS schema,
                    c.relname AS table,
                    con.conname AS constraint_name,
                    (SELECT array_agg(a.attname ORDER BY array_position(con.conkey, a.attnum)) 
                     FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum = ANY(con.conkey)) AS columns,
                    (SELECT array_agg(a.attname ORDER BY array_position(con.confkey, a.attnum)) 
                     FROM pg_attribute a WHERE a.attrelid = con.confrelid AND a.attnum = ANY(con.confkey)) AS referenced_columns,
                    CASE con.confupdtype
                        WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
                        WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.confupdtype::text
                    END AS on_update,
                    CASE con.confdeltype
                        WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE'
                        WHEN 'n' THEN 'SET NULL' WHEN 'd' THEN 'SET DEFAULT' ELSE con.confdeltype::text
                    END AS on_delete
                FROM pg_constraint con
                JOIN pg_class c ON c.oid = con.conrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE con.confrelid = (
                    SELECT c.oid FROM pg_class c
                    JOIN pg_namespace n ON n.oid = c.relnamespace
                    WHERE n.nspname = $1 AND c.relname = $2
                )
                AND con.contype = 'f'
                "#,
                &[&schema, &table],
            )
            .await?
            .into_iter()
            .map(|r| ReferencingForeignKeyInfo {
                schema: r.get(0),
                table: r.get(1),
                constraint_name: r.get(2),
                columns: r.get(3),
                referenced_columns: r.get(4),
                on_update: r.get(5),
                on_delete: r.get(6),
            })
            .collect::<Vec<_>>();

        Ok(TableDependencies {
            views,
            routines,
            referencing_foreign_keys,
        })
    }

    async fn detect_fk_orphans(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<crate::services::db_driver::FkOrphanInfo>> {
        tracing::info!(
            "[PostgresTable] detect_fk_orphans - schema: {}, table: {}",
            schema,
            table
        );

        // Re-use logic to get constraints OR just query them directly here.
        // It's cleaner to query directly or reuse get_table_constraints if efficient.
        // Let's query directly to avoid overhead if get_table_constraints gets too much info.

        let client = self.pool.get().await?;

        let fk_query = "
            SELECT 
                tc.constraint_name,
                kcu.column_name,
                ccu.table_schema AS foreign_schema,
                ccu.table_name AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu 
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = $1
                AND tc.table_name = $2
            ORDER BY tc.constraint_name, kcu.ordinal_position";

        let fk_rows = client.query(fk_query, &[&schema, &table]).await?;

        // Group by constraint name to handle composite keys
        use std::collections::HashMap;
        struct FkDef {
            constraint_name: String,
            local_cols: Vec<String>,
            foreign_schema: String,
            foreign_table: String,
            foreign_cols: Vec<String>,
        }

        let mut fks: HashMap<String, FkDef> = HashMap::new();

        for row in fk_rows {
            let constraint_name: String = row.get(0);
            let local_col: String = row.get(1);
            let foreign_schema: String = row.get(2);
            let foreign_table: String = row.get(3);
            let foreign_col: String = row.get(4);

            let entry = fks.entry(constraint_name.clone()).or_insert(FkDef {
                constraint_name,
                local_cols: Vec::new(),
                foreign_schema,
                foreign_table,
                foreign_cols: Vec::new(),
            });
            entry.local_cols.push(local_col);
            entry.foreign_cols.push(foreign_col);
        }

        let mut results = Vec::new();

        for fk in fks.values() {
            // Build the check query
            // SELECT count(*) FROM local t LEFT JOIN foreign f ON t.c1=f.fc1 AND t.c2=f.fc2 WHERE f.fc1 IS NULL AND t.c1 IS NOT NULL ...

            let local_table_quoted = format!("\"{}\".\"{}\"", schema, table); // Simple quoting, assumes valid identifiers
            let foreign_table_quoted =
                format!("\"{}\".\"{}\"", fk.foreign_schema, fk.foreign_table);

            let mut join_conditions = Vec::new();
            let mut null_checks = Vec::new();
            let mut not_null_checks = Vec::new();

            for (i, local_col) in fk.local_cols.iter().enumerate() {
                let foreign_col = &fk.foreign_cols[i];
                // Quote columns
                let lc = format!("\"{}\"", local_col);
                let fc = format!("\"{}\"", foreign_col);

                join_conditions.push(format!("local.{} = foreign.{}", lc, fc));
                null_checks.push(format!("foreign.{} IS NULL", fc));
                not_null_checks.push(format!("local.{} IS NOT NULL", lc));
            }

            // Combine logic:
            // We want rows where match FAILED (f.pk is null) BUT local columns are NOT NULL via left join
            // AND match condition is (l.c1 = f.c1 AND l.c2 = f.c2)

            let query = format!(
                "SELECT count(*) FROM {} local LEFT JOIN {} foreign ON {} WHERE ({}) AND ({})",
                local_table_quoted,
                foreign_table_quoted,
                join_conditions.join(" AND "),
                null_checks.get(0).unwrap(), // Any null in PK on RHS means no match
                not_null_checks.join(" AND ") // All local FK cols must be non-null to be a candidate for orphan (unless Partial match logic? Postgres default is all keys must be non-null to require match, or if any is null, check is skipped usually unless MATCH FULL).
                                              // Simplified: basic orphan check assumes if you have values, they must match.
            );

            tracing::debug!("Orphan check query for {}: {}", fk.constraint_name, query);

            match client.query_one(&query, &[]).await {
                Ok(row) => {
                    let count: i64 = row.get(0);
                    if count > 0 {
                        results.push(crate::services::db_driver::FkOrphanInfo {
                            constraint_name: fk.constraint_name.clone(),
                            foreign_key_columns: fk.local_cols.clone(),
                            referenced_table: format!("{}.{}", fk.foreign_schema, fk.foreign_table),
                            orphan_count: count,
                        });
                    }
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to check orphans for constraint {}: {}",
                        fk.constraint_name,
                        e
                    );
                    // Optionally return error or just skip/log
                }
            }
        }

        Ok(results)
    }

    async fn get_storage_bloat_info(&self, schema: &str, table: &str) -> Result<StorageBloatInfo> {
        tracing::info!(
            "[PostgresTable] get_storage_bloat_info - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let size_row = client
            .query_opt(
                r#"
                SELECT
                    pg_relation_size(c.oid) AS table_size,
                    pg_indexes_size(c.oid) AS index_size,
                    pg_total_relation_size(c.oid) AS total_size
                FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relname = $2
                  AND c.relkind = 'r'
                "#,
                &[&schema, &table],
            )
            .await?;

        let (table_size, index_size, total_size) = if let Some(r) = size_row {
            (
                r.get::<_, Option<i64>>(0),
                r.get::<_, Option<i64>>(1),
                r.get::<_, Option<i64>>(2),
            )
        } else {
            (None, None, None)
        };

        let stat_row = client
            .query_opt(
                r#"
                SELECT
                    n_live_tup,
                    n_dead_tup,
                    last_vacuum,
                    last_autovacuum,
                    last_analyze,
                    last_autoanalyze
                FROM pg_stat_user_tables
                WHERE schemaname = $1
                  AND relname = $2
                "#,
                &[&schema, &table],
            )
            .await?;

        let mut live_tuples: Option<i64> = None;
        let mut dead_tuples: Option<i64> = None;
        let mut last_vacuum: Option<String> = None;
        let mut last_autovacuum: Option<String> = None;
        let mut last_analyze: Option<String> = None;
        let mut last_autoanalyze: Option<String> = None;

        if let Some(r) = stat_row {
            live_tuples = r.get::<_, Option<i64>>(0);
            dead_tuples = r.get::<_, Option<i64>>(1);

            let to_string = |st: Option<std::time::SystemTime>| -> Option<String> {
                st.and_then(|s| {
                    s.duration_since(std::time::UNIX_EPOCH)
                        .ok()
                        .and_then(|d| {
                            chrono::DateTime::<chrono::Utc>::from_timestamp(
                                d.as_secs() as i64,
                                d.subsec_nanos(),
                            )
                        })
                        .map(|dt| dt.to_string())
                })
            };

            last_vacuum = to_string(r.try_get(2).ok().flatten());
            last_autovacuum = to_string(r.try_get(3).ok().flatten());
            last_analyze = to_string(r.try_get(4).ok().flatten());
            last_autoanalyze = to_string(r.try_get(5).ok().flatten());
        }

        let dead_tuple_pct = match (live_tuples, dead_tuples) {
            (Some(live), Some(dead)) => {
                let denom = (live + dead) as f64;
                if denom <= 0.0 {
                    Some(0.0)
                } else {
                    Some((dead as f64) * 100.0 / denom)
                }
            }
            _ => None,
        };

        Ok(StorageBloatInfo {
            live_tuples,
            dead_tuples,
            dead_tuple_pct,
            table_size,
            index_size,
            total_size,
            last_vacuum,
            last_autovacuum,
            last_analyze,
            last_autoanalyze,
        })
    }

    async fn get_partitions(&self, schema: &str, table: &str) -> Result<PartitionInfo> {
        tracing::info!(
            "[PostgresTable] get_partitions - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        let meta_row = client
            .query_opt(
                r#"
                SELECT
                    pt.partstrat::text AS strategy,
                    pg_get_partkeydef(pt.partrelid) AS key
                FROM pg_partitioned_table pt
                JOIN pg_class c ON c.oid = pt.partrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = $1
                  AND c.relname = $2
                "#,
                &[&schema, &table],
            )
            .await?;

        let Some(meta_row) = meta_row else {
            return Ok(PartitionInfo {
                is_partitioned: false,
                strategy: None,
                key: None,
                partitions: vec![],
            });
        };

        let strategy: Option<String> = meta_row.get(0);
        let key: Option<String> = meta_row.get(1);

        let rows = client
            .query(
                r#"
                SELECT
                    nc.nspname AS child_schema,
                    c.relname AS child_name,
                    pg_get_expr(c.relpartbound, c.oid, true) AS bound,
                    pg_relation_size(c.oid) AS table_size,
                    pg_indexes_size(c.oid) AS index_size,
                    pg_total_relation_size(c.oid) AS total_size
                FROM pg_inherits i
                JOIN pg_class c ON c.oid = i.inhrelid
                JOIN pg_namespace nc ON nc.oid = c.relnamespace
                JOIN pg_class p ON p.oid = i.inhparent
                JOIN pg_namespace np ON np.oid = p.relnamespace
                WHERE np.nspname = $1
                  AND p.relname = $2
                ORDER BY nc.nspname, c.relname
                "#,
                &[&schema, &table],
            )
            .await?;

        let partitions = rows
            .into_iter()
            .map(|r| PartitionChildInfo {
                schema: r.get(0),
                name: r.get(1),
                bound: r.get::<_, Option<String>>(2),
                table_size: r.get::<_, Option<i64>>(3),
                index_size: r.get::<_, Option<i64>>(4),
                total_size: r.get::<_, Option<i64>>(5),
            })
            .collect();

        Ok(PartitionInfo {
            is_partitioned: true,
            strategy,
            key,
            partitions,
        })
    }
}
