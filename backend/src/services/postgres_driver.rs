use super::db_driver::{DatabaseDriver, QueryResult};
use crate::models::entities::connection;
use anyhow::{Context, Result};
use async_trait::async_trait;
use deadpool_postgres::{Config, ManagerConfig, Pool, RecyclingMethod, Runtime};
use serde_json::Value;
use tokio_postgres::NoTls;

pub struct PostgresDriver {
    pool: Pool,
}

impl PostgresDriver {
    pub async fn new(connection: &connection::Model, password: &str) -> Result<Self> {
        tracing::info!(
            "[PostgresDriver] Creating new connection pool to {}:{}/{}",
            connection.host,
            connection.port,
            connection.database
        );

        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some(connection.database.clone());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        tracing::debug!("[PostgresDriver] Pool config created, attempting to create pool...");

        match cfg.create_pool(Some(Runtime::Tokio1), NoTls) {
            Ok(pool) => {
                tracing::info!("[PostgresDriver] Connection pool created successfully");
                Ok(Self { pool })
            }
            Err(e) => {
                let error_msg = e.to_string();
                tracing::error!("[PostgresDriver] Failed to create pool: {}", error_msg);
                let error_lower = error_msg.to_lowercase();

                if error_lower.contains("does not exist")
                    || error_lower.contains("3d000")
                    || error_lower.contains("database") && error_lower.contains("not exist")
                {
                    return Err(anyhow::anyhow!(
                        "Database '{}' does not exist. Please create it first or use an existing database name. You can list available databases after testing the connection.",
                        connection.database
                    ));
                }
                Err(anyhow::anyhow!("Failed to create connection pool: {}", e))
            }
        }
    }

    pub async fn new_for_test(connection: &connection::Model, password: &str) -> Result<Self> {
        if connection.host.is_empty() {
            return Err(anyhow::anyhow!("Host cannot be empty"));
        }
        if connection.username.is_empty() {
            return Err(anyhow::anyhow!("Username cannot be empty"));
        }
        if password.is_empty() {
            return Err(anyhow::anyhow!("Password cannot be empty"));
        }

        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some("postgres".to_string());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        match cfg.create_pool(Some(Runtime::Tokio1), NoTls) {
            Ok(pool) => Ok(Self { pool }),
            Err(e) => {
                let error_msg = e.to_string();
                let error_lower = error_msg.to_lowercase();

                if error_lower.contains("connection refused")
                    || error_lower.contains("could not connect")
                {
                    Err(anyhow::anyhow!(
                        "Connection refused. Please check if PostgreSQL is running on {}:{}",
                        connection.host,
                        connection.port
                    ))
                } else if error_lower.contains("password authentication failed")
                    || error_lower.contains("authentication failed")
                {
                    Err(anyhow::anyhow!(
                        "Authentication failed. Please check your username and password."
                    ))
                } else if error_lower.contains("timeout") {
                    Err(anyhow::anyhow!("Connection timeout. Please check your network connection and firewall settings."))
                } else {
                    Err(anyhow::anyhow!(
                        "Failed to connect to PostgreSQL server: {}",
                        error_msg
                    ))
                }
            }
        }
    }

    pub async fn create_database_if_not_exists(
        connection: &connection::Model,
        password: &str,
    ) -> Result<()> {
        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some("postgres".to_string());
        cfg.user = Some(connection.username.clone());
        cfg.password = Some(password.to_string());
        cfg.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        let pool = cfg.create_pool(Some(Runtime::Tokio1), NoTls)?;
        let client = pool.get().await?;

        let db_name = &connection.database;
        let query = "SELECT 1 FROM pg_database WHERE datname = $1";

        let exists = client.query_opt(query, &[db_name]).await?;

        if exists.is_none() {
            let escaped_name = db_name.replace("\"", "\"\"");
            let create_query = format!("CREATE DATABASE \"{}\"", escaped_name);
            client.execute(&create_query, &[]).await.with_context(|| {
                format!(
                    "Failed to create database '{}'. Make sure you have the necessary privileges.",
                    db_name
                )
            })?;
        }

        Ok(())
    }
}

