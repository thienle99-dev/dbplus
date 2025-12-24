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
    use dbplus_backend::services::driver::QueryDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (mut connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    // Override database if specified in request
    if let Some(db) = request.database {
        connection.database = db;
    }

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    let start = std::time::Instant::now();
    let result = driver.query(&request.sql)
        .await
        .map_err(|e| e.to_string())?;
    let execution_time_ms = start.elapsed().as_millis() as u64;

    Ok(QueryResult {
        columns: result.columns,
        rows: result.rows,
        affected_rows: result.affected_rows,
        column_metadata: result.column_metadata.map(|metadata| {
            metadata.into_iter().map(|m| ColumnMetadata {
                name: m.name,
                data_type: m.data_type,
                is_nullable: m.is_nullable,
            }).collect()
        }),
        total_count: result.total_count,
        limit: result.limit,
        offset: result.offset,
        has_more: result.has_more,
        row_metadata: result.row_metadata.map(|metadata| {
            metadata.into_iter().map(|m| RowMetadata {
                primary_key: m.primary_key,
            }).collect()
        }),
        execution_time_ms: Some(execution_time_ms),
        json: result.json,
        display_mode: result.display_mode,
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
    use dbplus_backend::services::driver::QueryDriver;
    
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

    // Add EXPLAIN to the query
    let explain_sql = format!("EXPLAIN {}", request.sql);
    
    let result = driver.query(&explain_sql)
        .await
        .map_err(|e| e.to_string())?;

    Ok(QueryResult {
        columns: result.columns,
        rows: result.rows,
        affected_rows: result.affected_rows,
        column_metadata: result.column_metadata.map(|metadata| {
            metadata.into_iter().map(|m| ColumnMetadata {
                name: m.name,
                data_type: m.data_type,
                is_nullable: m.is_nullable,
            }).collect()
        }),
        total_count: result.total_count,
        limit: result.limit,
        offset: result.offset,
        has_more: result.has_more,
        row_metadata: result.row_metadata.map(|metadata| {
            metadata.into_iter().map(|m| RowMetadata {
                primary_key: m.primary_key,
            }).collect()
        }),
        execution_time_ms: result.execution_time_ms,
        json: result.json,
        display_mode: result.display_mode,
    })
}
