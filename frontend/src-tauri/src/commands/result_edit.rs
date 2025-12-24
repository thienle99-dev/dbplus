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
    // TODO: Implement update_result_row via ConnectionService
    Err("Result row updates not yet implemented via IPC".to_string())
}

#[tauri::command]
pub async fn delete_result_row(
    state: State<'_, AppState>,
    connection_id: String,
    request: DeleteRowRequest,
) -> Result<(), String> {
    // TODO: Implement delete_result_row via ConnectionService
    Err("Result row deletion not yet implemented via IPC".to_string())
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
