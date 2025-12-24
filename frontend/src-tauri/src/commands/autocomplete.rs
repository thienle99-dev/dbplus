use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use std::sync::Arc;
use dbplus_backend::services::connection_service::ConnectionService;
use dbplus_backend::services::postgres_driver::PostgresDriver;
use dbplus_backend::services::db_driver::DatabaseDriver;
use dbplus_backend::services::autocomplete::{AutocompleteEngine, AutocompleteRequest};

#[derive(Debug, Serialize, Deserialize)]
pub struct Suggestion {
    pub label: String,
    pub insert_text: String,
    pub kind: String,
    pub detail: Option<String>,
    pub score: i32,
}

#[derive(Serialize, Deserialize)]
struct AutocompleteRequestPayload {
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
    database_name: Option<String>,
}

#[tauri::command]
pub async fn autocomplete_suggest(
    state: State<'_, AppState>,
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
) -> Result<Vec<Suggestion>, String> {
    let uuid = uuid::Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // 1. Get Connection Service
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    // 2. Get Connection & Password
    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    // 3. Create Driver
    // Note: Currently primarily supporting Postgres for autocomplete as per backend handler
    let mut connection_to_use = connection.clone();
    
    // If we supported switching DB in request (like in backend handler), we would handle it here.
    // For now, using connection's database.

    let driver: Arc<dyn DatabaseDriver> = match connection_to_use.db_type.as_str() {
        "postgres" | "cockroachdb" | "cockroach" => Arc::new(
            PostgresDriver::new(&connection_to_use, &password)
                .await
                .map_err(|e| e.to_string())?,
        ),
        _ => return Err("Unsupported database type for autocomplete".to_string()),
    };

    // 4. Create Engine
    let schema_cache = state.schema_cache.clone();
    let engine = AutocompleteEngine::new(schema_cache);

    let request = AutocompleteRequest {
        connection_id: uuid,
        sql,
        cursor_pos,
        active_schema,
        database_name: None,
    };

    // 5. Get Suggestions
    let backend_suggestions = engine.suggest(request, driver).await.map_err(|e| e.to_string())?;

    // 6. Access private fields or map?
    // The backend Suggestion struct has public fields, so we can access them.
    let suggestions = backend_suggestions
        .into_iter()
        .map(|s| Suggestion {
            label: s.label,
            insert_text: s.insert_text,
            kind: s.kind,
            detail: s.detail,
            score: s.score,
        })
        .collect();

    Ok(suggestions)
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RefreshScope {
    All,
    Schema(String),
    Table { schema_name: String, table_name: String },
}

#[tauri::command]
pub async fn schema_refresh(
    state: State<'_, AppState>,
    connection_id: String,
    scope: Option<RefreshScope>,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // Map to backend RefreshScope
    let backend_scope = match scope {
        Some(RefreshScope::All) | None => dbplus_backend::services::autocomplete::RefreshScope::All,
        Some(RefreshScope::Schema(s)) => dbplus_backend::services::autocomplete::RefreshScope::Schema(s),
        Some(RefreshScope::Table { schema_name, table_name }) => dbplus_backend::services::autocomplete::RefreshScope::Table {
            schema_name,
            table_name,
        },
    };

    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver: Arc<dyn DatabaseDriver> = match connection.db_type.as_str() {
        "postgres" | "cockroachdb" | "cockroach" => Arc::new(
            PostgresDriver::new(&connection, &password)
                .await
                .map_err(|e| e.to_string())?,
        ),
        _ => return Err("Unsupported database type for schema refresh".to_string()),
    };

    let database_name = connection.database.clone();

    state
        .schema_cache
        .refresh(uuid, &database_name, backend_scope, driver)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
