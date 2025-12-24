use crate::app_state::AppState;
use crate::services::saved_filter_service::SavedFilterService;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateSavedFilterParams {
    schema: String,
    table: String,
    name: String,
    filter: String,
}

#[derive(Deserialize)]
pub struct ListSavedFilterParams {
    schema: String,
    table: String,
}

pub async fn list_saved_filters(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ListSavedFilterParams>,
) -> impl IntoResponse {
    let service = SavedFilterService::new(state.db.clone());
    match service
        .get_saved_filters(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(filters) => (StatusCode::OK, Json(filters)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_saved_filter(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateSavedFilterParams>,
) -> impl IntoResponse {
    let service = SavedFilterService::new(state.db.clone());
    match service
        .create_saved_filter(
            connection_id,
            payload.schema,
            payload.table,
            payload.name,
            payload.filter,
        )
        .await
    {
        Ok(filter) => (StatusCode::CREATED, Json(filter)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_saved_filter(
    State(state): State<AppState>,
    Path((_connection_id, filter_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = SavedFilterService::new(state.db.clone());
    match service.delete_saved_filter(filter_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
