use dashmap::DashMap;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub queries: Arc<DashMap<String, CancellationToken>>,
    pub schema_cache: Arc<crate::services::autocomplete::SchemaCacheService>,
}

impl AppState {
    pub fn new(db: DatabaseConnection) -> Self {
        let schema_cache = Arc::new(crate::services::autocomplete::SchemaCacheService::new(
            db.clone(),
        ));
        Self {
            db,
            queries: Arc::new(DashMap::new()),
            schema_cache,
        }
    }
}

// Axum state extraction
impl axum::extract::FromRef<AppState> for DatabaseConnection {
    fn from_ref(state: &AppState) -> Self {
        state.db.clone()
    }
}

impl axum::extract::FromRef<AppState> for Arc<DashMap<String, CancellationToken>> {
    fn from_ref(state: &AppState) -> Self {
        state.queries.clone()
    }
}

impl axum::extract::FromRef<AppState> for Arc<crate::services::autocomplete::SchemaCacheService> {
    fn from_ref(state: &AppState) -> Self {
        state.schema_cache.clone()
    }
}
