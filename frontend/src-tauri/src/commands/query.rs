use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExecuteQueryRequest {
    pub sql: String,
    #[serde(default)]
    pub database: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub affected_rows: u64,
    pub column_metadata: Option<Vec<ColumnMetadata>>,
    pub total_count: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    pub has_more: Option<bool>,
    pub row_metadata: Option<Vec<RowMetadata>>,
    pub execution_time_ms: Option<u64>,
    pub json: Option<serde_json::Value>,
    pub display_mode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnMetadata {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RowMetadata {
    pub primary_key: std::collections::HashMap<String, serde_json::Value>,
}

#[tauri::command]
pub async fn execute_query(
    state: State<'_, AppState>,
    connection_id: String,
    request: ExecuteQueryRequest,
) -> Result<QueryResult, String> {
    // TODO: Implement execute_query via ConnectionService
    Err("Query execution not yet fully implemented via IPC".to_string())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CancelQueryRequest {
    pub query_id: String,
}

#[tauri::command]
pub async fn cancel_query(
    state: State<'_, AppState>,
    request: CancelQueryRequest,
) -> Result<(), String> {
    if let Some(token) = state.queries.get(&request.query_id) {
        token.cancel();
        Ok(())
    } else {
        Err("Query not found".to_string())
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExplainQueryRequest {
    pub sql: String,
}

#[tauri::command]
pub async fn explain_query(
    state: State<'_, AppState>,
    connection_id: String,
    request: ExplainQueryRequest,
) -> Result<QueryResult, String> {
    // TODO: Implement explain_query via ConnectionService
    Err("Query explanation not yet fully implemented via IPC".to_string())
}
