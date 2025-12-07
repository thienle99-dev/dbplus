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
pub struct TableParams {
    schema: String,
    table: String,
}

// Get table constraints (foreign keys, check constraints, unique constraints)
pub async fn get_table_constraints(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /constraints - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .get_table_constraints(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(constraints) => {
            tracing::info!(
                "[API] GET /constraints - SUCCESS - found {} FKs, {} checks, {} uniques",
                constraints.foreign_keys.len(),
                constraints.check_constraints.len(),
                constraints.unique_constraints.len()
            );
            (StatusCode::OK, Json(constraints)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /constraints - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

// Get table statistics (row count, sizes, timestamps)
pub async fn get_table_statistics(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /table-stats - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db).expect("Failed to create service");
    match service
        .get_table_statistics(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(stats) => {
            tracing::info!(
                "[API] GET /table-stats - SUCCESS - rows: {:?}, total_size: {:?}",
                stats.row_count,
                stats.total_size
            );
            (StatusCode::OK, Json(stats)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /table-stats - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}
