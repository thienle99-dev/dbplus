use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[tauri::command]
pub async fn list_sessions(
    state: State<'_, AppState>,
    id: String,
) -> Result<serde_json::Value, String> {
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let sessions = conn_service
        .get_active_sessions(uuid)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(sessions).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn kill_session(
    state: State<'_, AppState>,
    id: String,
    pid: i32,
) -> Result<(), String> {
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service
        .kill_session(uuid, pid)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
