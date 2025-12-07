use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use uuid::Uuid;

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
    tracing::info!("[API] GET /schemas - connection_id: {}", connection_id);
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_schemas(connection_id).await {
        Ok(schemas) => {
            tracing::info!(
                "[API] GET /schemas - SUCCESS - found {} schemas",
                schemas.len()
            );
            (StatusCode::OK, Json(schemas)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /schemas - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn list_tables(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /tables - connection_id: {}, schema: {}",
        connection_id,
        params.schema
    );
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service.get_tables(connection_id, &params.schema).await {
        Ok(tables) => {
            tracing::info!(
                "[API] GET /tables - SUCCESS - found {} tables",
                tables.len()
            );
            (StatusCode::OK, Json(tables)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /tables - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn list_columns(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ColumnParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /columns - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .get_columns(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(columns) => {
            tracing::info!(
                "[API] GET /columns - SUCCESS - found {} columns",
                columns.len()
            );
            (StatusCode::OK, Json(columns)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /columns - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
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
    let limit = params.limit.unwrap_or(100);
    let offset = params.offset.unwrap_or(0);
    tracing::info!(
        "[API] GET /query - connection_id: {}, schema: {}, table: {}, limit: {}, offset: {}",
        connection_id,
        params.schema,
        params.table,
        limit,
        offset
    );

    let service = ConnectionService::new(db).expect("Failed to create service");

    match service
        .get_table_data(connection_id, &params.schema, &params.table, limit, offset)
        .await
    {
        Ok(result) => {
            tracing::info!(
                "[API] GET /query - SUCCESS - returned {} rows",
                result.rows.len()
            );
            (StatusCode::OK, Json(result)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /query - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

use crate::services::db_driver::ColumnDefinition;

#[derive(Deserialize)]
pub struct AddColumnParams {
    schema: String,
    table: String,
}

pub async fn add_column(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<AddColumnParams>,
    Json(column_def): Json<ColumnDefinition>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] POST /connections/{}/columns - schema: {}, table: {}, column: {}",
        connection_id,
        params.schema,
        params.table,
        column_def.name
    );
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .add_column(connection_id, &params.schema, &params.table, &column_def)
        .await
    {
        Ok(_) => {
            tracing::info!(
                "[API] POST /connections/{}/columns - SUCCESS",
                connection_id
            );
            (StatusCode::OK, "Column added successfully").into_response()
        }
        Err(e) => {
            tracing::error!(
                "[API] POST /connections/{}/columns - ERROR: {}",
                connection_id,
                e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct AlterColumnParams {
    schema: String,
    table: String,
}

pub async fn alter_column(
    State(db): State<DatabaseConnection>,
    Path((connection_id, column_name)): Path<(Uuid, String)>,
    Query(params): Query<AlterColumnParams>,
    Json(column_def): Json<ColumnDefinition>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] PUT /connections/{}/columns/{} - schema: {}, table: {}",
        connection_id,
        column_name,
        params.schema,
        params.table
    );
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .alter_column(
            connection_id,
            &params.schema,
            &params.table,
            &column_name,
            &column_def,
        )
        .await
    {
        Ok(_) => {
            tracing::info!(
                "[API] PUT /connections/{}/columns/{} - SUCCESS",
                connection_id,
                column_name
            );
            (StatusCode::OK, "Column altered successfully").into_response()
        }
        Err(e) => {
            tracing::error!(
                "[API] PUT /connections/{}/columns/{} - ERROR: {}",
                connection_id,
                column_name,
                e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn drop_column(
    State(db): State<DatabaseConnection>,
    Path((connection_id, column_name)): Path<(Uuid, String)>,
    Query(params): Query<ColumnParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] DELETE /connections/{}/columns/{} - schema: {}, table: {}",
        connection_id,
        column_name,
        params.schema,
        params.table
    );
    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .drop_column(connection_id, &params.schema, &params.table, &column_name)
        .await
    {
        Ok(_) => {
            tracing::info!(
                "[API] DELETE /connections/{}/columns/{} - SUCCESS",
                connection_id,
                column_name
            );
            (StatusCode::OK, "Column dropped successfully").into_response()
        }
        Err(e) => {
            tracing::error!(
                "[API] DELETE /connections/{}/columns/{} - ERROR: {}",
                connection_id,
                column_name,
                e
            );
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}
