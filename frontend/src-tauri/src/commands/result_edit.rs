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

    // Build SET clause
    let set_clause: Vec<String> = request.updates.iter()
        .map(|(k, v)| format!("{} = {}", k, format_value(v)))
        .collect();

    // Build WHERE clause
    let where_clause: Vec<String> = request.primary_key.iter()
        .map(|(k, v)| format!("{} = {}", k, format_value(v)))
        .collect();

    let sql = format!(
        "UPDATE {}.{} SET {} WHERE {}",
        request.schema,
        request.table,
        set_clause.join(", "),
        where_clause.join(" AND ")
    );

    driver.query(&sql)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn delete_result_row(
    state: State<'_, AppState>,
    connection_id: String,
    request: DeleteRowRequest,
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

    // Build WHERE clause
    let where_clause: Vec<String> = request.primary_key.iter()
        .map(|(k, v)| format!("{} = {}", k, format_value(v)))
        .collect();

    let sql = format!(
        "DELETE FROM {}.{} WHERE {}",
        request.schema,
        request.table,
        where_clause.join(" AND ")
    );

    driver.query(&sql)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
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
