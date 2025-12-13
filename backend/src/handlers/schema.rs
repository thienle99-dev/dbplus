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
use uuid::Uuid;

#[derive(Deserialize)]
pub struct SchemaParams {}

#[derive(Deserialize)]
pub struct DatabaseOverrideParams {
    #[serde(default)]
    pub database: Option<String>,
}

#[derive(Deserialize)]
pub struct TableParams {
    schema: String,
    #[serde(default)]
    pub database: Option<String>,
}

#[derive(Deserialize)]
pub struct ColumnParams {
    schema: String,
    table: String,
    #[serde(default)]
    pub database: Option<String>,
}

#[derive(Deserialize)]
pub struct CreateSchemaRequest {
    pub name: String,
}

#[derive(serde::Serialize)]
pub struct SchemaManagementResponse {
    pub success: bool,
    pub message: String,
}

pub async fn list_schemas(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<DatabaseOverrideParams>,
) -> impl IntoResponse {
    tracing::info!("[API] GET /schemas - connection_id: {}", connection_id);
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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

pub async fn create_schema(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateSchemaRequest>,
) -> impl IntoResponse {
    let name = payload.name.trim();
    if name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(SchemaManagementResponse {
                success: false,
                message: "Schema name cannot be empty".to_string(),
            }),
        )
            .into_response();
    }
    if name.len() > 63 {
        return (
            StatusCode::BAD_REQUEST,
            Json(SchemaManagementResponse {
                success: false,
                message: "Schema name is too long (max 63 chars)".to_string(),
            }),
        )
            .into_response();
    }

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service.create_schema(connection_id, name).await {
        Ok(_) => (
            StatusCode::CREATED,
            Json(SchemaManagementResponse {
                success: true,
                message: format!("Schema '{}' created", name),
            }),
        )
            .into_response(),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(SchemaManagementResponse {
                success: false,
                message: e.to_string(),
            }),
        )
            .into_response(),
    }
}

pub async fn drop_schema(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path((connection_id, name)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let name = name.trim().to_string();
    if name.is_empty() {
        return (StatusCode::BAD_REQUEST, "Schema name cannot be empty").into_response();
    }

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service.drop_schema(connection_id, &name).await {
        Ok(_) => (StatusCode::NO_CONTENT, ()).into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

pub async fn list_schema_metadata(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /schema/metadata - connection_id: {}, schema: {}",
        connection_id,
        params.schema
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
    match service
        .get_schema_metadata(connection_id, &params.schema)
        .await
    {
        Ok(metadata) => {
            tracing::info!(
                "[API] GET /schema/metadata - SUCCESS - found {} tables",
                metadata.len()
            );
            (StatusCode::OK, Json(metadata)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /schema/metadata - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn list_tables(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<TableParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /tables - connection_id: {}, schema: {}",
        connection_id,
        params.schema
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ColumnParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /columns - connection_id: {}, schema: {}, table: {}",
        connection_id,
        params.schema,
        params.table
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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
    #[serde(default)]
    database: Option<String>,
}

pub async fn get_table_data(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
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

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );

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
    #[serde(default)]
    database: Option<String>,
}

pub async fn add_column(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
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
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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
    #[serde(default)]
    database: Option<String>,
}

pub async fn alter_column(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
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
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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
    headers: HeaderMap,
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
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .clone()
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );
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

#[derive(Deserialize)]
pub struct ViewParams {
    schema: String,
}

#[derive(Deserialize)]
pub struct ViewDefinitionParams {
    schema: String,
    view: String,
}

pub async fn list_views(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ViewParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /views - connection_id: {}, schema: {}",
        connection_id,
        params.schema
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service.list_views(connection_id, &params.schema).await {
        Ok(views) => {
            tracing::info!("[API] GET /views - SUCCESS - found {} views", views.len());
            (StatusCode::OK, Json(views)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /views - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn get_view_definition(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<ViewDefinitionParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /view-definition - connection_id: {}, schema: {}, view: {}",
        connection_id,
        params.schema,
        params.view
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service
        .get_view_definition(connection_id, &params.schema, &params.view)
        .await
    {
        Ok(view) => {
            tracing::info!("[API] GET /view-definition - SUCCESS");
            (StatusCode::OK, Json(view)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /view-definition - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct FunctionParams {
    schema: String,
}

#[derive(Deserialize)]
pub struct FunctionDefinitionParams {
    schema: String,
    function: String,
}

pub async fn list_functions(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<FunctionParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /functions - connection_id: {}, schema: {}",
        connection_id,
        params.schema
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service.list_functions(connection_id, &params.schema).await {
        Ok(functions) => {
            tracing::info!(
                "[API] GET /functions - SUCCESS - found {} functions",
                functions.len()
            );
            (StatusCode::OK, Json(functions)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /functions - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}

pub async fn get_function_definition(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<FunctionDefinitionParams>,
) -> impl IntoResponse {
    tracing::info!(
        "[API] GET /function-definition - connection_id: {}, schema: {}, function: {}",
        connection_id,
        params.schema,
        params.function
    );
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));
    match service
        .get_function_definition(connection_id, &params.schema, &params.function)
        .await
    {
        Ok(function) => {
            tracing::info!("[API] GET /function-definition - SUCCESS");
            (StatusCode::OK, Json(function)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /function-definition - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}
