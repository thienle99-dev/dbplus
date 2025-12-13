use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use uuid::Uuid;

use crate::services::saved_query_folder_service::SavedQueryFolderService;

#[derive(Deserialize)]
pub struct CreateFolderParams {
    name: String,
}

#[derive(Deserialize)]
pub struct UpdateFolderParams {
    name: String,
}

pub async fn list_folders(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let service = SavedQueryFolderService::new(db);
    match service.list_folders(connection_id).await {
        Ok(folders) => (StatusCode::OK, Json(folders)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_folder(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateFolderParams>,
) -> impl IntoResponse {
    let service = SavedQueryFolderService::new(db);
    match service.create_folder(connection_id, payload.name).await {
        Ok(folder) => (StatusCode::CREATED, Json(folder)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn update_folder(
    State(db): State<DatabaseConnection>,
    Path((_connection_id, folder_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<UpdateFolderParams>,
) -> impl IntoResponse {
    let service = SavedQueryFolderService::new(db);
    match service.update_folder(folder_id, payload.name).await {
        Ok(folder) => (StatusCode::OK, Json(folder)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_folder(
    State(db): State<DatabaseConnection>,
    Path((_connection_id, folder_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = SavedQueryFolderService::new(db);
    match service.delete_folder(folder_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

