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
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let backend_result = service.execute_query(uuid, &request.sql)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(QueryResult {
        columns: backend_result.columns,
        rows: backend_result.rows,
        affected_rows: backend_result.affected_rows,
        column_metadata: None, 
        total_count: backend_result.total_count,
        limit: backend_result.limit,
        offset: backend_result.offset,
        has_more: backend_result.has_more,
        row_metadata: None,
        execution_time_ms: backend_result.execution_time_ms,
        json: backend_result.json,
        display_mode: backend_result.display_mode,
    })
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
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let json_result = service.explain_query(uuid, &request.sql, false) // Default analyze to false for basic explain
        .await
        .map_err(|e| e.to_string())?;

    Ok(QueryResult {
        columns: vec!["EXPLAIN".to_string()],
        rows: vec![],
        affected_rows: 0,
        column_metadata: None,
        total_count: None,
        limit: None,
        offset: None,
        has_more: None,
        row_metadata: None,
        execution_time_ms: None,
        json: Some(json_result),
        display_mode: Some("json".to_string()),
    })
}
