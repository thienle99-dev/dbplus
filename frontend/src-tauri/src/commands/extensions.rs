use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[tauri::command]
pub async fn list_extensions(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    // TODO: Implement list_extensions via ConnectionService
    Err("Extension listing not yet implemented via IPC".to_string())
}

#[tauri::command]
pub async fn install_extension(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    // TODO: Implement install_extension via ConnectionService
    Err("Extension installation not yet implemented via IPC".to_string())
}
