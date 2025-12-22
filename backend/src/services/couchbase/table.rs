use super::connection::CouchbaseDriver;
use crate::services::db_driver::*;
use crate::services::driver::{
    ColumnManagement, FunctionOperations, QueryDriver, TableOperations, ViewOperations,
};
use anyhow::Result;
use async_trait::async_trait;
use couchbase::options::kv_options::{MutateInOptions, RemoveOptions};
use couchbase::subdoc::mutate_in_specs::MutateInSpec;
use serde_json::Value;
use std::collections::HashMap;

#[async_trait]
impl TableOperations for CouchbaseDriver {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
        filter: Option<String>,
        document_id: Option<String>,
        fields: Option<Vec<String>>,
    ) -> Result<QueryResult> {
        let bucket = self.bucket_name.as_deref().unwrap_or("default");

        let select_clause = if let Some(f) = &fields {
            if f.is_empty() {
                "meta().id as _id, t.*, meta().cas as _cas, meta().expiration as _expiry, meta().flags as _flags".to_string()
            } else {
                // Ensure _id is always included for Couchbase
                let mut f_with_meta = f.clone();
                if !f_with_meta.contains(&"_id".to_string()) {
                    f_with_meta.insert(0, "meta().id as _id".to_string());
                }
                f_with_meta.push("meta().cas as _cas".to_string());
                f_with_meta.push("meta().expiration as _expiry".to_string());
                f_with_meta.push("meta().flags as _flags".to_string());
                f_with_meta.join(", ")
            }
        } else {
            "meta().id as _id, t.*, meta().cas as _cas, meta().expiration as _expiry, meta().flags as _flags".to_string()
        };

        let mut query = if let Some(id) = document_id {
            if id.trim().is_empty() {
                format!(
                    "SELECT {} FROM `{}`.`{}`.`{}` t",
                    select_clause, bucket, schema, table
                )
            } else {
                format!(
                    "SELECT {} FROM `{}`.`{}`.`{}` t USE KEYS '{}'",
                    select_clause,
                    bucket,
                    schema,
                    table,
                    id.replace("'", "''")
                )
            }
        } else {
            format!(
                "SELECT {} FROM `{}`.`{}`.`{}` t",
                select_clause, bucket, schema, table
            )
        };

        if let Some(f) = filter {
            if !f.trim().is_empty() {
                query.push_str(" WHERE ");
                query.push_str(&f);
            }
        }

        query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

        QueryDriver::execute_query(self, &query).await
    }

    async fn get_table_constraints(&self, _schema: &str, _table: &str) -> Result<TableConstraints> {
        Ok(TableConstraints {
            foreign_keys: vec![],
            check_constraints: vec![],
            unique_constraints: vec![],
        })
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        let bucket = self.bucket_name.as_deref().unwrap_or("default");
        let query = format!(
            "SELECT count(*) as count FROM `{}`.`{}`.`{}`",
            bucket, schema, table
        );

        let result = crate::services::driver::QueryDriver::execute_query(self, &query).await?;

        let mut row_count = None;
        if let Some(first_row) = result.rows.first() {
            if let Some(val) = first_row.first() {
                row_count = val.as_i64();
            }
        }

        Ok(TableStatistics {
            row_count,
            table_size: None,
            index_size: None,
            total_size: None,
            created_at: None,
            last_modified: None,
        })
    }

    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>> {
        let bucket = self.bucket_name.as_deref().unwrap_or("default");
        // Query system:indexes
        // Filter by bucket, scope (schema), collection (table)
        // Need to pass raw N1QL query to extract index info
        let query = format!(
            "SELECT name, is_primary, index_key FROM system:indexes WHERE bucket_id = '{}' AND scope_id = '{}' AND keyspace_id = '{}'",
            bucket, schema, table
        );

        // Execute query via driver
        let result = crate::services::driver::QueryDriver::execute_query(self, &query).await?;

        let mut indexes = Vec::new();
        for row in result.rows {
            // Rows are [[name, is_primary, index_key], ...] if columns are ordered, or objects
            // The execute_query implementation returns rows as Vec<Vec<Value>> if columns are detected,
            // but for system:indexes it might be cleaner to parse keys.
            // Let's assume we can map manual indices or use the column names from result

            // row[0] -> name, row[1] -> is_primary, row[2] -> index_key
            // But safely:
            let mut name = String::new();
            let mut is_primary = false;
            let mut columns = Vec::new();

            // Helper to find value by column name index
            let get_val =
                |col_name: &str, row_vals: &[serde_json::Value]| -> Option<serde_json::Value> {
                    if let Some(idx) = result.columns.iter().position(|c| c == col_name) {
                        row_vals.get(idx).cloned()
                    } else {
                        None
                    }
                };

            if let Some(val) = get_val("name", &row) {
                name = val.as_str().unwrap_or("").to_string();
            }
            if let Some(val) = get_val("is_primary", &row) {
                is_primary = val.as_bool().unwrap_or(false);
            }
            if let Some(val) = get_val("index_key", &row) {
                if let Some(arr) = val.as_array() {
                    for k in arr {
                        if let Some(s) = k.as_str() {
                            columns.push(s.to_string());
                        }
                    }
                }
            }

            indexes.push(IndexInfo {
                name,
                columns,
                is_unique: false, // system:indexes doesn't easily expose this in simple query?
                is_primary,
                algorithm: "GSI".to_string(),
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

    async fn update_row(
        &self,
        _schema: &str,
        _table: &str,
        primary_key: &std::collections::HashMap<String, Value>,
        updates: &std::collections::HashMap<String, Value>,
        row_metadata: Option<&std::collections::HashMap<String, Value>>,
    ) -> Result<u64> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let id = primary_key
            .get("_id")
            .or_else(|| primary_key.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing _id in primary_key"))?;

        let bucket = self.cluster.bucket(bucket_name);
        let scope = bucket.scope(_schema);
        let collection = scope.collection(_table);

        let cas: Option<u64> = if let Some(meta) = row_metadata {
            meta.get("_cas").and_then(|v| {
                if let Value::Number(n) = v {
                    n.as_u64()
                } else if let Value::String(s) = v {
                    s.parse().ok()
                } else {
                    None
                }
            })
        } else {
            None
        };

        let mut specs = vec![];
        for (k, v) in updates {
            specs.push(MutateInSpec::upsert(k, v, None)?);
        }

        if specs.is_empty() {
            return Ok(0);
        }

        let mut options = MutateInOptions::default();
        if let Some(c) = cas {
            options = options.cas(c);
        }

        match collection.mutate_in(id, &specs, options).await {
            Ok(_) => Ok(1),
            Err(e) => Err(anyhow::anyhow!("Update failed: {}", e)),
        }
    }

    async fn delete_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &std::collections::HashMap<String, Value>,
        row_metadata: Option<&std::collections::HashMap<String, Value>>,
    ) -> Result<u64> {
        let bucket_name = self.bucket_name.as_deref().unwrap_or("default");
        let id = primary_key
            .get("_id")
            .or_else(|| primary_key.get("id"))
            .and_then(|v| v.as_str())
            .ok_or_else(|| anyhow::anyhow!("Missing _id in primary_key"))?;

        let bucket = self.cluster.bucket(bucket_name);
        let scope = bucket.scope(schema);
        let collection = scope.collection(table);

        let cas: Option<u64> = if let Some(meta) = row_metadata {
            meta.get("_cas").and_then(|v| {
                if let Value::Number(n) = v {
                    n.as_u64()
                } else if let Value::String(s) = v {
                    s.parse().ok()
                } else {
                    None
                }
            })
        } else {
            None
        };

        let mut options = RemoveOptions::default();
        if let Some(c) = cas {
            options = options.cas(c);
        }

        match collection.remove(id, options).await {
            Ok(_) => Ok(1),
            Err(e) => Err(anyhow::anyhow!("Delete failed: {}", e)),
        }
    }
}

#[async_trait]
impl ColumnManagement for CouchbaseDriver {
    async fn add_column(
        &self,
        _schema: &str,
        _table: &str,
        _column: &ColumnDefinition,
    ) -> Result<()> {
        // Schemaless, maybe just update a doc? or no-op
        Ok(())
    }

    async fn alter_column(
        &self,
        _schema: &str,
        _table: &str,
        _column_name: &str,
        _new_def: &ColumnDefinition,
    ) -> Result<()> {
        Ok(())
    }

    async fn drop_column(&self, _schema: &str, _table: &str, _column_name: &str) -> Result<()> {
        Ok(()) // Best effort logic could UPDATE ... UNSET field
    }
}

#[async_trait]
impl ViewOperations for CouchbaseDriver {
    async fn list_views(&self, _schema: &str) -> Result<Vec<ViewInfo>> {
        Ok(vec![])
    }

    async fn get_view_definition(&self, _schema: &str, _view_name: &str) -> Result<ViewInfo> {
        Err(anyhow::anyhow!("Views not supported"))
    }
}

#[async_trait]
impl FunctionOperations for CouchbaseDriver {
    async fn list_functions(&self, _schema: &str) -> Result<Vec<FunctionInfo>> {
        Ok(vec![])
    }

    async fn get_function_definition(
        &self,
        _schema: &str,
        _function_name: &str,
    ) -> Result<FunctionInfo> {
        Err(anyhow::anyhow!("Functions not supported"))
    }
}
