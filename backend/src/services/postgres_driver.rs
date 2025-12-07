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
        let mut cfg = Config::new();
        cfg.host = Some(connection.host.clone());
        cfg.port = Some(connection.port as u16);
        cfg.dbname = Some(connection.database.clone());
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
                
                if error_lower.contains("connection refused") || error_lower.contains("could not connect") {
                    Err(anyhow::anyhow!(
                        "Connection refused. Please check if PostgreSQL is running on {}:{}",
                        connection.host,
                        connection.port
                    ))
                } else if error_lower.contains("password authentication failed") || error_lower.contains("authentication failed") {
                    Err(anyhow::anyhow!("Authentication failed. Please check your username and password."))
                } else if error_lower.contains("timeout") {
                    Err(anyhow::anyhow!("Connection timeout. Please check your network connection and firewall settings."))
                } else {
                    Err(anyhow::anyhow!("Failed to connect to PostgreSQL server: {}", error_msg))
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
            client.execute(&create_query, &[]).await
                .with_context(|| format!("Failed to create database '{}'. Make sure you have the necessary privileges.", db_name))?;
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
        let client = self.pool.get().await?;
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
        // Note: This is vulnerable to SQL injection if schema/table are not validated.
        // In a real app, we should use quote_identifier or similar.
        // For now, we assume internal use or trusted input, but we should be careful.
        // tokio-postgres doesn't support dynamic table names in parameters easily.
        // We'll do simple sanitization by ensuring no spaces or semicolons for now.

        if schema.contains(';')
            || table.contains(';')
            || schema.contains(' ')
            || table.contains(' ')
        {
            return Err(anyhow::anyhow!("Invalid schema or table name"));
        }

        let query = format!(
            "SELECT * FROM \"{}\".\"{}\" LIMIT $1 OFFSET $2",
            schema, table
        );

        let client = self.pool.get().await?;
        let rows = client.query(&query, &[&limit, &offset]).await?;

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
}
