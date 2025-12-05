use axum::{
    extract::{Path, State, Query},
    http::StatusCode,
    Json,
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;
use serde::Deserialize;
use crate::services::connection_service::ConnectionService;

#[derive(Deserialize)]
pub struct SchemaParams {}

#[derive(Deserialize)]
pub struct TableParams {
    schema: String,
}

#[derive(Deserialize)]
pub struct ColumnParams {
    schema: String,
    table: String,
}

// Get schemas
pub async fn list_schemas(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_schemas(connection_id).await {
        Ok(schemas) => (StatusCode::OK, Json(schemas)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn list_tables(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_tables(connection_id, &params.schema).await {
        Ok(tables) => (StatusCode::OK, Json(tables)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn list_columns(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ColumnParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_columns(connection_id, &params.schema, &params.table).await {
        Ok(columns) => (StatusCode::OK, Json(columns)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(Deserialize)]
pub struct TableDataParams {
    schema: String,
    table: String,
    limit: Option<i64>,
    offset: Option<i64>,
}

pub async fn get_table_data(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableDataParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db).expect("Failed to create service");
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    
    match service.get_table_data(connection_id, &params.schema, &params.table, limit, offset).await {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
