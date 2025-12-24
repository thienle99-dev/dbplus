use crate::app_state::AppState;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::entities::query_history;
use crate::services::history_service::HistoryService;

#[derive(Debug, Deserialize)]
pub struct GetHistoryQuery {
    #[serde(default = "default_limit")]
    limit: u64,
}

fn default_limit() -> u64 {
    100
}

#[derive(Debug, Serialize)]
pub struct HistoryResponse {
    pub history: Vec<query_history::Model>,
}

/// GET /api/connections/:id/history
pub async fn get_history(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<GetHistoryQuery>,
) -> Result<Json<HistoryResponse>, (StatusCode, String)> {
    let service = HistoryService::new(state.db.clone());

    let history = service
        .get_history(connection_id, params.limit)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(HistoryResponse { history }))
}

/// DELETE /api/connections/:id/history
pub async fn clear_history(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
) -> Result<StatusCode, (StatusCode, String)> {
    let service = HistoryService::new(state.db.clone());

    service
        .clear_history(connection_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

/// DELETE /api/connections/:id/history/:entry_id
pub async fn delete_history_entry(
    State(state): State<AppState>,
    Path((connection_id, entry_id)): Path<(Uuid, Uuid)>,
) -> Result<StatusCode, (StatusCode, String)> {
    let service = HistoryService::new(state.db.clone());

    service
        .delete_entry(connection_id, entry_id)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct DeleteHistoryEntriesRequest {
    pub ids: Vec<Uuid>,
}

/// POST /api/connections/:id/history/delete
pub async fn delete_history_entries(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<DeleteHistoryEntriesRequest>,
) -> Result<StatusCode, (StatusCode, String)> {
    let service = HistoryService::new(state.db.clone());

    service
        .delete_entries(connection_id, payload.ids)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Deserialize)]
pub struct AddHistoryRequest {
    pub sql: String,
    pub row_count: Option<i32>,
    pub execution_time: Option<i32>,
    pub success: bool,
    pub error_message: Option<String>,
}

/// POST /api/connections/:id/history
pub async fn add_history(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<AddHistoryRequest>,
) -> Result<Json<query_history::Model>, (StatusCode, String)> {
    let service = HistoryService::new(state.db.clone());

    let entry = service
        .add_entry(
            connection_id,
            payload.sql,
            payload.row_count,
            payload.execution_time,
            payload.success,
            payload.error_message,
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(entry))
}
