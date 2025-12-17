use super::db_driver::{
    ColumnDefinition, ExtensionInfo, FunctionInfo, IndexInfo, PartitionInfo, QueryResult, RoleInfo,
    SchemaForeignKey, SearchResult, StorageBloatInfo, TableColumn, TableComment, TableConstraints,
    TableDependencies, TableGrant, TableInfo, TableMetadata, TableStatistics, TriggerInfo,
    ViewInfo,
};
use super::driver::{
    ColumnManagement, ConnectionDriver, FunctionOperations, QueryDriver, SchemaIntrospection,
    TableOperations, ViewOperations,
};
use crate::models::entities::connection as ConnectionModel;
use anyhow::Result;
use async_trait::async_trait;
use clickhouse::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;

pub struct ClickHouseDriver {
    client: Client,
    database: String,
}

impl ClickHouseDriver {
    pub async fn new(connection: &ConnectionModel::Model, password: &str) -> Result<Self> {
        let url = if connection.ssl {
            format!("https://{}:{}", connection.host, connection.port)
        } else {
            format!("http://{}:{}", connection.host, connection.port)
        };

        let client = Client::default()
            .with_url(url)
            .with_user(&connection.username)
            .with_password(password)
            .with_database(if connection.database.is_empty() {
                "default"
            } else {
                &connection.database
            });

        Ok(Self {
            client,
            database: connection.database.clone(),
        })
    }
}

#[async_trait]
impl ConnectionDriver for ClickHouseDriver {
    async fn test_connection(&self) -> Result<()> {
        let _ = self
            .client
            .query("SELECT 1")
            .fetch_one::<u8>()
            .await
            .map_err(|e| anyhow::anyhow!(e))?;
        Ok(())
    }
}

#[async_trait]
impl QueryDriver for ClickHouseDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        self.client
            .query(query)
            .execute()
            .await
            .map_err(|e| anyhow::anyhow!(e))?;
        Ok(0)
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        self.execute(script).await
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let trimmed = query.trim();
        let q_upper = trimmed.to_uppercase();

        let is_select = q_upper.starts_with("SELECT") || q_upper.starts_with("WITH");

        let mut cursor = if is_select {
            let clean_query = trimmed.trim_end_matches(';');
            // Wrap in subquery with alias to be safe and handle limits/offsets correctly
            // Use formatRow('JSONEachRow', *) to serialize the entire row as a JSON object string
            let wrapped = format!(
                "SELECT formatRow('JSONEachRow', *) FROM ({}) AS _data",
                clean_query
            );
            self.client
                .query(&wrapped)
                .fetch::<Vec<u8>>()
                .map_err(|e| anyhow::anyhow!(e))?
        } else {
            self.client
                .query(query)
                .fetch::<Vec<u8>>()
                .map_err(|e| anyhow::anyhow!(e))?
        };

        let mut rows = Vec::new();
        let mut columns = Vec::new();

        while let Some(row_bytes) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            let row_str = String::from_utf8_lossy(&row_bytes);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&row_str) {
                if let Some(obj) = val.as_object() {
                    if columns.is_empty() {
                        columns = obj.keys().cloned().collect();
                    }
                    let mut row_values = Vec::new();
                    for col in &columns {
                        row_values.push(obj.get(col).cloned().unwrap_or(Value::Null));
                    }
                    rows.push(row_values);
                } else {
                    if columns.is_empty() {
                        columns = vec!["Result".to_string()];
                    }
                    rows.push(vec![val]);
                }
            } else {
                if columns.is_empty() {
                    columns = vec!["Result".to_string()];
                }
                rows.push(vec![Value::String(row_str.to_string())]);
            }
        }

        Ok(QueryResult {
            columns,
            rows,
            affected_rows: 0,
            column_metadata: None,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
        })
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        self.query(query).await
    }

    async fn explain(&self, query: &str, _analyze: bool) -> Result<Value> {
        let explain_query = format!("EXPLAIN JSON {}", query);
        // Explain in CH usually returns a string or structured output depending on settings.
        // Assuming we can just get the result.
        let result = self.query(&explain_query).await?;
        if let Some(row) = result.rows.first() {
            if let Some(val) = row.first() {
                if let Some(s) = val.as_str() {
                    if let Ok(json) = serde_json::from_str(s) {
                        return Ok(json);
                    }
                    return Ok(Value::String(s.to_string()));
                }
            }
        }
        Ok(Value::Null)
    }
}

