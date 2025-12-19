use crate::app_state::AppState;
use crate::services::autocomplete::{AutocompleteEngine, AutocompleteRequest, Suggestion};
use crate::services::connection_service::ConnectionService;
use crate::services::db_driver::DatabaseDriver;
use crate::services::postgres_driver::PostgresDriver;
use axum::{extract::State, http::StatusCode, Json};
use std::sync::Arc;

#[axum::debug_handler]
pub async fn get_suggestions(
    State(state): State<AppState>,
    Json(req): Json<AutocompleteRequest>,
) -> Result<Json<Vec<Suggestion>>, (StatusCode, String)> {
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (connection, password) = conn_service
        .get_connection_with_password(req.connection_id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    let driver: Arc<dyn DatabaseDriver> = match connection.db_type.as_str() {
        "postgres" | "cockroachdb" | "cockroach" => Arc::new(
            PostgresDriver::new(&connection, &password)
                .await
                .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?,
        ),
        _ => {
            return Err((
                StatusCode::BAD_REQUEST,
                "Unsupported database type for autocomplete".to_string(),
            ))
        }
    };

    let schema_cache = state.schema_cache.clone();
    let engine = AutocompleteEngine::new(schema_cache);

    let suggestions = engine
        .suggest(req, driver)
        .await
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(suggestions))
}
