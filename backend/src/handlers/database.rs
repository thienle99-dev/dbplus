use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

// List all databases
pub async fn list_databases(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_databases(id).await {
        Ok(databases) => (StatusCode::OK, Json(databases)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
