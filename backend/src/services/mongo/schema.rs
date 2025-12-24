use super::connection::MongoDriver;
use crate::services::db_driver::*;
use crate::services::driver::SchemaIntrospection;
use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
impl SchemaIntrospection for MongoDriver {
    async fn get_databases(&self) -> Result<Vec<String>> {
        let databases = self.client.list_database_names().await?;
        Ok(databases)
    }

    async fn get_schemas(&self) -> Result<Vec<String>> {
        if let Some(db_name) = &self.database_name {
            Ok(vec![db_name.clone()])
        } else {
            SchemaIntrospection::get_databases(self).await
        }
    }

    async fn get_tables(&self, schema: &str) -> Result<Vec<TableInfo>> {
        let db = self.client.database(schema);
        let collections = db.list_collection_names().await?;

        Ok(collections
            .into_iter()
            .map(|name| TableInfo {
                schema: schema.to_string(),
                name,
                table_type: "COLLECTION".to_string(),
            })
            .collect())
    }

    async fn get_columns(&self, schema: &str, table: &str) -> Result<Vec<TableColumn>> {
        let db = self.client.database(schema);
        let collection = db.collection::<mongodb::bson::Document>(table);

        let mut columns = Vec::new();
        if let Some(doc) = collection.find_one(mongodb::bson::doc! {}).await? {
            for key in doc.keys() {
                columns.push(TableColumn {
                    name: key.clone(),
                    data_type: "mixed".to_string(),
                    is_nullable: true,
                    is_primary_key: key == "_id",
                    is_foreign_key: false,
                    default_value: None,
                });
            }
        }

        if columns.is_empty() {
            columns.push(TableColumn {
                name: "_id".to_string(),
                data_type: "ObjectId".to_string(),
                is_nullable: false,
                is_primary_key: true,
                is_foreign_key: false,
                default_value: None,
            });
        }

        Ok(columns)
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

    async fn get_schema_permissions(&self, _schema: &str) -> Result<Vec<TableGrant>> {
        Ok(vec![])
    }
}
