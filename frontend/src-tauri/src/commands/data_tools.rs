use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct ExecuteScriptRequest {
    pub script: String,
}

#[tauri::command]
pub async fn execute_script(
    state: State<'_, AppState>,
    connection_id: String,
    request: ExecuteScriptRequest,
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

    use dbplus_backend::services::driver::QueryDriver;
    let result = driver.query(&request.script)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn backup_postgres_sql(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<String, String> {
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
    
    // In the original handler, this was likely using pg_dump or a custom service
    // For now, we'll return an error or a placeholder if the specific service isn't exposed
    Err("Postgres SQL backup via IPC not yet fully implemented in driver library".to_string())
}
