use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateRowRequest {
    pub schema: String,
    pub table: String,
    pub primary_key: std::collections::HashMap<String, serde_json::Value>,
    pub updates: std::collections::HashMap<String, serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteRowRequest {
    pub schema: String,
    pub table: String,
    pub primary_key: std::collections::HashMap<String, serde_json::Value>,
}

#[tauri::command]
pub async fn update_result_row(
    state: State<'_, AppState>,
    connection_id: String,
    request: UpdateRowRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.update_row(
        uuid,
        &request.schema,
        &request.table,
        request.primary_key,
        request.updates,
        None
    )
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_result_row(
    state: State<'_, AppState>,
    connection_id: String,
    request: DeleteRowRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    service.delete_row(
        uuid,
        &request.schema,
        &request.table,
        request.primary_key,
        None
    )
    .await
    .map(|_| ())
    .map_err(|e| e.to_string())
}

fn format_value(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "NULL".to_string(),
        serde_json::Value::String(s) => format!("'{}'", s.replace("'", "''")),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        _ => format!("'{}'", value.to_string().replace("'", "''")),
    }
}