#[async_trait]
impl DatabaseDriver for PostgresDriver {
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
                // Simple type mapping for now - expand as needed
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
            affected_rows: 0, // Select queries don't affect rows
        })
    }

    async fn test_connection(&self) -> Result<()> {
        let client = self.pool.get().await?;
        client.execute("SELECT 1", &[]).await?;
        Ok(())
    }

    async fn get_databases(&self) -> Result<Vec<String>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname",
                &[],
            )
            .await?;

        Ok(rows.iter().map(|row| row.get(0)).collect())
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT schema_name FROM information_schema.schemata 
             WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast') 
             AND schema_name NOT LIKE 'pg_temp_%' 
             AND schema_name NOT LIKE 'pg_toast_temp_%'
             ORDER BY schema_name",
                &[],
            )
            .await?;

        Ok(rows.iter().map(|row| row.get(0)).collect())
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<super::db_driver::TableInfo>> {
        let client = self.pool.get().await?;
        let rows = client
            .query(
                "SELECT table_schema, table_name, table_type 
             FROM information_schema.tables 
             WHERE table_schema = $1 
             ORDER BY table_name",
                &[&schema],
            )
            .await?;

        Ok(rows
            .iter()
            .map(|row| super::db_driver::TableInfo {
                schema: row.get(0),
                name: row.get(1),
                table_type: row.get(2),
            })
            .collect())
    }

    async fn get_columns(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<Vec<super::db_driver::TableColumn>> {
        tracing::info!(
            "[PostgresDriver] get_columns - schema: {}, table: {}",
            schema,
            table
        );
        tracing::debug!("[PostgresDriver] Acquiring connection from pool...");

        let client = match self.pool.get().await {
            Ok(c) => {
                tracing::debug!("[PostgresDriver] Connection acquired from pool");
                c
            }
            Err(e) => {
                tracing::error!("[PostgresDriver] Failed to get connection from pool: {}", e);
                return Err(anyhow::anyhow!("Failed to get connection: {}", e));
            }
        };

        tracing::debug!("[PostgresDriver] Executing get_columns query...");
        let rows = client
            .query(
                "SELECT 
                c.column_name, 
                c.data_type, 
                c.is_nullable, 
                c.column_default,
                CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
             FROM information_schema.columns c
             LEFT JOIN (
                SELECT kcu.table_schema, kcu.table_name, kcu.column_name
                FROM information_schema.key_column_usage kcu
                JOIN information_schema.table_constraints tc 
                  ON kcu.constraint_name = tc.constraint_name
                  AND kcu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
             ) pk ON c.table_schema = pk.table_schema 
                  AND c.table_name = pk.table_name 
                  AND c.column_name = pk.column_name
             WHERE c.table_schema = $1 AND c.table_name = $2
             ORDER BY c.ordinal_position",
                &[&schema, &table],
            )
            .await?;

        tracing::info!(
            "[PostgresDriver] get_columns - found {} columns",
            rows.len()
        );

        Ok(rows
            .iter()
            .map(|row| {
                let is_nullable: String = row.get(2);
                super::db_driver::TableColumn {
                    name: row.get(0),
                    data_type: row.get(1),
                    is_nullable: is_nullable == "YES",
                    default_value: row.get(3),
                    is_primary_key: row.get(4),
                }
            })
            .collect())
    }

    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<super::db_driver::QueryResult> {
        tracing::info!(
            "[PostgresDriver] get_table_data - schema: {}, table: {}, limit: {}, offset: {}",
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
            tracing::error!("[PostgresDriver] Invalid schema or table name detected");
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        let query = format!(
            "SELECT * FROM \"{}\".\"{}\" LIMIT $1 OFFSET $2",
            schema, table
        );
        tracing::debug!("[PostgresDriver] Query: {}", query);

        tracing::debug!("[PostgresDriver] Acquiring connection from pool...");
        let client = match self.pool.get().await {
            Ok(c) => {
                tracing::debug!("[PostgresDriver] Connection acquired from pool");
                c
            }
            Err(e) => {
                tracing::error!("[PostgresDriver] Failed to get connection from pool: {}", e);
                return Err(anyhow::anyhow!("Failed to get connection: {}", e));
            }
        };

        tracing::debug!("[PostgresDriver] Executing query...");
        let rows = match client.query(&query, &[&limit, &offset]).await {
            Ok(r) => {
                tracing::debug!("[PostgresDriver] Query executed successfully");
                r
            }
            Err(e) => {
                tracing::error!("[PostgresDriver] Query failed: {}", e);
                return Err(anyhow::anyhow!("Query failed: {}", e));
            }
        };

        if rows.is_empty() {
            tracing::info!("[PostgresDriver] get_table_data - no rows found");
            return Ok(super::db_driver::QueryResult {
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

        tracing::info!(
            "[PostgresDriver] get_table_data - returning {} rows",
            result_rows.len()
        );

        Ok(super::db_driver::QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
        })
    }

    async fn execute_query(&self, query: &str) -> Result<super::db_driver::QueryResult> {
        // Simple execution for now.
        // Note: tokio-postgres `query` returns rows, `execute` returns affected count.
        // We need to support both SELECT and other statements.
        // A naive approach is to try `query` first.

        let client = self.pool.get().await?;

        // We'll use `simple_query` for multiple statements support if needed,
        // but for now let's stick to `query` for parameterized-like safety (though we pass raw string here).
        // Actually, for a SQL client, we usually want to execute exactly what the user typed.
        // `simple_query` is better for "run this script" but `query` gives better type info.
        // Let's use `query` for now, assuming single statement.

        // Check if it's a SELECT (rough check)
        let is_select = query.trim().to_uppercase().starts_with("SELECT")
            || query.trim().to_uppercase().starts_with("WITH");

        if is_select {
            let rows = client.query(query, &[]).await?;

            if rows.is_empty() {
                return Ok(super::db_driver::QueryResult {
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
                    } else if let Ok(v) = row.try_get::<_, i64>(i) {
                        Value::Number(v.into())
                    } else if let Ok(v) = row.try_get::<_, f64>(i) {
                        serde_json::Number::from_f64(v)
                            .map(Value::Number)
                            .unwrap_or(Value::Null)
                    } else {
                        // Fallback for other types to string representation if possible or null
                        // For now just null or string if we can cast
                        Value::Null
                    };
                    current_row.push(value);
                }
                result_rows.push(current_row);
            }

            Ok(super::db_driver::QueryResult {
                columns,
                rows: result_rows,
                affected_rows: 0,
            })
        } else {
            let affected = client.execute(query, &[]).await?;
            Ok(super::db_driver::QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
            })
        }
    }

    async fn get_table_constraints(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableConstraints> {
        tracing::info!(
            "[PostgresDriver] get_table_constraints - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        // Query foreign keys
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
        let foreign_keys: Vec<super::db_driver::ForeignKey> = fk_rows
            .iter()
            .map(|row| super::db_driver::ForeignKey {
                constraint_name: row.get(0),
                column_name: row.get(1),
                foreign_schema: row.get(2),
                foreign_table: row.get(3),
                foreign_column: row.get(4),
                update_rule: row.get(5),
                delete_rule: row.get(6),
            })
            .collect();

        // Query check constraints
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
        let check_constraints: Vec<super::db_driver::CheckConstraint> = check_rows
            .iter()
            .map(|row| super::db_driver::CheckConstraint {
                constraint_name: row.get(0),
                check_clause: row.get(1),
            })
            .collect();

        // Query unique constraints
        let unique_query = "
            SELECT 
                tc.constraint_name,
                array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS columns
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
        let unique_constraints: Vec<super::db_driver::UniqueConstraint> = unique_rows
            .iter()
            .map(|row| super::db_driver::UniqueConstraint {
                constraint_name: row.get(0),
                columns: row.get(1),
            })
            .collect();

        tracing::info!(
            "[PostgresDriver] get_table_constraints - found {} FKs, {} checks, {} uniques",
            foreign_keys.len(),
            check_constraints.len(),
            unique_constraints.len()
        );

        Ok(super::db_driver::TableConstraints {
            foreign_keys,
            check_constraints,
            unique_constraints,
        })
    }

    async fn get_table_statistics(
        &self,
        schema: &str,
        table: &str,
    ) -> Result<super::db_driver::TableStatistics> {
        tracing::info!(
            "[PostgresDriver] get_table_statistics - schema: {}, table: {}",
            schema,
            table
        );

        let client = self.pool.get().await?;

        // Query table statistics
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

            // Query timestamps from pg_stat_user_tables
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
                // Get the most recent timestamp
                // PostgreSQL timestamps are returned as SystemTime or we can get them as strings
                let last_vacuum: Option<chrono::DateTime<chrono::Utc>> = time_row.try_get(0).ok().flatten();
                let last_autovacuum: Option<chrono::DateTime<chrono::Utc>> = time_row.try_get(1).ok().flatten();
                let last_analyze: Option<chrono::DateTime<chrono::Utc>> = time_row.try_get(2).ok().flatten();
                let last_autoanalyze: Option<chrono::DateTime<chrono::Utc>> = time_row.try_get(3).ok().flatten();

                [last_vacuum, last_autovacuum, last_analyze, last_autoanalyze]
                    .iter()
                    .filter_map(|t| t.as_ref())
                    .max()
                    .map(|t| t.to_string())
            } else {
                None
            };

            tracing::info!(
                "[PostgresDriver] get_table_statistics - rows: {:?}, total_size: {:?}",
                row_count,
                total_size
            );

            Ok(super::db_driver::TableStatistics {
                row_count,
                table_size,
                index_size,
                total_size,
                created_at: None, // PostgreSQL doesn't track creation time by default
                last_modified,
            })
        } else {
            tracing::warn!(
                "[PostgresDriver] get_table_statistics - table not found: {}.{}",
                schema,
                table
            );
            Ok(super::db_driver::TableStatistics {
                row_count: None,
                table_size: None,
                index_size: None,
                total_size: None,
                created_at: None,
                last_modified: None,
            })
        }
    }
}
