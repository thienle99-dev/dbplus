use crate::services::connection_service::ConnectionService;
use axum::{
    body::Body,
    extract::{Json, Path, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    response::IntoResponse,
};
use bytes::Bytes;
use futures_util::StreamExt;
use sea_orm::DatabaseConnection;
use serde::Deserialize;
use serde_json::json;
use std::convert::Infallible;
use tokio::sync::mpsc;
use tokio_stream::wrappers::ReceiverStream;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct ExecuteQueryStreamParams {
    query: String,
    limit: Option<i64>,
    offset: Option<i64>,
    include_total_count: Option<bool>,
}

pub async fn execute_query_stream(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<ExecuteQueryStreamParams>,
) -> impl IntoResponse {
    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(crate::utils::request::database_override_from_headers(&headers));

    let (connection, password) = match service.get_connection_with_password(connection_id).await {
        Ok(v) => v,
        Err(e) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "message": e.to_string() })),
            )
                .into_response();
        }
    };

    let (tx, rx) = mpsc::channel::<Bytes>(64);
    let sql = payload.query;
    let limit = payload.limit;
    let offset = payload.offset;
    let include_total_count = payload.include_total_count.unwrap_or(false);

    tokio::spawn(async move {
        async fn send_line(tx: &mpsc::Sender<Bytes>, value: serde_json::Value) {
            let mut buf = serde_json::to_vec(&value).unwrap_or_else(|_| b"{\"type\":\"error\",\"message\":\"serialization failed\"}".to_vec());
            buf.push(b'\n');
            let _ = tx.send(Bytes::from(buf)).await;
        }

        let result = match connection.db_type.as_str() {
            "postgres" => {
                use crate::services::postgres::PostgresConnection;
                use crate::services::postgres::PostgresQuery;

                async {
                    let conn = PostgresConnection::new(&connection, &password).await?;
                    let query = PostgresQuery::new(conn.pool().clone());
                    query
                        .stream_ndjson(&sql, limit, offset, include_total_count, tx.clone())
                        .await
                }
                .await
            }
            "sqlite" => {
                use crate::services::sqlite::SQLiteConnection;
                use crate::services::sqlite::SQLiteQuery;

                async {
                    let conn = SQLiteConnection::new(&connection, &password).await?;
                    let query = SQLiteQuery::new(conn.pool().clone());
                    query
                        .stream_ndjson(&sql, limit, offset, include_total_count, tx.clone())
                        .await
                }
                .await
            }
            _ => Err(anyhow::anyhow!("Unsupported database type")),
        };

        if let Err(e) = result {
            send_line(&tx, json!({ "type": "error", "message": e.to_string() })).await;
        }
    });

    let body_stream = ReceiverStream::new(rx).map(Ok::<Bytes, Infallible>);
    let mut resp = (StatusCode::OK, Body::from_stream(body_stream)).into_response();
    resp.headers_mut().insert(
        axum::http::header::CONTENT_TYPE,
        HeaderValue::from_static("application/x-ndjson; charset=utf-8"),
    );
    resp
}
