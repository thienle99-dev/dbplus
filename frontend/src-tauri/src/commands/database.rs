use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct DatabaseRequest {
    pub name: String,
}

#[tauri::command]
pub async fn list_databases(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<String>, String> {
    // TODO: Implement list_databases via ConnectionService
    Err("Database listing not yet implemented via IPC".to_string())
}

#[tauri::command]
pub async fn create_database(
    state: State<'_, AppState>,
    connection_id: String,
    request: DatabaseRequest,
) -> Result<(), String> {
    // TODO: Implement create_database via ConnectionService
    Err("Database creation not yet implemented via IPC".to_string())
}

#[tauri::command]
pub async fn drop_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    // TODO: Implement drop_database via ConnectionService
    Err("Database deletion not yet implemented via IPC".to_string())
}
