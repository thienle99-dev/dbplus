use crate::models::entities::schema_cache;
use crate::services::db_driver::DatabaseDriver;
use anyhow::Result;
use chrono::{DateTime, Duration, Utc};
use dashmap::DashMap;
use sea_orm::*;
use std::sync::Arc;
use uuid::Uuid;

#[derive(Hash, Eq, PartialEq, Clone, Debug)]
pub struct CacheKey {
    pub connection_id: Uuid,
    pub database_name: String,
    pub schema_name: String,
}

pub struct SchemaCacheService {
    db: DatabaseConnection,
    // (connection_id, database_name, schema_name) -> (List of objects, timestamp)
    memory_cache: DashMap<CacheKey, (Vec<schema_cache::Model>, DateTime<Utc>)>,
    ttl: Duration,
}

impl SchemaCacheService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            memory_cache: DashMap::new(),
            ttl: Duration::minutes(30),
        }
    }

    pub async fn get_schema_metadata(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
        driver: Arc<dyn DatabaseDriver>,
        force_refresh: bool,
    ) -> Result<Vec<schema_cache::Model>> {
        let key = CacheKey {
            connection_id,
            database_name: database_name.to_string(),
            schema_name: schema_name.to_string(),
        };

        // 1. Check in-memory cache
        if !force_refresh {
            if let Some(entry) = self.memory_cache.get(&key) {
                let (models, timestamp) = entry.value();
                if Utc::now() - *timestamp < self.ttl {
                    return Ok(models.clone());
                }
            }
        }

        // 2. Check SQLite cache
        if !force_refresh {
            let cached = schema_cache::Entity::find()
                .filter(schema_cache::Column::ConnectionId.eq(connection_id))
                .filter(schema_cache::Column::DatabaseName.eq(database_name))
                .filter(schema_cache::Column::SchemaName.eq(schema_name))
                .all(&self.db)
                .await?;

            if !cached.is_empty() {
                let last_updated = cached[0].last_updated;
                if Utc::now() - last_updated < self.ttl {
                    // Update memory cache
                    self.memory_cache
                        .insert(key.clone(), (cached.clone(), last_updated));
                    return Ok(cached);
                }
            }
        }

        // 3. Fetch from live DB (Phase A: Tables + Views)
        let tables = DatabaseDriver::get_tables(driver.as_ref(), schema_name).await?;
        let mut models = Vec::new();

        for table in tables {
            models.push(schema_cache::Model {
                id: 0,
                connection_id,
                database_name: database_name.to_string(),
                schema_name: schema_name.to_string(),
                object_name: table.name.clone(),
                object_type: table.table_type.to_lowercase(), // "base table" or "view"
                parent_name: None,
                metadata: None,
                last_updated: Utc::now(),
            });
        }

        // Save to SQLite
        self.save_to_db(connection_id, database_name, schema_name, &models)
            .await?;

        // Update memory cache
        self.memory_cache.insert(key, (models.clone(), Utc::now()));

        Ok(models)
    }

    pub async fn get_columns(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
        table_name: &str,
        driver: Arc<dyn DatabaseDriver>,
    ) -> Result<Vec<schema_cache::Model>> {
        // Check if columns are already cached
        let cached_cols = schema_cache::Entity::find()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .filter(schema_cache::Column::ParentName.eq(table_name))
            .filter(schema_cache::Column::ObjectType.eq("column"))
            .all(&self.db)
            .await?;

        if !cached_cols.is_empty() {
            let last_updated = cached_cols[0].last_updated;
            if Utc::now() - last_updated < self.ttl {
                return Ok(cached_cols);
            }
        }

        // Fetch from live DB (Phase B: Lazy columns)
        let columns = DatabaseDriver::get_columns(driver.as_ref(), schema_name, table_name).await?;
        let mut models = Vec::new();

        for col in columns {
            models.push(schema_cache::Model {
                id: 0,
                connection_id,
                database_name: database_name.to_string(),
                schema_name: schema_name.to_string(),
                object_name: col.name.clone(),
                object_type: "column".to_string(),
                parent_name: Some(table_name.to_string()),
                metadata: Some(serde_json::json!({
                    "data_type": col.data_type,
                    "is_nullable": col.is_nullable,
                    "is_primary_key": col.is_primary_key,
                })),
                last_updated: Utc::now(),
            });
        }

        // Save to SQLite (Don't delete other objects, only these columns)
        let mut active_models = Vec::new();
        for m in &models {
            active_models.push(schema_cache::ActiveModel {
                connection_id: Set(m.connection_id),
                database_name: Set(m.database_name.clone()),
                schema_name: Set(m.schema_name.clone()),
                object_name: Set(m.object_name.clone()),
                object_type: Set(m.object_type.clone()),
                parent_name: Set(m.parent_name.clone()),
                metadata: Set(m.metadata.clone()),
                last_updated: Set(m.last_updated),
                ..Default::default()
            });
        }

        // Delete old columns for this table first
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .filter(schema_cache::Column::ParentName.eq(table_name))
            .filter(schema_cache::Column::ObjectType.eq("column"))
            .exec(&self.db)
            .await?;

        if !active_models.is_empty() {
            schema_cache::Entity::insert_many(active_models)
                .exec(&self.db)
                .await?;
        }

        Ok(models)
    }

    async fn save_to_db(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
        models: &[schema_cache::Model],
    ) -> Result<()> {
        // Delete old entries for this schema (excluding columns if we want to keep them,
        // but Phase A usually refreshes the table list)
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .filter(schema_cache::Column::ObjectType.ne("column")) // Keep columns?
            // Actually, if a table is gone, its columns should be gone too.
            .exec(&self.db)
            .await?;

        if models.is_empty() {
            return Ok(());
        }

        let active_models: Vec<schema_cache::ActiveModel> = models
            .iter()
            .map(|m| schema_cache::ActiveModel {
                connection_id: Set(m.connection_id),
                database_name: Set(m.database_name.clone()),
                schema_name: Set(m.schema_name.clone()),
                object_name: Set(m.object_name.clone()),
                object_type: Set(m.object_type.clone()),
                parent_name: Set(m.parent_name.clone()),
                metadata: Set(m.metadata.clone()),
                last_updated: Set(m.last_updated),
                ..Default::default()
            })
            .collect();

        schema_cache::Entity::insert_many(active_models)
            .exec(&self.db)
            .await?;

        Ok(())
    }
}
