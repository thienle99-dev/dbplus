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
pub struct SearchParams {
    q: String,
    #[serde(default)]
    pub database: Option<String>,
}

pub async fn search_objects(
    State(db): State<DatabaseConnection>,
    headers: HeaderMap,
    Path(connection_id): Path<Uuid>,
    Query(params): Query<SearchParams>,
) -> impl IntoResponse {
    let query = params.q.trim();
    if query.is_empty() {
        return (
            StatusCode::OK,
            Json(Vec::<crate::services::db_driver::SearchResult>::new()),
        )
            .into_response();
    }

    tracing::info!(
        "[API] GET /connections/{}/search - q: {}",
        connection_id,
        query
    );

    let service = ConnectionService::new(db)
        .expect("Failed to create service")
        .with_database_override(
            params
                .database
                .or_else(|| crate::utils::request::database_override_from_headers(&headers)),
        );

    match service.search_objects(connection_id, query).await {
        Ok(results) => {
            tracing::info!(
                "[API] GET /search - SUCCESS - found {} results",
                results.len()
            );
            (StatusCode::OK, Json(results)).into_response()
        }
        Err(e) => {
            tracing::error!("[API] GET /search - ERROR: {}", e);
            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response()
        }
    }
}
