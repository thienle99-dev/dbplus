use crate::services::connection_service::ConnectionService;
use axum::{
    body::Body,
    extract::{Json, Path, Query, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ExecuteScriptBody {
    pub script: String,
}

#[derive(Deserialize)]
pub struct BackupSqlParams {
    pub database: Option<String>,
    pub clean: Option<bool>,
}

pub async fn execute_script(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(body): Json<ExecuteScriptBody>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    let result = service.execute_script(connection_id, &body.script).await;

    match result {
        Ok(statements_executed) => (
            StatusCode::OK,
            Json(json!({ "success": true, "statements_executed": statements_executed })),
        )
            .into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, Json(json!({ "message": e.to_string() }))).into_response(),
    }
}

pub async fn backup_postgres_sql(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<BackupSqlParams>,
) -> impl IntoResponse {
    let header_db_override = crate::utils::request::database_override_from_headers(&headers);
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    let (connection, password) = match service.get_connection_with_password(connection_id).await {
        Ok(v) => v,
        Err(e) => return (StatusCode::NOT_FOUND, Json(json!({ "message": e.to_string() }))).into_response(),
    };

    if connection.db_type.as_str() != "postgres" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "message": "Backup is only supported for Postgres connections" })),
        )
            .into_response();
    }

    let database = params
        .database
        .clone()
        .or(header_db_override)
        .unwrap_or_else(|| connection.database.clone());

    if database.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "message": "Missing database" })),
        )
            .into_response();
    }

    let mut cmd = tokio::process::Command::new("pg_dump");
    cmd.env("PGPASSWORD", password);
    cmd.arg("--no-owner")
        .arg("--no-privileges")
        .arg("--column-inserts");

    if params.clean.unwrap_or(false) {
        cmd.arg("--clean").arg("--if-exists");
    }

    cmd.arg("-h")
        .arg(&connection.host)
        .arg("-p")
        .arg(connection.port.to_string())
        .arg("-U")
        .arg(&connection.username)
        .arg("-d")
        .arg(&database);

    let output = match cmd.output().await {
        Ok(o) => o,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "message": format!("Failed to run pg_dump: {}", e) })),
            )
                .into_response()
        }
    };

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "message": "pg_dump failed", "stderr": stderr })),
        )
            .into_response();
    }

    // Safety limit: avoid returning very large payloads in one response.
    const MAX_BYTES: usize = 50 * 1024 * 1024;
    if output.stdout.len() > MAX_BYTES {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "message": format!("Backup too large (>{}MB). Consider using a custom format or external tools.", MAX_BYTES / (1024 * 1024)) })),
        )
            .into_response();
    }

    let mut resp = (StatusCode::OK, Body::from(output.stdout)).into_response();
    resp.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("text/plain; charset=utf-8"),
    );
    resp
}
