use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct UpdateRowRequest {
    pub schema: Option<String>,
    pub table: String,
    pub primary_key: serde_json::Map<String, Value>,
    pub updates: serde_json::Map<String, Value>,
}

#[derive(Deserialize)]
pub struct DeleteRowRequest {
    pub schema: Option<String>,
    pub table: String,
    pub primary_key: serde_json::Map<String, Value>,
}

pub async fn update_result_row(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<UpdateRowRequest>,
) -> impl IntoResponse {
    // Basic validation
    if payload.primary_key.is_empty() || payload.updates.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            "Primary key and updates cannot be empty",
        )
            .into_response();
    }

    // Use ConnectionService
    let service = match ConnectionService::new(db.clone()) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let connection_model = match service.get_connection_by_id(connection_id).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let _placeholder = match connection_model.db_type.as_str() {
        "postgres" => "$",
        _ => "?",
    };

    // Reconstruct clauses
    let mut set_str = String::new();

    // Simple escaping for MVP
    for (i, (key, value)) in payload.updates.iter().enumerate() {
        if i > 0 {
            set_str.push_str(", ");
        }
        let val_str = escape_value(value);
        set_str.push_str(&format!("\"{}\" = {}", key, val_str));
    }

    let mut where_str = String::new();
    for (i, (key, value)) in payload.primary_key.iter().enumerate() {
        if i > 0 {
            where_str.push_str(" AND ");
        }
        let val_str = escape_value(value);
        where_str.push_str(&format!("\"{}\" = {}", key, val_str));
    }

    let table_ref = if let Some(schema) = &payload.schema {
        format!("\"{}\".\"{}\"", schema, payload.table)
    } else {
        format!("\"{}\"", payload.table)
    };

    let sql = format!("UPDATE {} SET {} WHERE {}", table_ref, set_str, where_str);

    tracing::info!("Executing update: {}", sql);

    match service.execute(connection_id, &sql).await {
        Ok(affected) => {
            let json_result = serde_json::json!({
                "affected_rows": affected,
                "success": true
            });
            (StatusCode::OK, Json(json_result)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

fn escape_value(v: &Value) -> String {
    match v {
        Value::Null => "NULL".to_string(),
        Value::Bool(b) => {
            if *b {
                "TRUE".to_string()
            } else {
                "FALSE".to_string()
            }
        }
        Value::Number(n) => n.to_string(),
        Value::String(s) => format!("'{}'", s.replace("'", "''")), // Basic SQL escaping
        Value::Array(_) | Value::Object(_) => format!("'{}'", v.to_string().replace("'", "''")),
    }
}

pub async fn delete_result_row(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<DeleteRowRequest>,
) -> impl IntoResponse {
    // Basic validation
    if payload.primary_key.is_empty() {
        return (StatusCode::BAD_REQUEST, "Primary key cannot be empty").into_response();
    }

    // Use ConnectionService
    let service = match ConnectionService::new(db.clone()) {
        Ok(s) => s,
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let connection_model = match service.get_connection_by_id(connection_id).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let _placeholder = match connection_model.db_type.as_str() {
        "postgres" => "$",
        _ => "?",
    };

    let mut where_str = String::new();
    for (i, (key, value)) in payload.primary_key.iter().enumerate() {
        if i > 0 {
            where_str.push_str(" AND ");
        }
        let val_str = escape_value(value);
        where_str.push_str(&format!("\"{}\" = {}", key, val_str));
    }

    let table_ref = if let Some(schema) = &payload.schema {
        format!("\"{}\".\"{}\"", schema, payload.table)
    } else {
        format!("\"{}\"", payload.table)
    };

    let sql = format!("DELETE FROM {} WHERE {}", table_ref, where_str);

    tracing::info!("Executing delete: {}", sql);

    match service.execute(connection_id, &sql).await {
        Ok(affected) => {
            let json_result = serde_json::json!({
                "affected_rows": affected,
                "success": true
            });
            (StatusCode::OK, Json(json_result)).into_response()
        }
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
