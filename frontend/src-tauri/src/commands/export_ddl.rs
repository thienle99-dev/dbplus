use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportDdlOptions {
    pub scope: String,
    pub database: Option<String>,
    pub schemas: Option<Vec<String>>,
    pub objects: Option<Vec<DdlObjectSpec>>,
    pub include_drop: Option<bool>,
    pub if_exists: Option<bool>,
    pub include_owner_privileges: Option<bool>,
    pub include_comments: Option<bool>,
    pub export_method: Option<String>,
    pub pg_dump_path: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DdlObjectSpec {
    pub object_type: String,
    pub schema: String,
    pub name: String,
}

#[derive(Debug, Serialize)]
pub struct ExportDdlResult {
    pub ddl: String,
    pub method: String,
}

#[tauri::command]
pub async fn export_postgres_ddl(
    state: State<'_, AppState>,
    connection_id: String,
    request: ExportDdlOptions,
) -> Result<ExportDdlResult, String> {
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let conn_service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, _password) = conn_service
        .get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;

    match connection.db_type.as_str() {
        "postgres" => {
            // Placeholder: This would call the specific Postgres DDL export logic
            Ok(ExportDdlResult {
                ddl: format!("-- Postgres DDL export via IPC placeholder\n-- Scope: {}\n-- Method: {:?}", 
                    request.scope, 
                    request.export_method.as_deref().unwrap_or("driver")
                ),
                method: request.export_method.unwrap_or_else(|| "driver".to_string()),
            })
        }
        _ => Err("DDL export only supported for Postgres currently".to_string())
    }
}
