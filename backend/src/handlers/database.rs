use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
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

#[derive(Deserialize)]
pub struct CreateDatabaseRequest {
    pub name: String,
    #[serde(default)]
    pub options: Option<CreateDatabaseOptions>,
}

#[derive(Deserialize, Clone, Debug)]
pub struct CreateDatabaseOptions {
    pub owner: Option<String>,
    pub template: Option<String>,
    pub encoding: Option<String>,
    #[serde(rename = "lcCollate")]
    pub lc_collate: Option<String>,
    #[serde(rename = "lcCtype")]
    pub lc_ctype: Option<String>,
    pub tablespace: Option<String>,
    #[serde(rename = "allowConnections")]
    pub allow_connections: Option<bool>,
    #[serde(rename = "connectionLimit")]
    pub connection_limit: Option<i32>,
    #[serde(rename = "isTemplate")]
    pub is_template: Option<bool>,
}

#[derive(serde::Serialize)]
pub struct DatabaseManagementResponse {
    pub success: bool,
    pub message: String,
}

pub async fn create_database(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateDatabaseRequest>,
) -> impl IntoResponse {
    let name = payload.name.trim();
    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(DatabaseManagementResponse {
                success: false,
                message: "Database name cannot be empty".to_string(),
            }),
        )
            .into_response();
    }
    if name.len() > 63 {
        return (
            StatusCode::BAD_REQUEST,
            Json(DatabaseManagementResponse {
                success: false,
                message: "Database name is too long (max 63 chars)".to_string(),
            }),
        )
            .into_response();
    }

    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.create_database(id, name, payload.options).await {
        Ok(_) => (
            StatusCode::CREATED,
            Json(DatabaseManagementResponse {
                success: true,
                message: format!("Database '{}' created", name),
            }),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(DatabaseManagementResponse {
                success: false,
                message: e.to_string(),
            }),
        )
            .into_response(),
    }
}

pub async fn drop_database(
    State(db): State<DatabaseConnection>,
    Path((id, name)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let name = name.trim().to_string();
    if name.is_empty() {
        return (StatusCode::BAD_REQUEST, "Database name cannot be empty").into_response();
    }

    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.drop_database(id, &name).await {
        Ok(_) => (StatusCode::NO_CONTENT, ()).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}
