use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct TableParams {
    schema: String,
    table: String,
}

#[derive(Deserialize)]
pub struct SetTableCommentBody {
    schema: String,
    table: String,
    comment: Option<String>,
}

#[derive(Deserialize)]
pub struct SetTablePermissionsBody {
    schema: String,
    table: String,
    grantee: String,
    privileges: Vec<String>,
    grant_option: bool,
}

// Get table constraints (foreign keys, check constraints, unique constraints)
pub async fn get_table_constraints(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /constraints - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
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
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /table-stats - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
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

// Get table indexes
pub async fn get_table_indexes(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /indexes - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service
        .get_table_indexes(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(indexes) => {
            tracing::info!(
                "[API] GET /indexes - SUCCESS - found {} indexes",
                indexes.len()
            );
            (StatusCode::OK, Json(indexes)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /indexes - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

// Get table triggers
pub async fn get_table_triggers(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /triggers - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service
        .get_table_triggers(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(triggers) => {
            tracing::info!(
                "[API] GET /triggers - SUCCESS - found {} triggers",
                triggers.len()
            );
            (StatusCode::OK, Json(triggers)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /triggers - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

// Get table comment
pub async fn get_table_comment(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /table-comment - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .get_table_comment(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(comment) => (StatusCode::OK, Json(comment)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported") || msg.to_lowercase().contains("unsupported") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// Set table comment (comment=null clears)
pub async fn set_table_comment(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(body): Json<SetTableCommentBody>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] PUT /table-comment - connection_id: {}, schema: {}, table: {}",
        connection_id,
        body.schema,
        body.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .set_table_comment(connection_id, &body.schema, &body.table, body.comment)
        .await
    {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported") || msg.to_lowercase().contains("unsupported") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// Get table permissions/grants
pub async fn get_table_permissions(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /permissions - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .get_table_permissions(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(grants) => (StatusCode::OK, Json(grants)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported") || msg.to_lowercase().contains("unsupported") {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// Get storage & bloat info
pub async fn get_storage_bloat_info(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /storage-info - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .get_storage_bloat_info(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(info) => (StatusCode::OK, Json(info)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported")
                || msg.to_lowercase().contains("unsupported")
            {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// Get partition information
pub async fn get_partitions(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /partitions - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .get_partitions(connection_id, &params.schema, &params.table)
        .await
    {
        Ok(info) => (StatusCode::OK, Json(info)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported")
                || msg.to_lowercase().contains("unsupported")
            {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// List roles/users (Postgres)
pub async fn list_roles(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /roles - connection_id: {}", connection_id);

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service.list_roles(connection_id).await {
        Ok(roles) => (StatusCode::OK, Json(roles)).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported")
                || msg.to_lowercase().contains("unsupported")
            {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}

// Set table permissions (overwrites explicit grants for that grantee on the table)
pub async fn set_table_permissions(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(body): Json<SetTablePermissionsBody>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] PUT /permissions - connection_id: {}, schema: {}, table: {}, grantee: {}",
        connection_id,
        body.schema,
        body.table,
        body.grantee
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .set_table_permissions(
            connection_id,
            &body.schema,
            &body.table,
            &body.grantee,
            body.privileges,
            body.grant_option,
        )
        .await
    {
        Ok(()) => (StatusCode::OK, Json(json!({ "success": true }))).into_response(),
        Err(e) => {
            let msg = e.to_string();
            let status = if msg.to_lowercase().contains("not supported")
                || msg.to_lowercase().contains("unsupported")
            {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };
            (status, Json(json!({ "error": msg }))).into_response()
        }
    }
}
