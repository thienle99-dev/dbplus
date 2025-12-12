use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct ExplainRequest {
    pub sql: String,
    pub analyze: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ExplainResponse {
    pub plan: Value,
}

pub async fn explain_query(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<String>,
    Json(payload): Json<ExplainRequest>,
) -> Result<Json<ExplainResponse>, (StatusCode, String)> {
    let service = ConnectionService::new(db)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let connection_uuid = uuid::Uuid::parse_str(&connection_id)
        .map_err(|e| (StatusCode::BAD_REQUEST, e.to_string()))?;

    let plan = service
        .explain_query(
            connection_uuid,
            &payload.sql,
            payload.analyze.unwrap_or(false),
        )
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(ExplainResponse { plan }))
}