#[async_trait]
impl SchemaIntrospection for ClickHouseDriver {
    async fn get_databases(&self) -> Result<Vec<String>> {
        let mut cursor = self
            .client
            .query("SELECT name FROM system.databases")
            .fetch::<String>()
            .map_err(|e| anyhow::anyhow!(e))?;
        let mut dbs = Vec::new();
        while let Some(name) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            dbs.push(name);
        }
        Ok(dbs)
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        // ClickHouse maps databases to schemas concepts somewhat, but we treat them as databases.
        self.get_databases().await
    }

    async fn get_tables(&self, _schema: &str) -> Result<Vec<TableInfo>> {
        // schema argument here is treated as database for CH or ignored if using connection DB?
        // Usually schema in this context means 'public' etc in PG.
        // For CH, it might mean the database name.
        let db = if _schema.is_empty() {
            &self.database
        } else {
            _schema
        };

        let query = format!(
            "SELECT name, engine FROM system.tables WHERE database = '{}'",
            db
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct TableRow {
            name: String,
            engine: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<TableRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        let mut tables = Vec::new();
        while let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            tables.push(TableInfo {
                schema: db.to_string(),
                name: row.name,
                table_type: if row.engine.contains("View") {
                    "VIEW".to_string()
                } else {
                    "BASE TABLE".to_string()
                },
            });
        }
        Ok(tables)
    }

    async fn get_columns(&self, _schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        let db = if _schema.is_empty() {
            &self.database
        } else {
            _schema
        };

        let query = format!("SELECT name, type, default_expression FROM system.columns WHERE database = '{}' AND table = '{}'", db, table);

        #[derive(Deserialize, clickhouse::Row)]
        struct ColRow {
            name: String,
            r#type: String, // clickhouse crate maps "type" to r#type
            default_expression: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<ColRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        let mut cols = Vec::new();
        while let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            cols.push(TableColumn {
                name: row.name,
                data_type: row.r#type.clone(),
                is_nullable: row.r#type.starts_with("Nullable("),
                is_primary_key: false,
                default_value: if row.default_expression.is_empty() {
                    None
                } else {
                    Some(row.default_expression)
                },
            });
        }
        Ok(cols)
    }

    async fn get_schema_metadata(&self, _schema: &str) -> Result<Vec<TableMetadata>> {
        let db = if _schema.is_empty() {
            &self.database
        } else {
            _schema
        };

        let query = format!(
            "SELECT table, name FROM system.columns WHERE database = '{}' ORDER BY table, position",
            db
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct MetaRow {
            table: String,
            name: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<MetaRow>()
            .map_err(|e| anyhow::anyhow!(e))?;

        let mut current_table = String::new();
        let mut current_columns = Vec::new();
        let mut result = Vec::new();

        while let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            if row.table != current_table {
                if !current_table.is_empty() {
                    result.push(TableMetadata {
                        table_name: current_table.clone(),
                        columns: current_columns.clone(),
                    });
                }
                current_table = row.table;
                current_columns = Vec::new();
            }
            current_columns.push(row.name);
        }

        if !current_table.is_empty() {
            result.push(TableMetadata {
                table_name: current_table,
                columns: current_columns,
            });
        }

        Ok(result)
    }
    async fn search_objects(&self, _query: &str) -> Result<Vec<SearchResult>> {
        Ok(vec![])
    }
    async fn get_schema_foreign_keys(&self, _schema: &str) -> Result<Vec<SchemaForeignKey>> {
        Ok(vec![])
    }
    async fn get_extensions(&self) -> Result<Vec<ExtensionInfo>> {
        Ok(vec![])
    }
}

#[async_trait]
impl TableOperations for ClickHouseDriver {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
    ) -> Result<QueryResult> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };
        let sql = format!(
            "SELECT * FROM `{}`.`{}` LIMIT {} OFFSET {}",
            db, table, limit, offset
        );
        self.query(&sql).await
    }

    async fn get_table_constraints(&self, _schema: &str, _table: &str) -> Result<TableConstraints> {
        Ok(TableConstraints {
            foreign_keys: vec![],
            check_constraints: vec![],
            unique_constraints: vec![],
        })
    }
    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        let query = format!(
            "SELECT total_rows, total_bytes, metadata_modification_time FROM system.tables WHERE database = '{}' AND name = '{}'",
            db, table
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct StatsRow {
            total_rows: Option<u64>,
            total_bytes: Option<u64>,
            metadata_modification_time: Option<i64>, // specialized datetime handling might be needed, using i64 (epoch) if consistent? actually CH returns DateTime
        }
        // Actually DateTime in CH maps to u32 (epoch) usually, or string?
        // Let's use `u64` for numbers. For time, let's fetch as String or just ignore for strictness?
        // Let's safe fetch time as generic or just use u32 which is standard unix time in CH (unless DateTime64).
        // To be safe, let's use String for time.

        #[derive(Deserialize, clickhouse::Row)]
        struct StatsRowSafe {
            total_rows: Option<u64>,
            total_bytes: Option<u64>,
            // we skip time to avoid parsing issues for now, or use String if we cast in query
        }

        // We'll cast time to string in query to be safe
        let query = format!(
            "SELECT total_rows, total_bytes, toString(metadata_modification_time) FROM system.tables WHERE database = '{}' AND name = '{}'",
            db, table
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct StatsRowString {
            total_rows: Option<u64>,
            total_bytes: Option<u64>,
            mod_time: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<StatsRowString>()
            .map_err(|e| anyhow::anyhow!(e))?;

        if let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            Ok(TableStatistics {
                row_count: row.total_rows.map(|v| v as i64),
                table_size: row.total_bytes.map(|v| v as i64),
                index_size: None,
                total_size: row.total_bytes.map(|v| v as i64),
                created_at: None,
                last_modified: Some(row.mod_time),
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
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };
        let mut indexes = Vec::new();

        // 1. Primary Key from system.tables
        let pk_query = format!(
            "SELECT primary_key FROM system.tables WHERE database = '{}' AND name = '{}'",
            db, table
        );
        #[derive(Deserialize, clickhouse::Row)]
        struct PkRow {
            primary_key: String,
        }

        let mut cursor_pk = self
            .client
            .query(&pk_query)
            .fetch::<PkRow>()
            .map_err(|e| anyhow::anyhow!(e))?;

        if let Some(row) = cursor_pk.next().await.map_err(|e| anyhow::anyhow!(e))? {
            if !row.primary_key.is_empty() {
                // Parse comma separated keys, arguably they are just one tuple key.
                // But generally users verify columns.
                indexes.push(IndexInfo {
                    name: "PRIMARY".to_string(),
                    columns: vec![row.primary_key], // It's an expression usually, but typically list of columns
                    is_unique: false,               // ClickHouse PKs are not unique! (Sorting keys)
                    is_primary: true,
                    algorithm: "Sparse".to_string(),
                    condition: None,
                    include: None,
                    comment: None,
                });
            }
        }

        // 2. Data Skipping Indices
        let idx_query = format!(
            "SELECT name, type, expr FROM system.data_skipping_indices WHERE database = '{}' AND table = '{}'",
            db, table
        );
        #[derive(Deserialize, clickhouse::Row)]
        struct IdxRow {
            name: String,
            r#type: String,
            expr: String,
        }

        let mut cursor_idx = self
            .client
            .query(&idx_query)
            .fetch::<IdxRow>()
            .map_err(|e| anyhow::anyhow!(e))?;

        while let Some(row) = cursor_idx.next().await.map_err(|e| anyhow::anyhow!(e))? {
            indexes.push(IndexInfo {
                name: row.name,
                columns: vec![row.expr],
                is_unique: false,
                is_primary: false,
                algorithm: row.r#type,
                condition: None,
                include: None,
                comment: None,
            });
        }

        Ok(indexes)
    }
    async fn get_table_triggers(&self, _schema: &str, _table: &str) -> Result<Vec<TriggerInfo>> {
        Ok(vec![])
    }
    async fn get_table_comment(&self, schema: &str, table: &str) -> Result<TableComment> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        let query = format!(
            "SELECT comment FROM system.tables WHERE database = '{}' AND name = '{}'",
            db, table
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct CommentRow {
            comment: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<CommentRow>()
            .map_err(|e| anyhow::anyhow!(e))?;

        if let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            Ok(TableComment {
                comment: if row.comment.is_empty() {
                    None
                } else {
                    Some(row.comment)
                },
            })
        } else {
            Ok(TableComment { comment: None })
        }
    }
    async fn set_table_comment(
        &self,
        schema: &str,
        table: &str,
        comment: Option<String>,
    ) -> Result<()> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };
        if let Some(c) = comment {
            let sql = format!(
                "ALTER TABLE {}.{} MODIFY COMMENT '{}'",
                db,
                table,
                c.replace("'", "\\'")
            );
            self.execute(&sql).await?;
        }
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
    async fn get_partitions(&self, schema: &str, table: &str) -> Result<PartitionInfo> {
        // Basic implementation using system.parts
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        let query = format!(
            "SELECT partition, name, bytes FROM system.parts WHERE database = '{}' AND table = '{}' AND active = 1",
            db, table
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct PartRow {
            partition: String,
            name: String,
            bytes: u64,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<PartRow>()
            .map_err(|e| anyhow::anyhow!(e))?;

        // Aggregate unique partitions?
        // Let's just return empty for safety for now as agreed before
        Ok(PartitionInfo {
            is_partitioned: false,
            strategy: None,
            key: None,
            partitions: vec![],
        })
    }
}

#[async_trait]
impl ColumnManagement for ClickHouseDriver {
    async fn add_column(&self, schema: &str, table: &str, column: &ColumnDefinition) -> Result<()> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };
        let default_clause = if let Some(d) = &column.default_value {
            format!(" DEFAULT {}", d)
        } else {
            "".to_string()
        };

        // No easy way to handle is_nullable logic here without parsing type string.
        // We assume column.data_type is correct (e.g. "Nullable(String)")

        let sql = format!(
            "ALTER TABLE {}.{} ADD COLUMN {} {} {}",
            db, table, column.name, column.data_type, default_clause
        );
        self.execute(&sql).await?;
        Ok(())
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        // 1. Rename if needed
        if column_name != new_def.name {
            let sql = format!(
                "ALTER TABLE {}.{} RENAME COLUMN {} TO {}",
                db, table, column_name, new_def.name
            );
            self.execute(&sql).await?;
        }

        // 2. Modify type/default
        let default_clause = if let Some(d) = &new_def.default_value {
            format!(" DEFAULT {}", d)
        } else {
            "".to_string()
        };

        let target_name = &new_def.name;
        let sql = format!(
            "ALTER TABLE {}.{} MODIFY COLUMN {} {} {}",
            db, table, target_name, new_def.data_type, default_clause
        );
        self.execute(&sql).await?;
        Ok(())
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };
        let sql = format!("ALTER TABLE {}.{} DROP COLUMN {}", db, table, column_name);
        self.execute(&sql).await?;
        Ok(())
    }
}

