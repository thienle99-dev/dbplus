use crate::app_state::AppState;
use crate::services::connection_service::ConnectionService;
use crate::services::postgres::{ForeignKeyInfo, PostgresDriver};
use axum::{
    extract::{Path, Query, State},
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct SchemaParams {
    pub schema: String,
    pub database: Option<String>,
}

pub async fn get_foreign_keys(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Query(params): Query<SchemaParams>,
) -> Result<Json<Vec<ForeignKeyInfo>>, String> {
    let service = ConnectionService::new(state.db.clone()).map_err(|e| e.to_string())?;

    // Get connection details
    let (conn, password) = service
        .get_connection_with_password(id)
        .await
        .map_err(|e| e.to_string())?;

    if conn.db_type != "postgres" {
        return Err("Only PostgreSQL is supported for foreign keys currently".to_string());
    }

    // Override database if specified
    let mut conn_for_driver = conn.clone();
    if let Some(ref db) = params.database {
        conn_for_driver.database = db.clone();
    }

    let driver = PostgresDriver::new(&conn_for_driver, &password)
        .await
        .map_err(|e| e.to_string())?;

    let foreign_keys = driver
        .foreign_key()
        .get_foreign_keys(&params.schema)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Json(foreign_keys))
}
