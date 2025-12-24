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
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    use dbplus_backend::services::db_driver::SqliteToolsDriver;
    let result = driver.list_attachments()
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn attach_sqlite_database(
    state: State<'_, AppState>,
    connection_id: String,
    request: SqliteAttachmentRequest,
) -> Result<(), String> {
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    use dbplus_backend::services::db_driver::SqliteToolsDriver;
    driver.attach_database(&request.name, &request.file_path, request.read_only)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn detach_sqlite_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    use dbplus_backend::services::db_driver::SqliteToolsDriver;
    driver.detach_database(&name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
