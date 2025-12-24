use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use dbplus_backend::services::connection_service::ConnectionService;

#[derive(Debug, Deserialize)]
pub struct ExecuteScriptRequest {
    pub script: String,
}

#[tauri::command]
pub async fn execute_script(
    state: State<'_, AppState>,
    connection_id: String,
    request: ExecuteScriptRequest,
) -> Result<serde_json::Value, String> {
    use dbplus_backend::services::connection_service::ConnectionService;

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let rows_affected = service.execute_script(uuid, &request.script)
        .await
        .map_err(|e| e.to_string())?;

    Ok(serde_json::json!({
        "rows_affected": rows_affected
    }))
}

#[tauri::command]
pub async fn backup_postgres_sql(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<String, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::models::export_ddl::{ExportDdlOptions, DdlScope};

    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let options = ExportDdlOptions {
        scope: DdlScope::Database,
        database: None, // Uses current DB
        schemas: None,
        objects: None,
        include_drop: false,
        if_exists: false,
        include_owner_privileges: true,
        include_comments: true,
        prefer_pg_dump: true,
        export_method: None,
        pg_dump_path: None,
    };

    service.export_ddl(uuid, options)
        .await
        .map_err(|e| e.to_string())
}
