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

        // Fetch functions
        let functions = DatabaseDriver::list_functions(driver.as_ref(), schema_name).await?;
        for func in functions {
            models.push(schema_cache::Model {
                id: 0,
                connection_id,
                database_name: database_name.to_string(),
                schema_name: schema_name.to_string(),
                object_name: func.name.clone(),
                object_type: "function".to_string(),
                parent_name: None,
                metadata: Some(serde_json::json!({
                    "definition": func.definition,
                    "arguments": func.arguments,
                    "return_type": func.return_type,
                    "language": func.language,
                })),
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

    /// Refresh schema cache with different scopes
    pub async fn refresh(
        &self,
        connection_id: Uuid,
        database_name: &str,
        scope: RefreshScope,
        driver: Arc<dyn DatabaseDriver>,
    ) -> Result<()> {
        match scope {
            RefreshScope::All => {
                // Invalidate entire connection cache
                self.invalidate_connection(connection_id).await?;
            }
            RefreshScope::Schema(schema_name) => {
                // Invalidate specific schema
                self.invalidate_schema(connection_id, database_name, &schema_name)
                    .await?;

                // Force refresh
                self.get_schema_metadata(connection_id, database_name, &schema_name, driver, true)
                    .await?;
            }
            RefreshScope::Table {
                schema_name,
                table_name,
            } => {
                // Invalidate specific table and its columns
                self.invalidate_table(connection_id, database_name, &schema_name, &table_name)
                    .await?;
            }
        }

        Ok(())
    }

    /// Invalidate entire connection cache
    pub async fn invalidate_connection(&self, connection_id: Uuid) -> Result<()> {
        // Remove from memory cache
        self.memory_cache
            .retain(|k, _| k.connection_id != connection_id);

        // Remove from SQLite
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Invalidate specific schema
    pub async fn invalidate_schema(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
    ) -> Result<()> {
        // Remove from memory cache
        self.memory_cache.retain(|k, _| {
            !(k.connection_id == connection_id
                && k.database_name == database_name
                && k.schema_name == schema_name)
        });

        // Remove from SQLite
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .exec(&self.db)
            .await?;

        Ok(())
    }

    /// Invalidate specific table and its columns
    pub async fn invalidate_table(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
        table_name: &str,
    ) -> Result<()> {
        // Remove from SQLite (table entry and its columns)
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .filter(
                schema_cache::Column::ObjectName
                    .eq(table_name)
                    .or(schema_cache::Column::ParentName.eq(Some(table_name))),
            )
            .exec(&self.db)
            .await?;

        // Note: Memory cache stores schema-level data, so we invalidate the whole schema
        // to ensure consistency
        self.memory_cache.retain(|k, _| {
            !(k.connection_id == connection_id
                && k.database_name == database_name
                && k.schema_name == schema_name)
        });

        Ok(())
    }

    /// Detect and invalidate based on DDL statement
    pub async fn invalidate_from_ddl(
        &self,
        connection_id: Uuid,
        database_name: &str,
        sql: &str,
    ) -> Result<()> {
        let sql_upper = sql.trim().to_uppercase();

        // Check if it's a DDL statement
        if !sql_upper.starts_with("CREATE")
            && !sql_upper.starts_with("ALTER")
            && !sql_upper.starts_with("DROP")
            && !sql_upper.starts_with("TRUNCATE")
        {
            return Ok(());
        }

        // Parse DDL to extract affected objects (best effort)
        let affected = Self::parse_ddl_objects(&sql_upper);

        match affected {
            Some(DdlAffectedObject::Schema(schema_name)) => {
                self.invalidate_schema(connection_id, database_name, &schema_name)
                    .await?;
            }
            Some(DdlAffectedObject::Table {
                schema_name,
                table_name,
            }) => {
                self.invalidate_table(connection_id, database_name, &schema_name, &table_name)
                    .await?;
            }
            None => {
                // Can't determine specific object, invalidate entire connection
                self.invalidate_connection(connection_id).await?;
            }
        }

        Ok(())
    }

    pub async fn get_schema_structure(
        &self,
        connection_id: Uuid,
        database_name: &str,
        schema_name: &str,
        driver: Arc<dyn DatabaseDriver>,
    ) -> Result<Vec<crate::services::db_driver::TableMetadata>> {
        use crate::services::db_driver::TableMetadata;

        let key = CacheKey {
            connection_id,
            database_name: database_name.to_string(),
            schema_name: schema_name.to_string(),
        };

        // 1. Check in-memory cache for tables presence (freshness check)
        // If we have a timestamp for this schema in memory, use it to decide?
        // But memory cache stores `Vec<Model>`, usually tables.

        let mut use_cache = false;
        if let Some(entry) = self.memory_cache.get(&key) {
            let (_, timestamp) = entry.value();
            if Utc::now() - *timestamp < self.ttl {
                use_cache = true;
            }
        }

        // If not in memory, check DB for tables
        if !use_cache {
            let count = schema_cache::Entity::find()
                .filter(schema_cache::Column::ConnectionId.eq(connection_id))
                .filter(schema_cache::Column::DatabaseName.eq(database_name))
                .filter(schema_cache::Column::SchemaName.eq(schema_name))
                .filter(schema_cache::Column::ObjectType.is_in(vec!["base table", "view"]))
                .count(&self.db)
                .await?;

            if count > 0 {
                // We assume if tables are there, it's cached.
                // We might want to check timestamp of one record?
                // For now, assume validity if present.
                use_cache = true;
            }
        }

        if use_cache {
            // Retrieve structure from DB
            // Get all tables and views
            let tables = schema_cache::Entity::find()
                .filter(schema_cache::Column::ConnectionId.eq(connection_id))
                .filter(schema_cache::Column::DatabaseName.eq(database_name))
                .filter(schema_cache::Column::SchemaName.eq(schema_name))
                .filter(schema_cache::Column::ObjectType.is_in(vec!["base table", "view"]))
                .all(&self.db)
                .await?;

            // Get all columns for this schema
            let columns = schema_cache::Entity::find()
                .filter(schema_cache::Column::ConnectionId.eq(connection_id))
                .filter(schema_cache::Column::DatabaseName.eq(database_name))
                .filter(schema_cache::Column::SchemaName.eq(schema_name))
                .filter(schema_cache::Column::ObjectType.eq("column"))
                .all(&self.db)
                .await?;

            // Group columns by parent_name
            let mut columns_map: std::collections::HashMap<String, Vec<String>> =
                std::collections::HashMap::new();
            for col in columns {
                if let Some(parent) = col.parent_name {
                    columns_map.entry(parent).or_default().push(col.object_name);
                }
            }

            let mut result = Vec::new();
            for table in tables {
                let cols = columns_map.remove(&table.object_name).unwrap_or_default();
                result.push(TableMetadata {
                    table_name: table.object_name,
                    columns: cols,
                });
            }

            return Ok(result);
        }

        // Cache Miss: Fetch from Driver
        let metadata = DatabaseDriver::get_schema_metadata(driver.as_ref(), schema_name).await?;

        // Prepare models for saving
        let mut models = Vec::new();
        for table in &metadata {
            models.push(schema_cache::Model {
                id: 0,
                connection_id,
                database_name: database_name.to_string(),
                schema_name: schema_name.to_string(),
                object_name: table.table_name.clone(),
                object_type: "base table".to_string(), // We don't know if view? metadata usually treats them same?
                // Actually TableMetadata doesn't distinguish view/table.
                // We might default to base table or try to guess?
                // For structure view it might not matter much.
                parent_name: None,
                metadata: None,
                last_updated: Utc::now(),
            });

            for col in &table.columns {
                models.push(schema_cache::Model {
                    id: 0,
                    connection_id,
                    database_name: database_name.to_string(),
                    schema_name: schema_name.to_string(),
                    object_name: col.clone(),
                    object_type: "column".to_string(),
                    parent_name: Some(table.table_name.clone()),
                    metadata: Some(serde_json::json!({
                        "data_type": "unknown",
                        "is_nullable": true, // assume nullable
                        "is_primary_key": false,
                    })),
                    last_updated: Utc::now(),
                });
            }
        }

        // Save to DB (Clear old tables/views/columns first)
        // Delete tables/views/columns in schema
        schema_cache::Entity::delete_many()
            .filter(schema_cache::Column::ConnectionId.eq(connection_id))
            .filter(schema_cache::Column::DatabaseName.eq(database_name))
            .filter(schema_cache::Column::SchemaName.eq(schema_name))
            .filter(schema_cache::Column::ObjectType.is_in(vec!["base table", "view", "column"]))
            .exec(&self.db)
            .await?;

        if !models.is_empty() {
            // Batch insert - split if too large?
            // SQLite limit handling? SeaORM handles it usually.
            // But if many tables/cols, might need chunks.
            for chunk in models.chunks(500) {
                let active_models: Vec<schema_cache::ActiveModel> = chunk
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
            }
        }

        // Update memory cache (only with tables/views models to keep consistent with get_schema_metadata expectation)
        let table_models: Vec<schema_cache::Model> = models
            .iter()
            .filter(|m| m.object_type == "base table" || m.object_type == "view")
            .cloned()
            .collect();

        self.memory_cache.insert(key, (table_models, Utc::now()));

        Ok(metadata)
    }

    fn parse_ddl_objects(sql: &str) -> Option<DdlAffectedObject> {
        // Simple pattern matching for common DDL patterns
        // CREATE/ALTER/DROP TABLE schema.table
        // CREATE/ALTER/DROP SCHEMA schema

        let words: Vec<&str> = sql.split_whitespace().collect();
        if words.len() < 3 {
            return None;
        }

        let command = words[0]; // CREATE, ALTER, DROP, TRUNCATE
        let object_type = words[1]; // TABLE, SCHEMA, VIEW, INDEX, etc.

        match object_type {
            "SCHEMA" => {
                // CREATE SCHEMA schema_name
                if words.len() >= 3 {
                    let schema_name = words[2].trim_matches(|c| c == ';' || c == '"');
                    return Some(DdlAffectedObject::Schema(schema_name.to_lowercase()));
                }
            }
            "TABLE" | "VIEW" | "MATERIALIZED" => {
                // CREATE TABLE [schema.]table
                // DROP TABLE [schema.]table
                // TRUNCATE TABLE [schema.]table
                let table_ref = if object_type == "MATERIALIZED" && words.len() >= 4 {
                    // MATERIALIZED VIEW
                    words[3]
                } else if words.len() >= 3 {
                    words[2]
                } else {
                    return None;
                };

                let table_ref =
                    table_ref.trim_matches(|c| c == ';' || c == '"' || c == '(' || c == ')');

                if table_ref.contains('.') {
                    let parts: Vec<&str> = table_ref.split('.').collect();
                    if parts.len() == 2 {
                        return Some(DdlAffectedObject::Table {
                            schema_name: parts[0].to_lowercase(),
                            table_name: parts[1].to_lowercase(),
                        });
                    }
                } else {
                    // No schema specified, assume public
                    return Some(DdlAffectedObject::Table {
                        schema_name: "public".to_string(),
                        table_name: table_ref.to_lowercase(),
                    });
                }
            }
            _ => {}
        }

        None
    }
}

#[derive(Debug, Clone)]
pub enum RefreshScope {
    All,
    Schema(String),
    Table {
        schema_name: String,
        table_name: String,
    },
}

#[derive(Debug, Clone)]
enum DdlAffectedObject {
    Schema(String),
    Table {
        schema_name: String,
        table_name: String,
    },
}
