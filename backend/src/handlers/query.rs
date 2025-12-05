use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ExecuteQueryParams {
    query: String,
}

pub async fn execute_query(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<ExecuteQueryParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");

    match service.execute_query(connection_id, &payload.query).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
