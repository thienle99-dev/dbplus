use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct TableRef {
    pub schema: String,
    pub name: String,
    pub table_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnRef {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub is_foreign_key: bool,
    pub default_value: Option<String>,
}

#[tauri::command]
pub async fn schema_list_schemas(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<String>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.get_schemas(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn schema_list_tables(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> Result<Vec<TableRef>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let tables = conn_service.get_tables(uuid, &schema)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to TableRef format
    let table_refs: Vec<TableRef> = tables
        .into_iter()
        .map(|t| TableRef {
            schema: schema.clone(),
            name: t.name,
            table_type: t.table_type,
        })
        .collect();

    Ok(table_refs)
}

#[tauri::command]
pub async fn schema_get_columns(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    table: String,
) -> Result<Vec<ColumnRef>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let columns = conn_service.get_columns(uuid, &schema, &table)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to ColumnRef format
    let column_refs: Vec<ColumnRef> = columns
        .into_iter()
        .map(|c| ColumnRef {
            name: c.name,
            data_type: c.data_type,
            is_nullable: c.is_nullable,
            is_primary_key: c.is_primary_key,
            is_foreign_key: c.is_foreign_key,
            default_value: c.default_value,
        })
        .collect();

    Ok(column_refs)
}

#[tauri::command]
pub async fn schema_list_functions(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let result = conn_service.list_functions(uuid, &schema)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn schema_list_views(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let result = conn_service.list_views(uuid, &schema)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn schema_get_view_definition(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    view: String,
) -> Result<String, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.get_view_definition(uuid, &schema, &view)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn schema_get_function_definition(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
    function: String,
) -> Result<String, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    conn_service.get_function_definition(uuid, &schema, &function)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn schema_get_schema_foreign_keys(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::services::db_driver::SchemaDriver;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let result = conn_service.get_schema_foreign_keys(uuid, &schema)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::to_value(result).map_err(|e| e.to_string())?)
}

#[tauri::command]
pub async fn schema_list_schema_metadata(
    state: State<'_, AppState>,
    connection_id: String,
    schema: String,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let metadata = conn_service.get_schema_metadata(uuid, &schema)
        .await
        .map_err(|e| e.to_string())?;
    
    Ok(serde_json::json!({
        "schema": schema,
        "table_count": metadata.len(),
        "tables": metadata
    }))
}
