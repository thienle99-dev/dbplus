use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, State},
    http::HeaderMap,
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

#[derive(Deserialize)]
pub struct InsertRowRequest {
    pub schema: Option<String>,
    pub table: String,
    pub row: serde_json::Map<String, Value>,
}

pub async fn update_result_row(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
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
        Ok(s) => s.with_database_override(crate::utils::request::database_override_from_headers(
            &headers,
        )),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let connection_model = match service.get_connection_by_id(connection_id).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let is_couchbase = connection_model.db_type == "couchbase";
    let quote = if is_couchbase { "`" } else { "\"" };

    // Reconstruct clauses
    let mut set_str = String::new();

    // Simple escaping for MVP
    for (i, (key, value)) in payload.updates.iter().enumerate() {
        if i > 0 {
            set_str.push_str(", ");
        }
        let val_str = escape_value(value);
        if is_couchbase {
            set_str.push_str(&format!("`{}` = {}", key, val_str));
        } else {
            set_str.push_str(&format!("\"{}\" = {}", key, val_str));
        }
    }

    let mut where_str = String::new();
    for (i, (key, value)) in payload.primary_key.iter().enumerate() {
        if i > 0 {
            where_str.push_str(" AND ");
        }
        let val_str = escape_value(value);
        if is_couchbase && key == "_id" {
            // Use meta().id for Couchbase document ID
            where_str.push_str(&format!("meta().id = {}", val_str));
        } else {
            where_str.push_str(&format!("\"{}\" = {}", key, val_str));
        }
    }

    let table_ref = if let Some(schema) = &payload.schema {
        if is_couchbase {
            // For Couchbase, we need the bucket name.
            let bucket_opt = crate::utils::request::database_override_from_headers(&headers);
            if let Some(bucket) = bucket_opt {
                format!("`{}`.`{}`.`{}`", bucket, schema, payload.table)
            } else {
                // Fallback if no bucket, but likely won't work well without it
                format!("`{}`.`{}`", schema, payload.table)
            }
        } else {
            format!("\"{}\".\"{}\"", schema, payload.table)
        }
    } else {
        format!("{0}{1}{0}", quote, payload.table)
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
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<DeleteRowRequest>,
) -> impl IntoResponse {
    // Basic validation
    if payload.primary_key.is_empty() {
        return (StatusCode::BAD_REQUEST, "Primary key cannot be empty").into_response();
    }

    // Use ConnectionService
    let service = match ConnectionService::new(db.clone()) {
        Ok(s) => s.with_database_override(crate::utils::request::database_override_from_headers(
            &headers,
        )),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let connection_model = match service.get_connection_by_id(connection_id).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let is_couchbase = connection_model.db_type == "couchbase";
    let quote = if is_couchbase { "`" } else { "\"" };

    let mut where_str = String::new();
    for (i, (key, value)) in payload.primary_key.iter().enumerate() {
        if i > 0 {
            where_str.push_str(" AND ");
        }
        let val_str = escape_value(value);
        if is_couchbase && key == "_id" {
            where_str.push_str(&format!("meta().id = {}", val_str));
        } else {
            where_str.push_str(&format!("{0}{1}{0} = {2}", quote, key, val_str));
        }
    }

    let table_ref = if let Some(schema) = &payload.schema {
        if is_couchbase {
            let bucket_opt = crate::utils::request::database_override_from_headers(&headers);
            if let Some(bucket) = bucket_opt {
                format!("`{}`.`{}`.`{}`", bucket, schema, payload.table)
            } else {
                format!("`{}`.`{}`", schema, payload.table)
            }
        } else {
            format!("\"{}\".\"{}\"", schema, payload.table)
        }
    } else {
        format!("{0}{1}{0}", quote, payload.table)
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

pub async fn insert_result_row(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<InsertRowRequest>,
) -> impl IntoResponse {
    // Basic validation
    if payload.row.is_empty() {
        return (StatusCode::BAD_REQUEST, "Row data cannot be empty").into_response();
    }

    // Use ConnectionService
    let service = match ConnectionService::new(db.clone()) {
        Ok(s) => s.with_database_override(crate::utils::request::database_override_from_headers(
            &headers,
        )),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let connection_model = match service.get_connection_by_id(connection_id).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };

    let is_couchbase = connection_model.db_type == "couchbase";
    let quote = if is_couchbase { "`" } else { "\"" };

    // Format columns and values
    let mut columns_str = String::new();
    let mut values_str = String::new();

    let mut row_data = payload.row;
    let mut explicit_id = None;

    // Extract _id if present for Couchbase
    if is_couchbase {
        if let Some(id_val) = row_data.remove("_id") {
            // If user provided _id, we use it as Key.
            // But we need to check if it's string.
            if let Value::String(s) = id_val {
                explicit_id = Some(s);
            }
        }
    }

    let mut i = 0;
    for (key, value) in &row_data {
        if i > 0 {
            columns_str.push_str(", ");
            values_str.push_str(", ");
        }
        columns_str.push_str(&format!("{}{}{}", quote, key, quote));
        values_str.push_str(&escape_value(value));
        i += 1;
    }

    let table_ref = if let Some(schema) = &payload.schema {
        if is_couchbase {
            let bucket_opt = crate::utils::request::database_override_from_headers(&headers);
            if let Some(bucket) = bucket_opt {
                format!("`{}`.`{}`.`{}`", bucket, schema, payload.table)
            } else {
                format!("`{}`.`{}`", schema, payload.table)
            }
        } else {
            format!("\"{}\".\"{}\"", schema, payload.table)
        }
    } else {
        format!("{0}{1}{0}", quote, payload.table)
    };

    let sql = if is_couchbase {
        // N1QL INSERT syntax: INSERT INTO keyspace (KEY, VALUE) VALUES ("key", { "col": "val" })
        // OR INSERT INTO keyspace (KEY, col1, col2) VALUES ("key", "val1", "val2") -- This is cleaner if columns match.
        // Let's use standard SQL-like syntax supported by N1QL which infers other fields?
        // Docs say: INSERT INTO product (KEY, VALUE) VALUES ("odwalla-juice1", { "productId": "odwalla-juice1", ... })
        // But also allows INSERT INTO product (KEY, productId, ...) VALUES ("key", "...", ...)

        let key_val = explicit_id.unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

        if columns_str.is_empty() {
            // Inserting empty doc?
            format!(
                "INSERT INTO {} (KEY, VALUE) VALUES ('{}', {{}})",
                table_ref, key_val
            )
        } else {
            // Use column list syntax but we must include KEY
            format!(
                "INSERT INTO {} (KEY, {}) VALUES ('{}', {})",
                table_ref, columns_str, key_val, values_str
            )
        }
    } else {
        format!(
            "INSERT INTO {} ({}) VALUES ({})",
            table_ref, columns_str, values_str
        )
    };

    tracing::info!("Executing insert: {}", sql);

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
