use crate::app_state::AppState;
use crate::services::autocomplete::RefreshScope;
use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};

use uuid::Uuid;

#[derive(Deserialize)]
pub struct RefreshSchemaRequest {
    pub scope: String, // "all", "schema", or "table"
    pub schema_name: Option<String>,
    pub table_name: Option<String>,
}

#[derive(Serialize)]
pub struct RefreshSchemaResponse {
    pub success: bool,
    pub message: String,
}

pub async fn refresh_schema(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<RefreshSchemaRequest>,
) -> impl IntoResponse {
    let schema_cache = &state.schema_cache;

    // Parse scope
    let scope = match payload.scope.as_str() {
        "all" => RefreshScope::All,
        "schema" => {
            let Some(schema_name) = payload.schema_name else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(RefreshSchemaResponse {
                        success: false,
                        message: "schema_name required for scope 'schema'".to_string(),
                    }),
                )
                    .into_response();
            };
            RefreshScope::Schema(schema_name)
        }
        "table" => {
            let Some(schema_name) = payload.schema_name else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(RefreshSchemaResponse {
                        success: false,
                        message: "schema_name required for scope 'table'".to_string(),
                    }),
                )
                    .into_response();
            };
            let Some(table_name) = payload.table_name else {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(RefreshSchemaResponse {
                        success: false,
                        message: "table_name required for scope 'table'".to_string(),
                    }),
                )
                    .into_response();
            };
            RefreshScope::Table {
                schema_name,
                table_name,
            }
        }
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(RefreshSchemaResponse {
                    success: false,
                    message: format!("Invalid scope: {}", payload.scope),
                }),
            )
                .into_response();
        }
    };

    // Get connection and password
    let service = match ConnectionService::new(state.db.clone()) {
        Ok(s) => s,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(RefreshSchemaResponse {
                    success: false,
                    message: format!("Failed to create connection service: {}", e),
                }),
            )
                .into_response();
        }
    };

    let (connection, password) = match service.get_connection_with_password(connection_id).await {
        Ok(cp) => cp,
        Err(e) => {
            return (
                StatusCode::NOT_FOUND,
                Json(RefreshSchemaResponse {
                    success: false,
                    message: format!("Connection not found: {}", e),
                }),
            )
                .into_response();
        }
    };

    // Create driver based on database type
    let driver: std::sync::Arc<dyn crate::services::db_driver::DatabaseDriver> =
        match connection.db_type.as_str() {
            "postgres" | "cockroachdb" | "cockroach" => {
                match crate::services::postgres_driver::PostgresDriver::new(&connection, &password)
                    .await
                {
                    Ok(d) => std::sync::Arc::new(d),
                    Err(e) => {
                        return (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            Json(RefreshSchemaResponse {
                                success: false,
                                message: format!("Failed to create driver: {}", e),
                            }),
                        )
                            .into_response();
                    }
                }
            }
            _ => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(RefreshSchemaResponse {
                        success: false,
                        message: format!("Unsupported database type: {}", connection.db_type),
                    }),
                )
                    .into_response();
            }
        };

    let database_name = connection.database.clone();

    // Perform refresh
    match schema_cache
        .refresh(connection_id, &database_name, scope, driver)
        .await
    {
        Ok(_) => (
            StatusCode::OK,
            Json(RefreshSchemaResponse {
                success: true,
                message: "Schema cache refreshed successfully".to_string(),
            }),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(RefreshSchemaResponse {
                success: false,
                message: format!("Failed to refresh schema cache: {}", e),
            }),
        )
            .into_response(),
    }
}
