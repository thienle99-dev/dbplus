use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct SqliteAttachmentRequest {
    pub name: String,
    pub file_path: String,
    pub read_only: bool,
}

#[tauri::command]
pub async fn list_sqlite_attachments(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let attachments = service.list_sqlite_attachments(uuid)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(attachments).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn attach_sqlite_database(
    state: State<'_, AppState>,
    connection_id: String,
    request: SqliteAttachmentRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.attach_sqlite_database(uuid, request.name, request.file_path, request.read_only)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn detach_sqlite_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.detach_sqlite_database(uuid, name)
        .await
        .map_err(|e| e.to_string())
}
