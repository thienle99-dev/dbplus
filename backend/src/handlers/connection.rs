use crate::models::entities::connection;
use crate::services::connection_service::ConnectionService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

use chrono::Utc;
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateConnectionRequest {
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    #[serde(default)]
    pub host: Option<String>,
    #[serde(default)]
    pub port: Option<i32>,
    pub database: String,
    #[serde(default)]
    pub username: Option<String>,
    #[serde(default)]
    pub password: Option<String>,
    #[serde(default)]
    pub ssl: Option<bool>,
    pub ssl_cert: Option<String>,
    #[serde(default)]
    pub ssl_mode: Option<String>,
    #[serde(default)]
    pub ssl_key_file: Option<String>,
    #[serde(default)]
    pub ssl_ca_file: Option<String>,
    #[serde(default)]
    pub ssl_cert_file: Option<String>,

    #[serde(default)]
    pub ssh_enabled: bool,
    #[serde(default)]
    pub ssh_host: Option<String>,
    #[serde(default)]
    pub ssh_port: Option<i32>,
    #[serde(default)]
    pub ssh_user: Option<String>,
    #[serde(default)]
    pub ssh_auth_type: Option<String>,
    #[serde(default)]
    pub ssh_password: Option<String>,
    #[serde(default)]
    pub ssh_key_file: Option<String>,
    #[serde(default)]
    pub ssh_key_passphrase: Option<String>,

    #[serde(default)]
    pub is_read_only: bool,
}

#[derive(Deserialize)]
pub struct SwitchDatabaseRequest {
    pub database: String,
}

// List all connections
pub async fn list_connections(State(db): State<DatabaseConnection>) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}. Please check ENCRYPTION_KEY environment variable.", e)
            ).into_response();
        }
    };

    match service.get_all_connections().await {
        Ok(connections) => {
            // Remove password from response for security
            let safe_connections: Vec<_> = connections
                .into_iter()
                .map(|mut conn| {
                    conn.password = String::new(); // Clear password
                    conn
                })
                .collect();
            (StatusCode::OK, Json(safe_connections)).into_response()
        }
        Err(e) => {
            tracing::error!("Failed to get connections: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to retrieve connections: {}", e),
            )
                .into_response()
        }
    }
}

// Get connection by ID
pub async fn get_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}", e),
            )
                .into_response();
        }
    };

    match service.get_connection_by_id(id).await {
        Ok(Some(mut connection)) => {
            // Remove password from response for security
            connection.password = String::new();
            (StatusCode::OK, Json(connection)).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, "Connection not found").into_response(),
        Err(e) => {
            tracing::error!("Failed to get connection: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to retrieve connection: {}", e),
            )
                .into_response()
        }
    }
}

