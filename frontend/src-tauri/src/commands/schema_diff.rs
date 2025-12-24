use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct SchemaDiffRequest {
    pub source_connection_id: String,
    pub target_connection_id: String,
    pub source_schema: String,
    pub target_schema: String,
}

#[tauri::command]
pub async fn compare_schemas(
    state: State<'_, AppState>,
    request: SchemaDiffRequest,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let source_uuid = Uuid::parse_str(&request.source_connection_id).map_err(|e| e.to_string())?;
    let target_uuid = Uuid::parse_str(&request.target_connection_id).map_err(|e| e.to_string())?;

    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let diff = service.compare_schemas(
        source_uuid,
        target_uuid,
        request.source_schema,
        request.target_schema
    ).await.map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(diff).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn generate_migration(
    state: State<'_, AppState>,
    request: SchemaDiffRequest,
) -> Result<String, String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let source_uuid = Uuid::parse_str(&request.source_connection_id).map_err(|e| e.to_string())?;
    let target_uuid = Uuid::parse_str(&request.target_connection_id).map_err(|e| e.to_string())?;

    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.generate_migration(
        source_uuid,
        target_uuid,
        request.source_schema,
        request.target_schema
    ).await.map_err(|e| e.to_string())
}
