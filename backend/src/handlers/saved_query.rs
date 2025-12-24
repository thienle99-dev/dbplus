use crate::app_state::AppState;
use crate::services::saved_query_service::SavedQueryService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateSavedQueryParams {
    name: String,
    description: Option<String>,
    sql: String,
    folder_id: Option<Uuid>,
    tags: Option<Vec<String>>,
    metadata: Option<serde_json::Value>,
}

#[derive(Deserialize)]
pub struct UpdateSavedQueryParams {
    name: Option<String>,
    description: Option<String>,
    sql: Option<String>,
    folder_id: Option<Option<Uuid>>,
    tags: Option<Vec<String>>,
    metadata: Option<serde_json::Value>,
}

pub async fn list_saved_queries(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let service = SavedQueryService::new(state.db.clone());
    match service.get_saved_queries(connection_id).await {
        Ok(queries) => (StatusCode::OK, Json(queries)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_saved_query(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateSavedQueryParams>,
) -> impl IntoResponse {
    let service = SavedQueryService::new(state.db.clone());
    match service
        .create_saved_query(
            connection_id,
            payload.name,
            payload.description,
            payload.sql,
            payload.folder_id,
            payload.tags,
            payload.metadata,
        )
        .await
    {
        Ok(query) => (StatusCode::CREATED, Json(query)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn update_saved_query(
    State(state): State<AppState>,
    Path((_connection_id, query_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateSavedQueryParams>,
) -> impl IntoResponse {
    let service = SavedQueryService::new(state.db.clone());
    match service
        .update_saved_query(
            query_id,
            payload.name,
            payload.description,
            payload.sql,
            payload.folder_id,
            payload.tags,
            payload.metadata,
        )
        .await
    {
        Ok(query) => (StatusCode::OK, Json(query)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_saved_query(
    State(state): State<AppState>,
    Path((_connection_id, query_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = SavedQueryService::new(state.db.clone());
    match service.delete_saved_query(query_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
