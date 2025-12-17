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
            .with_database(&connection.database);

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
            let wrapped = format!("SELECT toJSONString(*) FROM ({})", clean_query);
            self.client
                .query(&wrapped)
                .fetch::<String>()
                .map_err(|e| anyhow::anyhow!(e))?
        } else {
            self.client
                .query(query)
                .fetch::<String>()
                .map_err(|e| anyhow::anyhow!(e))?
        };

        let mut rows = Vec::new();
        let mut columns = Vec::new();

        while let Some(row_str) = cursor.next().await.map_err(|e| anyhow::anyhow!(e))? {
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
                rows.push(vec![Value::String(row_str)]);
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
        Ok(vec![])
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
        Ok(vec![])
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
            "SELECT * FROM {}.{} LIMIT {} OFFSET {}",
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
    async fn get_table_statistics(&self, _schema: &str, _table: &str) -> Result<TableStatistics> {
        Ok(TableStatistics {
            row_count: None,
            table_size: None,
            index_size: None,
            total_size: None,
            created_at: None,
            last_modified: None,
        })
    }
    async fn get_table_indexes(&self, _schema: &str, _table: &str) -> Result<Vec<IndexInfo>> {
        Ok(vec![])
    }
    async fn get_table_triggers(&self, _schema: &str, _table: &str) -> Result<Vec<TriggerInfo>> {
        Ok(vec![])
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
    async fn get_partitions(&self, _schema: &str, _table: &str) -> Result<PartitionInfo> {
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
    async fn add_column(
        &self,
        _schema: &str,
        _table: &str,
        _column: &ColumnDefinition,
    ) -> Result<()> {
        Err(anyhow::anyhow!("Not implemented"))
    }
    async fn alter_column(
        &self,
        _schema: &str,
        _table: &str,
        _column_name: &str,
        _new_def: &ColumnDefinition,
    ) -> Result<()> {
        Err(anyhow::anyhow!("Not implemented"))
    }
    async fn drop_column(&self, _schema: &str, _table: &str, _column_name: &str) -> Result<()> {
        Err(anyhow::anyhow!("Not implemented"))
    }
}

#[async_trait]
impl ViewOperations for ClickHouseDriver {
    async fn list_views(&self, _schema: &str) -> Result<Vec<ViewInfo>> {
        Ok(vec![])
    }
    async fn get_view_definition(&self, _schema: &str, _view_name: &str) -> Result<ViewInfo> {
        Err(anyhow::anyhow!("Not implemented"))
    }
}

#[async_trait]
impl FunctionOperations for ClickHouseDriver {
    async fn list_functions(&self, _schema: &str) -> Result<Vec<FunctionInfo>> {
        Ok(vec![])
    }
    async fn get_function_definition(
        &self,
        _schema: &str,
        _function_name: &str,
    ) -> Result<FunctionInfo> {
        Err(anyhow::anyhow!("Not implemented"))
    }
}
