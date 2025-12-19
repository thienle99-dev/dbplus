use axum::extract::FromRef;
use dashmap::DashMap;
use sea_orm::DatabaseConnection;
use std::sync::Arc;
use tokio_util::sync::CancellationToken;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub queries: Arc<DashMap<String, CancellationToken>>,
}

impl AppState {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            queries: Arc::new(DashMap::new()),
        }
    }
}

impl FromRef<AppState> for DatabaseConnection {
    fn from_ref(app_state: &AppState) -> DatabaseConnection {
        app_state.db.clone()
    }
}
