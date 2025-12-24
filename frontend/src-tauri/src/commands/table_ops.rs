use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTableRequest {
    pub schema: String,
    pub table_name: String,
    pub columns: Vec<ColumnDefinition>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnDefinition {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DropTableRequest {
    pub schema: String,
    pub table_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddColumnRequest {
    pub schema: String,
    pub table: String,
    pub column_name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AlterColumnRequest {
    pub schema: String,
    pub table: String,
    pub column_name: String,
    pub new_data_type: Option<String>,
    pub new_nullable: Option<bool>,
    pub new_default: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DropColumnRequest {
    pub schema: String,
    pub table: String,
    pub column_name: String,
}

#[tauri::command]
pub async fn create_table(
    state: State<'_, AppState>,
    connection_id: String,
    request: CreateTableRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    // Convert to backend column definition
    let columns: Vec<_> = request.columns.into_iter().map(|c| {
        dbplus_backend::services::db_driver::ColumnDefinition {
            name: c.name,
            data_type: c.data_type,
            is_nullable: c.is_nullable,
            default_value: c.default_value,
        }
    }).collect();

    conn_service.create_table(uuid, &request.schema, &request.table_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_table(
    state: State<'_, AppState>,
    connection_id: String,
    request: DropTableRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.drop_table(uuid, &request.schema, &request.table_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_column(
    state: State<'_, AppState>,
    connection_id: String,
    request: AddColumnRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let column_def = dbplus_backend::services::db_driver::ColumnDefinition {
        name: request.column_name,
        data_type: request.data_type,
        is_nullable: request.is_nullable,
        default_value: request.default_value,
    };

    conn_service.add_column(uuid, &request.schema, &request.table, column_def)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn drop_column(
    state: State<'_, AppState>,
    connection_id: String,
    request: DropColumnRequest,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.drop_column(uuid, &request.schema, &request.table, &request.column_name)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_schema(
    state: State<'_, AppState>,
    connection_id: String,
    schema_name: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.create_schema(uuid, &schema_name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn drop_schema(
    state: State<'_, AppState>,
    connection_id: String,
    schema_name: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.drop_schema(uuid, &schema_name)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GetTableDataRequest {
    pub schema: String,
    pub table: String,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[tauri::command]
pub async fn get_table_data(
    state: State<'_, AppState>,
    connection_id: String,
    request: GetTableDataRequest,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let limit = request.limit.unwrap_or(100);
    let offset = request.offset.unwrap_or(0);

    let result = conn_service.get_table_data(uuid, &request.schema, &request.table, limit, offset)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}
