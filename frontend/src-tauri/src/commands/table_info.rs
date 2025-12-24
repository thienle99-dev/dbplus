use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct TableParams {
    pub schema: String,
    pub table: String,
}

#[tauri::command]
pub async fn get_table_constraints(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_constraints(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_table_statistics(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_statistics(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_table_indexes(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_indexes(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_table_triggers(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_triggers(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_table_comment(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_description(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn set_table_comment(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
    comment: Option<String>,
) -> Result<(), String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    driver.set_table_description(&schema, &table, comment)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_table_permissions(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_permissions(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_table_dependencies(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_table_dependencies(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_storage_bloat_info(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_storage_bloat_info(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_partitions(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_partitions(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn get_fk_orphans(
    state: State<'_, AppState>,
    connection_id: String,
    params: TableParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_fk_orphans(&params.schema, &params.table)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn list_roles(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.list_roles()
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[derive(Debug, Deserialize)]
pub struct SchemaPermissionParams {
    pub schema: String,
}

#[tauri::command]
pub async fn get_schema_permissions(
    state: State<'_, AppState>,
    connection_id: String,
    params: SchemaPermissionParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_schema_permissions(&params.schema)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[derive(Debug, Deserialize)]
pub struct FunctionPermissionParams {
    pub schema: String,
    pub function: String,
}

#[tauri::command]
pub async fn get_function_permissions(
    state: State<'_, AppState>,
    connection_id: String,
    params: FunctionPermissionParams,
) -> Result<serde_json::Value, String> {
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

    use dbplus_backend::services::db_driver::TableMetadataDriver;
    let result = driver.get_function_permissions(&params.schema, &params.function)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}