#[async_trait]
impl ViewOperations for ClickHouseDriver {
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        let query = format!(
            "SELECT name, create_table_query FROM system.tables WHERE database = '{}' AND engine LIKE '%View%'",
            db
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct ViewRow {
            name: String,
            create_table_query: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<ViewRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        let mut views = Vec::new();
        while let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            views.push(ViewInfo {
                schema: db.to_string(),
                name: row.name,
                definition: row.create_table_query,
                owner: None,
                created_at: None,
            });
        }
        Ok(views)
    }
    async fn get_view_definition(&self, schema: &str, view_name: &str) -> Result<ViewInfo> {
        let db = if schema.is_empty() {
            &self.database
        } else {
            schema
        };

        let query = format!(
            "SELECT name, create_table_query FROM system.tables WHERE database = '{}' AND name = '{}'",
            db, view_name
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct ViewRow {
            name: String,
            create_table_query: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<ViewRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        if let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            Ok(ViewInfo {
                schema: db.to_string(),
                name: row.name,
                definition: row.create_table_query,
                owner: None,
                created_at: None,
            })
        } else {
            Err(anyhow::anyhow!("View not found"))
        }
    }
}

#[async_trait]
impl FunctionOperations for ClickHouseDriver {
    async fn list_functions(&self, _schema: &str) -> Result<Vec<FunctionInfo>> {
        let query = "SELECT name, create_query FROM system.functions WHERE origin = 'System'";
        #[derive(Deserialize, clickhouse::Row)]
        struct FuncRow {
            name: String,
            create_query: String,
        }
        let mut cursor = self
            .client
            .query(query)
            .fetch::<FuncRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        let mut funcs = Vec::new();
        while let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            funcs.push(FunctionInfo {
                schema: "system".to_string(),
                name: row.name,
                definition: row.create_query,
                language: None,
                return_type: None,
                arguments: None,
                owner: None,
            });
        }
        Ok(funcs)
    }
    async fn get_function_definition(
        &self,
        _schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo> {
        let query = format!(
            "SELECT name, create_query FROM system.functions WHERE name = '{}'",
            function_name
        );

        #[derive(Deserialize, clickhouse::Row)]
        struct FuncRow {
            name: String,
            create_query: String,
        }

        let mut cursor = self
            .client
            .query(&query)
            .fetch::<FuncRow>()
            .map_err(|e| anyhow::anyhow!(e))?;
        if let Some(row) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
            Ok(FunctionInfo {
                schema: "system".to_string(),
                name: row.name,
                definition: row.create_query,
                language: None,
                return_type: None,
                arguments: None,
                owner: None,
            })
        } else {
            Err(anyhow::anyhow!("Function not found"))
        }
    }
}
