use crate::models::entities::{connection::Entity as Connection, sqlite_attached_db};
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, Set,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

fn is_valid_schema_name(name: &str) -> bool {
    let name = name.trim();
    if name.is_empty() {
        return false;
    }
    if name.eq_ignore_ascii_case("main") || name.eq_ignore_ascii_case("temp") {
        return false;
    }
    let mut chars = name.chars();
    let Some(first) = chars.next() else { return false };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

#[derive(Serialize)]
pub struct SqliteAttachmentResponse {
    pub name: String,
    pub file_path: String,
    pub read_only: bool,
}

#[derive(Deserialize)]
pub struct CreateSqliteAttachmentRequest {
    pub name: String,
    pub file_path: String,
    #[serde(default)]
    pub read_only: bool,
}

pub async fn list_sqlite_attachments(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let conn = match Connection::find_by_id(connection_id).one(&db).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    if conn.db_type != "sqlite" {
        return (
            StatusCode::BAD_REQUEST,
            "Attachments are only supported for sqlite connections",
        )
            .into_response();
    }

    match sqlite_attached_db::Entity::find()
        .filter(sqlite_attached_db::Column::ConnectionId.eq(connection_id))
        .order_by_asc(sqlite_attached_db::Column::Name)
        .all(&db)
        .await
    {
        Ok(rows) => (
            StatusCode::OK,
            Json(
                rows.into_iter()
                    .map(|r| SqliteAttachmentResponse {
                        name: r.name,
                        file_path: r.file_path,
                        read_only: r.read_only,
                    })
                    .collect::<Vec<_>>(),
            ),
        )
            .into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_sqlite_attachment(
    State(db): State<DatabaseConnection>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateSqliteAttachmentRequest>,
) -> impl IntoResponse {
    let name = payload.name.trim().to_string();
    let file_path = payload.file_path.trim().to_string();
    if !is_valid_schema_name(&name) {
        return (
            StatusCode::BAD_REQUEST,
            "Invalid attachment name (use letters/digits/_; cannot be main/temp)",
        )
            .into_response();
    }
    if file_path.is_empty() {
        return (StatusCode::BAD_REQUEST, "file_path cannot be empty").into_response();
    }

    let conn = match Connection::find_by_id(connection_id).one(&db).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    if conn.db_type != "sqlite" {
        return (
            StatusCode::BAD_REQUEST,
            "Attachments are only supported for sqlite connections",
        )
            .into_response();
    }

    let now = Utc::now();
    let active = sqlite_attached_db::ActiveModel {
        id: Set(Uuid::new_v4()),
        connection_id: Set(connection_id),
        name: Set(name.clone()),
        file_path: Set(file_path.clone()),
        read_only: Set(payload.read_only),
        created_at: Set(now.into()),
        updated_at: Set(now.into()),
    };

    match active.insert(&db).await {
        Ok(_) => (
            StatusCode::CREATED,
            Json(SqliteAttachmentResponse {
                name,
                file_path,
                read_only: payload.read_only,
            }),
        )
            .into_response(),
        Err(e) => (StatusCode::BAD_REQUEST, e.to_string()).into_response(),
    }
}

pub async fn delete_sqlite_attachment(
    State(db): State<DatabaseConnection>,
    Path((connection_id, name)): Path<(Uuid, String)>,
) -> impl IntoResponse {
    let name = name.trim().to_string();
    if name.is_empty() {
        return (StatusCode::BAD_REQUEST, "Attachment name cannot be empty").into_response();
    }

    let conn = match Connection::find_by_id(connection_id).one(&db).await {
        Ok(Some(c)) => c,
        Ok(None) => return (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => return (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    };
    if conn.db_type != "sqlite" {
        return (
            StatusCode::BAD_REQUEST,
            "Attachments are only supported for sqlite connections",
        )
            .into_response();
    }

    match sqlite_attached_db::Entity::delete_many()
        .filter(sqlite_attached_db::Column::ConnectionId.eq(connection_id))
        .filter(sqlite_attached_db::Column::Name.eq(name))
        .exec(&db)
        .await
    {
        Ok(res) if res.rows_affected > 0 => (StatusCode::NO_CONTENT, ()).into_response(),
        Ok(_) => (StatusCode::NOT_FOUND, "Attachment not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