// Create new connection
pub async fn create_connection(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateConnectionRequest>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}", e),
            )
                .into_response();
        }
    };

    // Validate required fields for non-SQLite connections
    if payload.db_type.as_str() != "sqlite" {
        if payload.host.as_deref().unwrap_or("").trim().is_empty()
            || payload.port.unwrap_or(0) <= 0
            || payload.username.as_deref().unwrap_or("").trim().is_empty()
        {
            return (
                StatusCode::BAD_REQUEST,
                "Missing required connection fields (host/port/username)",
            )
                .into_response();
        }
        if payload.password.as_deref().unwrap_or("").is_empty() {
            return (StatusCode::BAD_REQUEST, "Missing password").into_response();
        }
        if payload.database.trim().is_empty() {
            return (StatusCode::BAD_REQUEST, "Missing database").into_response();
        }
    }

    let (host, port, username, password) = if payload.db_type.as_str() == "sqlite" {
        ("".to_string(), 0, "".to_string(), "".to_string())
    } else {
        (
            payload.host.clone().unwrap_or_default(),
            payload.port.unwrap_or(5432),
            payload.username.clone().unwrap_or_default(),
            payload.password.clone().unwrap_or_default(),
        )
    };

    // Map DTO to Model (ID will be generated by service)
    let model = connection::Model {
        id: Uuid::new_v4(), // Placeholder, ignored by service
        name: payload.name,
        db_type: payload.db_type,
        host,
        port,
        database: payload.database,
        username,
        password,
        ssl: payload.ssl.unwrap_or(false),
        ssl_cert: payload.ssl_cert,
        ssl_mode: payload.ssl_mode,
        ssl_ca_file: payload.ssl_ca_file,
        ssl_key_file: payload.ssl_key_file,
        ssl_cert_file: payload.ssl_cert_file,
        ssh_enabled: payload.ssh_enabled,
        ssh_host: payload.ssh_host,
        ssh_port: payload.ssh_port,
        ssh_user: payload.ssh_user,
        ssh_auth_type: payload.ssh_auth_type,
        ssh_password: payload.ssh_password,
        ssh_key_file: payload.ssh_key_file,
        ssh_key_passphrase: payload.ssh_key_passphrase,
        is_read_only: payload.is_read_only,
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    match service.create_connection(model).await {
        Ok(connection) => (StatusCode::CREATED, Json(connection)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Update connection
pub async fn update_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateConnectionRequest>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}", e),
            )
                .into_response();
        }
    };

    let (host, port, username, password) = if payload.db_type.as_str() == "sqlite" {
        ("".to_string(), 0, "".to_string(), "".to_string())
    } else {
        (
            payload.host.clone().unwrap_or_default(),
            payload.port.unwrap_or(5432),
            payload.username.clone().unwrap_or_default(),
            payload.password.clone().unwrap_or_default(),
        )
    };

    let model = connection::Model {
        id,
        name: payload.name,
        db_type: payload.db_type,
        host,
        port,
        database: payload.database,
        username,
        password,
        ssl: payload.ssl.unwrap_or(false),
        ssl_cert: payload.ssl_cert,
        ssl_mode: payload.ssl_mode,
        ssl_ca_file: payload.ssl_ca_file,
        ssl_key_file: payload.ssl_key_file,
        ssl_cert_file: payload.ssl_cert_file,
        ssh_enabled: payload.ssh_enabled,
        ssh_host: payload.ssh_host,
        ssh_port: payload.ssh_port,
        ssh_user: payload.ssh_user,
        ssh_auth_type: payload.ssh_auth_type,
        ssh_password: payload.ssh_password,
        ssh_key_file: payload.ssh_key_file,
        ssh_key_passphrase: payload.ssh_key_passphrase,
        is_read_only: payload.is_read_only,
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    match service.update_connection(id, model).await {
        Ok(connection) => (StatusCode::OK, Json(connection)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Switch database for a saved connection (without changing other fields)
pub async fn switch_database(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(payload): Json<SwitchDatabaseRequest>,
) -> impl IntoResponse {
    let database = payload.database.trim().to_string();
    if database.is_empty() {
        return (StatusCode::BAD_REQUEST, "Database cannot be empty").into_response();
    }
    if database.len() > 63 {
        return (
            StatusCode::BAD_REQUEST,
            "Database name is too long (max 63 chars)",
        )
            .into_response();
    }

    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}", e),
            )
                .into_response();
        }
    };

    match service.update_connection_database(id, database).await {
        Ok(connection) => (StatusCode::OK, Json(connection)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Delete connection
pub async fn delete_connection(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Failed to initialize service: {}", e),
            )
                .into_response();
        }
    };
    match service.delete_connection(id).await {
        Ok(_) => (StatusCode::NO_CONTENT, ()).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

#[derive(serde::Serialize)]
struct TestConnectionResponse {
    success: bool,
    message: String,
}

// Test connection
pub async fn test_connection(
    State(db): State<DatabaseConnection>,
    Json(payload): Json<CreateConnectionRequest>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(TestConnectionResponse {
                    success: false,
                    message: format!("Failed to initialize service: {}", e),
                }),
            )
                .into_response();
        }
    };

    tracing::info!(
        "Testing connection attempt for: {} ({})",
        payload.name,
        payload.db_type
    );
    let connection_name = payload.name.clone();
    let host = payload.host.clone().unwrap_or_default();
    let port = payload.port.unwrap_or(0);

    // Create a temporary model from request
    let model = connection::Model {
        id: Uuid::new_v4(),
        name: payload.name,
        db_type: payload.db_type,
        host: host.clone(),
        port,
        database: payload.database,
        username: payload.username.clone().unwrap_or_default(),
        password: payload.password.clone().unwrap_or_default(),
        ssl: payload.ssl.unwrap_or(false),
        ssl: payload.ssl.unwrap_or(false),
        ssl_cert: payload.ssl_cert,
        ssl_mode: payload.ssl_mode,
        ssl_ca_file: payload.ssl_ca_file,
        ssl_key_file: payload.ssl_key_file,
        ssl_cert_file: payload.ssl_cert_file,
        ssh_enabled: payload.ssh_enabled,
        ssh_host: payload.ssh_host,
        ssh_port: payload.ssh_port,
        ssh_user: payload.ssh_user,
        ssh_auth_type: payload.ssh_auth_type,
        ssh_password: payload.ssh_password,
        ssh_key_file: payload.ssh_key_file,
        ssh_key_passphrase: payload.ssh_key_passphrase,
        is_read_only: payload.is_read_only,
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    match service
        .test_connection(model, payload.password.as_deref().unwrap_or(""))
        .await
    {
        Ok(_) => {
            tracing::info!("Connection test successful for: {}", connection_name);
            (
                StatusCode::OK,
                Json(TestConnectionResponse {
                    success: true,
                    message: "Connection successful".to_string(),
                }),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Connection test failed for {}: {:?}", connection_name, e);
            let error_msg = format!("{}", e);
            let message = if error_msg.contains("connection refused")
                || error_msg.contains("Connection refused")
            {
                format!("Cannot connect to PostgreSQL server at {}:{}. Please check if the server is running and the host/port are correct.", host, port)
            } else if error_msg.contains("password authentication failed")
                || error_msg.contains("authentication failed")
            {
                "Authentication failed. Please check your username and password.".to_string()
            } else if error_msg.contains("does not exist") {
                format!("Database connection failed: {}", error_msg)
            } else {
                format!("Connection failed: {}", error_msg)
            };
            (
                StatusCode::BAD_REQUEST,
                Json(TestConnectionResponse {
                    success: false,
                    message,
                }),
            )
                .into_response()
        }
    }
}

// Test existing connection by ID (without exposing password)
pub async fn test_connection_by_id(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let service = match ConnectionService::new(db) {
        Ok(service) => service,
        Err(e) => {
            tracing::error!("Failed to create ConnectionService: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(TestConnectionResponse {
                    success: false,
                    message: format!("Failed to initialize service: {}", e),
                }),
            )
                .into_response();
        }
    };

    tracing::info!("Testing existing connection: {}", id);

    match service.get_connection_with_password(id).await {
        Ok((connection, password)) => {
            let connection_name = connection.name.clone();
            let host = connection.host.clone();
            let port = connection.port;

            match service.test_connection(connection, &password).await {
                Ok(_) => {
                    tracing::info!("Connection test successful for: {}", connection_name);
                    (
                        StatusCode::OK,
                        Json(TestConnectionResponse {
                            success: true,
                            message: "Connection successful".to_string(),
                        }),
                    )
                        .into_response()
                }
                Err(e) => {
                    tracing::error!("Connection test failed for {}: {:?}", connection_name, e);
                    let error_msg = format!("{}", e);
                    let message = if error_msg.contains("connection refused")
                        || error_msg.contains("Connection refused")
                    {
                        format!("Cannot connect to PostgreSQL server at {}:{}. Please check if the server is running and the host/port are correct.", host, port)
                    } else if error_msg.contains("password authentication failed")
                        || error_msg.contains("authentication failed")
                    {
                        "Authentication failed. Please check your username and password."
                            .to_string()
                    } else if error_msg.contains("does not exist") {
                        format!("Database connection failed: {}", error_msg)
                    } else {
                        format!("Connection failed: {}", error_msg)
                    };
                    (
                        StatusCode::BAD_REQUEST,
                        Json(TestConnectionResponse {
                            success: false,
                            message,
                        }),
                    )
                        .into_response()
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to get connection: {}", e);
            (
                StatusCode::NOT_FOUND,
                Json(TestConnectionResponse {
                    success: false,
                    message: format!("Connection not found: {}", e),
                }),
            )
                .into_response()
        }
    }
}
