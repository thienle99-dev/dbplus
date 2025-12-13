use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Json, Path, State},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
};
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ExecuteQueryParams {
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
    include_total_count: Option<bool>,
}

fn find_postgres_db_error<'a>(
    err: &'a (dyn std::error::Error + 'static),
) -> Option<&'a tokio_postgres::error::DbError> {
    let pg = err.downcast_ref::<tokio_postgres::Error>()?;
    pg.as_db_error()
}

fn find_sqlx_db_error<'a>(
    err: &'a (dyn std::error::Error + 'static),
) -> Option<&'a dyn sqlx::error::DatabaseError> {
    let sqlx_err = err.downcast_ref::<sqlx::Error>()?;
    sqlx_err.as_database_error()
}

pub async fn execute_query(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<ExecuteQueryParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    match service
        .execute_query_with_options(
            connection_id,
            &payload.query,
            payload.limit,
            payload.offset,
            payload.include_total_count.unwrap_or(false),
        )
        .await
    {
        Ok(result) => (StatusCode::OK, Json(result)).into_response(),
        Err(e) => {
            // Preserve full context for logs, but return structured client-friendly DB error details when possible.
            let message = e.to_string();

            let mut db_payload = None;
            for cause in e.chain() {
                if let Some(pg_db) = find_postgres_db_error(cause) {
                    let position = pg_db.position().map(|p| match p {
                        tokio_postgres::error::ErrorPosition::Original(pos) => pos.to_string(),
                        tokio_postgres::error::ErrorPosition::Internal { position, query } => {
                            format!("{} (internal: {})", position, query)
                        }
                    });
                    db_payload = Some(json!({
                        "engine": "postgres",
                        "code": pg_db.code().code(),
                        "severity": pg_db.severity(),
                        "message": pg_db.message(),
                        "detail": pg_db.detail(),
                        "hint": pg_db.hint(),
                        "position": position,
                        "where": pg_db.where_(),
                        "schema": pg_db.schema(),
                        "table": pg_db.table(),
                        "column": pg_db.column(),
                        "datatype": pg_db.datatype(),
                        "constraint": pg_db.constraint(),
                    }));
                    break;
                }

                if let Some(sqlx_db) = find_sqlx_db_error(cause) {
                    db_payload = Some(json!({
                        "engine": "sqlite",
                        "code": sqlx_db.code(),
                        "message": sqlx_db.message(),
                    }));
                    break;
                }
            }

            let status = if db_payload.is_some() {
                StatusCode::BAD_REQUEST
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            };

            let payload = if let Some(db_info) = db_payload {
                json!({ "message": message, "db": db_info })
            } else {
                json!({ "message": message })
            };

            (status, Json(payload)).into_response()
        }
    }
}
