// Connection operations module
mod connection_ops;
mod database_ops;
mod function_ops;
mod query_ops;
mod schema_ops;
mod table_ops;
mod view_ops;

use crate::models::entities::connection;
use crate::models::entities::sqlite_attached_db;
use crate::services::credential_service::CredentialService;
use crate::services::encryption_service::EncryptionService;
use anyhow::Result;

use sea_orm::*;
use uuid::Uuid;

use crate::services::autocomplete::SchemaCacheService;
use std::sync::Arc;

/// Service for managing database connections and executing queries.
pub struct ConnectionService {
    db: DatabaseConnection,
    encryption: EncryptionService,
    credentials: CredentialService,
    database_override: Option<String>,
    schema_cache: Option<Arc<SchemaCacheService>>,
}

impl ConnectionService {
    /// Creates a new instance of ConnectionService with encryption support.
    pub fn new(db: DatabaseConnection) -> Result<Self> {
        Ok(Self {
            db,
            encryption: EncryptionService::new()?,
            credentials: CredentialService::new(),
            database_override: None,
            schema_cache: None,
        })
    }

    pub fn with_schema_cache(mut self, schema_cache: Arc<SchemaCacheService>) -> Self {
        self.schema_cache = Some(schema_cache);
        self
    }

    pub fn with_database_override(mut self, database: Option<String>) -> Self {
        self.database_override = database;
        self
    }

    fn apply_database_override(&self, mut connection: connection::Model) -> connection::Model {
        if let Some(ref db_name) = self.database_override {
            connection.database = db_name.clone();
        }
        connection
    }

    async fn load_sqlite_attachments(
        &self,
        connection_id: Uuid,
    ) -> Result<Vec<crate::services::sqlite::SqliteAttachedDatabase>> {
        let attachments = sqlite_attached_db::Entity::find()
            .filter(sqlite_attached_db::Column::ConnectionId.eq(connection_id))
            .all(&self.db)
            .await?;

        Ok(attachments
            .into_iter()
            .map(|a| crate::services::sqlite::SqliteAttachedDatabase {
                name: a.name,
                file_path: a.file_path,
                read_only: a.read_only,
            })
            .collect())
    }

    async fn sqlite_driver(
        &self,
        connection: &connection::Model,
        password: &str,
    ) -> Result<crate::services::sqlite::SQLiteDriver> {
        let attachments = self.load_sqlite_attachments(connection.id).await?;
        crate::services::sqlite::SQLiteDriver::new_with_attachments(
            connection,
            password,
            attachments,
        )
        .await
    }
}
