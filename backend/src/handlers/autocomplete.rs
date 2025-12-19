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
    tracing::info!(
        "Autocomplete request - sql: '{}', cursor: {}",
        req.sql,
        req.cursor_pos
    );
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let (connection, password) = conn_service
        .get_connection_with_password(req.connection_id)
        .await
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    // If database_name is provided in request and differs from connection.database,
    // we should attempt to create a driver for that specific database.
    let mut connection_to_use = connection.clone();
    if let Some(target_db) = &req.database_name {
        if target_db != &connection.database {
            tracing::info!(
                "Database mismatch: connection uses '{}', but request wants '{}'. Switching driver target.",
                connection.database,
                target_db
            );
            connection_to_use.database = target_db.clone();
        }
    }

    let driver: Arc<dyn DatabaseDriver> = match connection_to_use.db_type.as_str() {
        "postgres" | "cockroachdb" | "cockroach" => Arc::new(
            PostgresDriver::new(&connection_to_use, &password)
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

    let suggestions = engine.suggest(req, driver).await.map_err(|e| {
        tracing::error!("Autocomplete engine error: {}", e);
        (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
    })?;

    tracing::info!("Returning {} suggestions", suggestions.len());

    Ok(Json(suggestions))
}
