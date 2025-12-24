use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExtensionInfo {
    pub name: String,
    pub version: String,
    pub schema: String,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn list_extensions(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<ExtensionInfo>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let extensions = service.list_extensions(uuid)
        .await
        .map_err(|e| e.to_string())?;

    Ok(extensions.into_iter().map(|e| ExtensionInfo {
        name: e.name,
        version: e.version,
        schema: e.schema,
        description: e.description,
    }).collect())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InstallExtensionRequest {
    pub name: String,
    pub schema: Option<String>,
    pub version: Option<String>,
}

#[tauri::command]
pub async fn install_extension(
    state: State<'_, AppState>,
    connection_id: String,
    request: InstallExtensionRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.install_extension(uuid, &request.name, request.schema.as_deref(), request.version.as_deref())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_extension(
    state: State<'_, AppState>,
    connection_id: String,
    name: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.drop_extension(uuid, &name)
        .await
        .map_err(|e| e.to_string())
}
