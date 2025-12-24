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

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    driver.list_schemas()
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

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    let tables = driver.list_tables(&schema)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to TableRef format
    let table_refs: Vec<TableRef> = tables
        .into_iter()
        .map(|t| TableRef {
            schema: schema.clone(),
            name: t.name,
            table_type: t.table_type.unwrap_or_else(|| "TABLE".to_string()),
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

    let (connection, password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    let driver = conn_service
        .create_driver(&connection, &password)
        .await
        .map_err(|e| e.to_string())?;

    let columns = driver.list_columns(&schema, &table)
        .await
        .map_err(|e| e.to_string())?;

    // Convert to ColumnRef format
    let column_refs: Vec<ColumnRef> = columns
        .into_iter()
        .map(|c| ColumnRef {
            name: c.name,
            data_type: c.data_type,
            is_nullable: c.is_nullable,
            is_primary_key: c.is_primary_key.unwrap_or(false),
            is_foreign_key: c.is_foreign_key.unwrap_or(false),
            default_value: c.default_value,
        })
        .collect();

    Ok(column_refs)
}
