use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use serde::Deserialize;
use crate::services::history_service::HistoryService;

#[derive(Deserialize)]
pub struct HistoryParams {
    limit: Option<u64>,
}

pub async fn list_history(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<HistoryParams>,
) -> impl IntoResponse {
    let service = HistoryService::new(db);
    let limit = params.limit.unwrap_or(50);
    
    match service.get_history(connection_id, limit).await {
        Ok(history) => (StatusCode::OK, Json(history)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn clear_history(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let service = HistoryService::new(db);
    match service.clear_history(connection_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
