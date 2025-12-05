use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use crate::models::entities::connection;
use crate::services::connection_service::ConnectionService;

// List all connections
pub async fn list_connections(
    State(db): State<DatabaseConnection>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_all_connections().await {
        Ok(connections) => (StatusCode::OK, Json(connections)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Get connection by ID
pub async fn get_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_connection_by_id(id).await {
        Ok(Some(connection)) => (StatusCode::OK, Json(connection)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Create new connection
pub async fn create_connection(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<connection::Model>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.create_connection(payload).await {
        Ok(connection) => (StatusCode::CREATED, Json(connection)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Update connection
pub async fn update_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(payload): Json<connection::Model>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.update_connection(id, payload).await {
        Ok(connection) => (StatusCode::OK, Json(connection)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Delete connection
pub async fn delete_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.delete_connection(id).await {
        Ok(_) => (StatusCode::NO_CONTENT, ()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Test connection
pub async fn test_connection(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<connection::Model>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    // In a real app, we might want to pass the password separately if it's not saved yet
    // For now, we assume the payload contains the password to test
    match service.test_connection(payload.clone(), &payload.password).await {
        Ok(_) => (StatusCode::OK, "Connection successful").into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}
