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

    use dbplus_backend::services::db_driver::ExtensionDriver;
    let result = driver.list_extensions()
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn install_extension(
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

    use dbplus_backend::services::db_driver::ExtensionDriver;
    driver.install_extension(&name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
