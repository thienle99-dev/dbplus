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
    pub is_primary_key: Option<bool>,
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
    use dbplus_backend::services::db_driver::SchemaDriver;
    
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

    // Convert to backend column definition
    let columns: Vec<_> = request.columns.into_iter().map(|c| {
        dbplus_backend::services::db_driver::ColumnDefinition {
            name: c.name,
            data_type: c.data_type,
            is_nullable: c.is_nullable,
            is_primary_key: c.is_primary_key,
            default_value: c.default_value,
        }
    }).collect();

    driver.create_table(&request.schema, &request.table_name, &columns)
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
    use dbplus_backend::services::db_driver::SchemaDriver;
    
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

    driver.drop_table(&request.schema, &request.table_name)
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
    use dbplus_backend::services::db_driver::SchemaDriver;
    
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

    let column_def = dbplus_backend::services::db_driver::ColumnDefinition {
        name: request.column_name,
        data_type: request.data_type,
        is_nullable: request.is_nullable,
        is_primary_key: None,
        default_value: request.default_value,
    };

    driver.add_column(&request.schema, &request.table, &column_def)
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
    use dbplus_backend::services::db_driver::SchemaDriver;
    
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

    driver.drop_column(&request.schema, &request.table, &request.column_name)
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

    let sql = format!("CREATE SCHEMA {}", schema_name);
    driver.query(&sql)
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

    let sql = format!("DROP SCHEMA {} CASCADE", schema_name);
    driver.query(&sql)
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

    let limit = request.limit.unwrap_or(100);
    let offset = request.offset.unwrap_or(0);
    
    let sql = format!(
        "SELECT * FROM {}.{} LIMIT {} OFFSET {}",
        request.schema, request.table, limit, offset
    );

    let result = driver.query(&sql)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}
