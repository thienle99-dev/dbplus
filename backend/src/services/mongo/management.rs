use super::connection::MongoDriver;
use super::{bson_to_json, json_to_bson_doc, json_to_bson_filter};
use crate::services::db_driver::*;
use crate::services::driver::nosql::{CollectionInfo, DocumentResult};
use crate::services::driver::{
    ColumnManagement, FunctionOperations, NoSQLOperations, TableOperations, ViewOperations,
};
use anyhow::Result;
use async_trait::async_trait;
use futures_util::StreamExt;
use mongodb::bson::{doc, Document};
use serde_json::Value;
use std::collections::HashMap;

#[async_trait]
impl TableOperations for MongoDriver {
    async fn get_table_data(
        &self,
        schema: &str,
        table: &str,
        limit: i64,
        offset: i64,
        _filter: Option<String>,
        document_id: Option<String>,
        _fields: Option<Vec<String>>,
    ) -> Result<QueryResult> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);

        let find_options = mongodb::options::FindOptions::builder()
            .limit(limit)
            .skip(offset as u64)
            .build();

        let filter = if let Some(id) = document_id {
            if let Ok(oid) = mongodb::bson::oid::ObjectId::parse_str(&id) {
                doc! { "_id": oid }
            } else {
                doc! { "_id": id }
            }
        } else {
            doc! {}
        };

        let mut cursor = collection.find(filter).with_options(find_options).await?;
        let mut documents = Vec::new();
        let mut columns_set = std::collections::HashSet::new();

        while let Some(result) = cursor.next().await {
            let doc = result?;
            for key in doc.keys() {
                columns_set.insert(key.clone());
            }
            documents.push(doc);
        }

        let mut columns: Vec<String> = columns_set.into_iter().collect();
        columns.sort();

        if let Some(pos) = columns.iter().position(|c| c == "_id") {
            columns.remove(pos);
            columns.insert(0, "_id".to_string());
        }

        let mut rows = Vec::new();
        for doc in documents {
            let mut row = Vec::new();
            for col in &columns {
                let val = if let Some(bson_val) = doc.get(col) {
                    bson_to_json(bson_val)
                } else {
                    Value::Null
                };
                row.push(val);
            }
            rows.push(row);
        }

        Ok(QueryResult {
            columns,
            rows,
            affected_rows: 0,
            column_metadata: None,
            total_count: None,
            limit: Some(limit),
            offset: Some(offset),
            has_more: None,
            row_metadata: None,
            execution_time_ms: None,
            json: None,
            display_mode: Some("table".to_string()),
        })
    }

    async fn create_table(&self, schema: &str, table: &str) -> Result<()> {
        let db = self.client.database(schema);
        db.create_collection(table).await?;
        Ok(())
    }

    async fn drop_table(&self, schema: &str, table: &str) -> Result<()> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);
        collection.drop().await?;
        Ok(())
    }

    async fn get_table_constraints(&self, _schema: &str, _table: &str) -> Result<TableConstraints> {
        Ok(TableConstraints {
            foreign_keys: vec![],
            check_constraints: vec![],
            unique_constraints: vec![],
        })
    }

    async fn get_table_statistics(&self, schema: &str, table: &str) -> Result<TableStatistics> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);
        let count = collection.estimated_document_count().await?;

        Ok(TableStatistics {
            row_count: Some(count as i64),
            table_size: None,
            index_size: None,
            total_size: None,
            created_at: None,
            last_modified: None,
        })
    }

    async fn update_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &HashMap<String, Value>,
        updates: &HashMap<String, Value>,
        _row_metadata: Option<&HashMap<String, Value>>,
    ) -> Result<u64> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);

        let filter = json_to_bson_filter(primary_key);
        let update_doc = doc! { "$set": json_to_bson_doc(updates) };

        let result = collection.update_one(filter, update_doc).await?;
        Ok(result.modified_count)
    }

    async fn delete_row(
        &self,
        schema: &str,
        table: &str,
        primary_key: &HashMap<String, Value>,
        _row_metadata: Option<&HashMap<String, Value>>,
    ) -> Result<u64> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);

        let filter = json_to_bson_filter(primary_key);

        let result = collection.delete_one(filter).await?;
        Ok(result.deleted_count)
    }

    async fn get_table_indexes(&self, schema: &str, table: &str) -> Result<Vec<IndexInfo>> {
        let db = self.client.database(schema);
        let collection = db.collection::<Document>(table);
        let mut cursor = collection.list_indexes().await?;

        let mut indexes = Vec::new();
        while let Some(result) = cursor.next().await {
            let index = result?;
            let name = index
                .options
                .as_ref()
                .and_then(|o| o.name.clone())
                .unwrap_or_else(|| "unknown".to_string());
            let columns = index.keys.keys().cloned().collect();

            indexes.push(IndexInfo {
                name: name.clone(),
                columns,
                is_unique: index
                    .options
                    .as_ref()
                    .and_then(|o| o.unique)
                    .unwrap_or(false),
                is_primary: name == "_id_",
                algorithm: "btree".to_string(),
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
}

#[async_trait]
impl NoSQLOperations for MongoDriver {
    async fn list_collections(&self, database: &str) -> Result<Vec<CollectionInfo>> {
        let db = self.client.database(database);
        let mut collections = Vec::new();
        let names = db.list_collection_names().await?;

        for name in names {
            collections.push(CollectionInfo {
                name,
                count: None,
                size: None,
            });
        }
        Ok(collections)
    }

    async fn get_collection_data(
        &self,
        database: &str,
        collection: &str,
        limit: i64,
        offset: i64,
    ) -> Result<DocumentResult> {
        let res = TableOperations::get_table_data(
            self, database, collection, limit, offset, None, None, None,
        )
        .await?;

        let mut docs = Vec::new();
        for row in res.rows {
            let mut obj = serde_json::Map::new();
            for (i, col) in res.columns.iter().enumerate() {
                obj.insert(col.clone(), row[i].clone());
            }
            docs.push(Value::Object(obj));
        }

        Ok(DocumentResult {
            documents: docs,
            total: None,
        })
    }

    async fn get_collection_count(&self, database: &str, collection: &str) -> Result<u64> {
        let db = self.client.database(database);
        let coll = db.collection::<Document>(collection);
        let count = coll.estimated_document_count().await?;
        Ok(count)
    }
}

#[async_trait]
impl ColumnManagement for MongoDriver {
    async fn add_column(
        &self,
        _schema: &str,
        _table: &str,
        _column: &ColumnDefinition,
    ) -> Result<()> {
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
        Ok(())
    }
}

#[async_trait]
impl ViewOperations for MongoDriver {
    async fn list_views(&self, _schema: &str) -> Result<Vec<ViewInfo>> {
        Ok(vec![])
    }
    async fn get_view_definition(&self, _schema: &str, _view_name: &str) -> Result<ViewInfo> {
        Err(anyhow::anyhow!("Views not supported for MongoDB"))
    }
}

#[async_trait]
impl FunctionOperations for MongoDriver {
    async fn list_functions(&self, _schema: &str) -> Result<Vec<FunctionInfo>> {
        Ok(vec![])
    }
    async fn get_function_definition(
        &self,
        _schema: &str,
        _function_name: &str,
    ) -> Result<FunctionInfo> {
        Err(anyhow::anyhow!("Functions not supported for MongoDB"))
    }
}

#[async_trait]

impl crate::services::driver::extension::DatabaseManagementDriver for MongoDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        let db = self.client.database(name);
        db.create_collection("__init__").await?;
        Ok(())
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let db = self.client.database(name);
        db.drop().await?;
        Ok(())
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        self.create_database(name).await
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        self.drop_database(name).await
    }

    async fn install_extension(
        &self,
        _name: &str,
        _schema: Option<&str>,
        _version: Option<&str>,
    ) -> Result<()> {
        Err(anyhow::anyhow!(
            "MongoDB does not support extensions via this API"
        ))
    }

    async fn drop_extension(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "MongoDB does not support extensions via this API"
        ))
    }
}
