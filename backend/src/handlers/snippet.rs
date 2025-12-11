use crate::services::snippet_service::SnippetService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateSnippetParams {
    name: String,
    description: Option<String>,
    sql: String,
    tags: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct UpdateSnippetParams {
    name: Option<String>,
    description: Option<String>,
    sql: Option<String>,
    tags: Option<Vec<String>>,
}

pub async fn list_snippets(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let service = SnippetService::new(db);
    match service.get_snippets().await {
        Ok(snippets) => (StatusCode::OK, Json(snippets)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_snippet(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateSnippetParams>,
) -> impl IntoResponse {
    let service = SnippetService::new(db);
    match service
        .create_snippet(payload.name, payload.description, payload.sql, payload.tags)
        .await
    {
        Ok(snippet) => (StatusCode::CREATED, Json(snippet)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn update_snippet(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateSnippetParams>,
) -> impl IntoResponse {
    let service = SnippetService::new(db);
    match service
        .update_snippet(
            id,
            payload.name,
            payload.description,
            payload.sql,
            payload.tags,
        )
        .await
    {
        Ok(snippet) => (StatusCode::OK, Json(snippet)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_snippet(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = SnippetService::new(db);
    match service.delete_snippet(id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
