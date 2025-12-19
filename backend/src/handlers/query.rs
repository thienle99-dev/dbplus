use crate::app_state::AppState;
use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Json, Path, State},
    http::HeaderMap,
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::json;
use tokio_util::sync::CancellationToken;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ExecuteQueryParams {
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
    include_total_count: Option<bool>,
    confirmed_unsafe: Option<bool>,
}

#[derive(Deserialize)]
pub struct CancelQueryParams {
    query_id: String,
}

pub async fn cancel_query(
    State(state): State<AppState>,
    Json(payload): Json<CancelQueryParams>,
) -> impl IntoResponse {
    if let Some(entry) = state.queries.get(&payload.query_id) {
        entry.value().cancel();
    }
    StatusCode::OK
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
    State(state): State<AppState>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<ExecuteQueryParams>,
) -> impl IntoResponse {
    // 1. Extract Query ID
    let query_id = headers
        .get("X-Query-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    // 2. Setup Cancellation Token
    let cancellation_token = CancellationToken::new();
    if let Some(qid) = &query_id {
        state
            .queries
            .insert(qid.clone(), cancellation_token.clone());
    }

    let service = ConnectionService::new(state.db.clone())
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(
            &headers,
        ));

    // 3. Wrap execution in select!
    let execution_future = service.execute_query_with_options(
        connection_id,
        &payload.query,
        payload.limit,
        payload.offset,
        payload.include_total_count.unwrap_or(false),
        payload.confirmed_unsafe.unwrap_or(false),
    );

    let result = tokio::select! {
        res = execution_future => res,
        _ = cancellation_token.cancelled() => {
             Err(anyhow::anyhow!("Query cancelled"))
        }
    };

    // 4. Cleanup
    if let Some(qid) = &query_id {
        state.queries.remove(qid);
    }

    match result {
        Ok(result) => {
            // Invalidate cache if DDL was executed
            let schema_cache = &state.schema_cache;
            let database_name = headers
                .get("X-Database")
                .and_then(|h| h.to_str().ok())
                .unwrap_or("postgres"); // Default database name

            if let Err(e) = schema_cache
                .invalidate_from_ddl(connection_id, database_name, &payload.query)
                .await
            {
                tracing::warn!("Failed to invalidate cache after DDL: {}", e);
            }

            (StatusCode::OK, Json(result)).into_response()
        }
        Err(e) => {
            let message = e.to_string();
            if message == "Query cancelled" {
                // Return 499 Client Closed Request (standard-ish for cancellations) or 200 with error?
                // Let's return 400 for now or custom json.
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "message": "Query cancelled" })),
                )
                    .into_response();
            }

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
