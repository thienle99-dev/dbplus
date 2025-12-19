use axum::extract::FromRef;
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

impl FromRef<AppState> for DatabaseConnection {
    fn from_ref(app_state: &AppState) -> DatabaseConnection {
        app_state.db.clone()
    }
}
