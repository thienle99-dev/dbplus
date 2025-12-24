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
    use dbplus_backend::services::connection_service::ConnectionService;
    
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

    driver.list_databases()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_database(
    state: State<'_, AppState>,
    connection_id: String,
    request: DatabaseRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::driver::extension::DatabaseManagementDriver;
    
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

    // Cast to DatabaseManagementDriver
    let db_mgmt = driver.as_any()
        .downcast_ref::<dyn DatabaseManagementDriver>()
        .ok_or_else(|| "Database management not supported for this driver".to_string())?;

    db_mgmt.create_database(&request.name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_database(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::driver::extension::DatabaseManagementDriver;
    
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

    // Cast to DatabaseManagementDriver
    let db_mgmt = driver.as_any()
        .downcast_ref::<dyn DatabaseManagementDriver>()
        .ok_or_else(|| "Database management not supported for this driver".to_string())?;

    db_mgmt.drop_database(&name)
        .await
        .map_err(|e| e.to_string())
}
