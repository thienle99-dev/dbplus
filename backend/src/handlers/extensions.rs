use crate::app_state::AppState;
use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct DatabaseOverrideParams {
    #[serde(default)]
    pub database: Option<String>,
}

pub async fn list_extensions(
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<DatabaseOverrideParams>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /extensions - connection_id: {}", connection_id);
    let service = ConnectionService::new(state.db.clone())
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
    match service.list_extensions(connection_id).await {
        Ok(extensions) => {
            tracing::info!(
                "[API] GET /extensions - SUCCESS - found {} extensions",
                extensions.len()
            );
            (StatusCode::OK, Json(extensions)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /extensions - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}
