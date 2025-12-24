use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
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
    #[serde(default)]
    pub environment: Option<String>,
    #[serde(default)]
    pub safe_mode_level: Option<i32>,
    #[serde(default)]
    pub status_color: Option<String>,
    #[serde(default)]
    pub tags: Option<String>,
    #[serde(default)]
    pub id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SwitchDatabaseRequest {
    pub database: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub message: String,
}

#[tauri::command]
pub async fn list_connections(
    state: State<'_, AppState>,
) -> Result<Vec<dbplus_backend::models::entities::connection::Model>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;
    
    let connections = service.get_all_connections()
        .await
        .map_err(|e| e.to_string())?;
    
    // Remove passwords for security
    let safe_connections: Vec<_> = connections
        .into_iter()
        .map(|mut conn| {
            conn.password = String::new();
            conn
        })
        .collect();
    
    Ok(safe_connections)
}

#[tauri::command]
pub async fn get_connection(
    state: State<'_, AppState>,
    id: String,
) -> Result<Option<dbplus_backend::models::entities::connection::Model>, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;
    
    let connection = service.get_connection_by_id(uuid)
        .await
        .map_err(|e| e.to_string())?;
    
    // Remove password for security
    Ok(connection.map(|mut conn| {
        conn.password = String::new();
        conn
    }))
}

#[tauri::command]
pub async fn create_connection(
    state: State<'_, AppState>,
    request: CreateConnectionRequest,
) -> Result<dbplus_backend::models::entities::connection::Model, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::models::entities::connection;
    use chrono::Utc;
    
    println!("[Create Connection] Request received: name={}, type={}", request.name, request.db_type);

    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| {
            println!("[Create Connection] Service init failed: {}", e);
            e.to_string()
        })?;
    
    // Validate required fields for non-SQLite connections
    if request.db_type.as_str() != "sqlite" {
        if request.host.as_deref().unwrap_or("").trim().is_empty()
            || request.port.unwrap_or(0) <= 0
            || request.username.as_deref().unwrap_or("").trim().is_empty()
        {
            println!("[Create Connection] Validation failed: Missing required fields");
            return Err("Missing required connection fields (host/port/username)".to_string());
        }
        if request.db_type != "clickhouse"
            && request.db_type != "tidb"
            && request.db_type != "mysql"
            && request.db_type != "mariadb"
            && request.db_type != "couchbase"
            && request.database.trim().is_empty()
        {
            println!("[Create Connection] Validation failed: Missing database");
            return Err("Missing database".to_string());
        }
    }

    // ... (rest of field extraction matches original) ...
    let (host, port, username, password) = if request.db_type.as_str() == "sqlite" {
        ("".to_string(), 0, "".to_string(), "".to_string())
    } else {
        (
            request.host.clone().unwrap_or_default(),
            request.port.unwrap_or(match request.db_type.as_str() {
                "clickhouse" => 8123,
                "mysql" | "mariadb" | "tidb" => 3306,
                "couchbase" => 8091,
                "cockroach" | "cockroachdb" => 26257,
                _ => 5432,
            }),
            request.username.clone().unwrap_or_default(),
            request.password.clone().unwrap_or_default(),
        )
    };

    let model = connection::Model {
        id: Uuid::new_v4(),
        name: request.name,
        db_type: request.db_type,
        host,
        port,
        database: request.database,
        username,
        password,
        ssl: request.ssl.unwrap_or(false),
        ssl_cert: request.ssl_cert,
        ssl_mode: request.ssl_mode,
        ssl_ca_file: request.ssl_ca_file,
        ssl_key_file: request.ssl_key_file,
        ssl_cert_file: request.ssl_cert_file,
        status_color: request.status_color,
        tags: request.tags,
        ssh_enabled: request.ssh_enabled,
        ssh_host: request.ssh_host,
        ssh_port: request.ssh_port,
        ssh_user: request.ssh_user,
        ssh_auth_type: request.ssh_auth_type,
        ssh_password: request.ssh_password,
        ssh_key_file: request.ssh_key_file,
        ssh_key_passphrase: request.ssh_key_passphrase,
        is_read_only: request.is_read_only,
        environment: request.environment.unwrap_or_else(|| "development".to_string()),
        safe_mode_level: request.safe_mode_level.unwrap_or(1),
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    match service.create_connection(model).await {
        Ok(result) => {
            println!("[Create Connection] Success: id={}", result.id);
            Ok(result)
        },
        Err(e) => {
            println!("[Create Connection] Backend failed: {}", e);
            Err(e.to_string())
        }
    }
}

#[tauri::command]
pub async fn update_connection(
    state: State<'_, AppState>,
    id: String,
    request: CreateConnectionRequest,
) -> Result<dbplus_backend::models::entities::connection::Model, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::models::entities::connection;
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (host, port, username, password) = if request.db_type.as_str() == "sqlite" {
        ("".to_string(), 0, "".to_string(), "".to_string())
    } else {
        (
            request.host.clone().unwrap_or_default(),
            request.port.unwrap_or(match request.db_type.as_str() {
                "clickhouse" => 8123,
                "mysql" | "mariadb" | "tidb" => 3306,
                "couchbase" => 8091,
                "cockroach" | "cockroachdb" => 26257,
                _ => 5432,
            }),
            request.username.clone().unwrap_or_default(),
            request.password.clone().unwrap_or_default(),
        )
    };

    let model = connection::Model {
        id: uuid,
        name: request.name,
        db_type: request.db_type,
        host,
        port,
        database: request.database,
        username,
        password,
        ssl: request.ssl.unwrap_or(false),
        ssl_cert: request.ssl_cert,
        ssl_mode: request.ssl_mode,
        ssl_ca_file: request.ssl_ca_file,
        ssl_key_file: request.ssl_key_file,
        ssl_cert_file: request.ssl_cert_file,
        status_color: request.status_color,
        tags: request.tags,
        ssh_enabled: request.ssh_enabled,
        ssh_host: request.ssh_host,
        ssh_port: request.ssh_port,
        ssh_user: request.ssh_user,
        ssh_auth_type: request.ssh_auth_type,
        ssh_password: request.ssh_password,
        ssh_key_file: request.ssh_key_file,
        ssh_key_passphrase: request.ssh_key_passphrase,
        is_read_only: request.is_read_only,
        environment: request.environment.unwrap_or_else(|| "development".to_string()),
        safe_mode_level: request.safe_mode_level.unwrap_or(1),
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    service.update_connection(uuid, model)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_connection(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;
    
    service.delete_connection(uuid)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn test_connection(
    state: State<'_, AppState>,
    request: CreateConnectionRequest,
) -> Result<TestConnectionResponse, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    use dbplus_backend::models::entities::connection;
    use chrono::Utc;
    
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let connection_name = request.name.clone();
    let host = request.host.clone().unwrap_or_default();
    let port = if request.db_type == "sqlite" {
        0
    } else {
        request.port.unwrap_or(match request.db_type.as_str() {
            "clickhouse" => 8123,
            "mysql" | "mariadb" | "tidb" => 3306,
            "couchbase" => 8091,
            "cockroach" | "cockroachdb" => 26257,
            _ => 5432,
        })
    };

    let model = connection::Model {
        id: Uuid::new_v4(),
        name: request.name,
        db_type: request.db_type.clone(),
        host: host.clone(),
        port,
        database: request.database,
        username: request.username.clone().unwrap_or_default(),
        password: request.password.clone().unwrap_or_default(),
        ssl: request.ssl.unwrap_or(false),
        ssl_cert: request.ssl_cert,
        ssl_mode: request.ssl_mode,
        ssl_ca_file: request.ssl_ca_file,
        ssl_key_file: request.ssl_key_file,
        ssl_cert_file: request.ssl_cert_file,
        status_color: request.status_color,
        tags: request.tags,
        ssh_enabled: request.ssh_enabled,
        ssh_host: request.ssh_host,
        ssh_port: request.ssh_port,
        ssh_user: request.ssh_user,
        ssh_auth_type: request.ssh_auth_type,
        ssh_password: request.ssh_password,
        ssh_key_file: request.ssh_key_file,
        ssh_key_passphrase: request.ssh_key_passphrase,
        is_read_only: request.is_read_only,
        environment: request.environment.unwrap_or_else(|| "development".to_string()),
        safe_mode_level: request.safe_mode_level.unwrap_or(1),
        last_used: None,
        created_at: Utc::now().into(),
        updated_at: Utc::now().into(),
    };

    let password = if request.password.clone().unwrap_or_default().is_empty() {
        if let Some(id_str) = &request.id {
             if let Ok(uuid) = Uuid::parse_str(id_str) {
                 if let Ok((_, stored_pass)) = service.get_connection_with_password(uuid).await {
                     stored_pass
                 } else {
                     "".to_string()
                 }
             } else {
                 "".to_string()
             }
        } else {
            "".to_string()
        }
    } else {
        request.password.clone().unwrap_or_default()
    };

    match service.test_connection(model, &password).await {
        Ok(_) => {
            Ok(TestConnectionResponse {
                success: true,
                message: "Connection successful".to_string(),
            })
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            println!("[Connection Test Failed]: {}", error_msg); // Added log
            let message = if error_msg.contains("connection refused")
                || error_msg.contains("Connection refused")
                || error_msg.contains("actively refused it")
            {
                format!("Cannot connect to {} server at {}:{}. Please check if the server is running and the host/port are correct.", request.db_type, host, port)
            } else if error_msg.contains("password authentication failed")
                || error_msg.contains("authentication failed")
                || error_msg.contains("Access denied")
            {
                "Authentication failed. Please check your username and password.".to_string()
            } else if error_msg.contains("does not exist") {
                format!("Database connection failed: {}", error_msg)
            } else {
                let clean_msg = error_msg
                    .replace("Input/output error: ", "")
                    .replace("Connection failed: ", "");
                format!("Connection failed: {}", clean_msg)
            };
            Ok(TestConnectionResponse {
                success: false,
                message,
            })
        }
    }
}

#[tauri::command]
pub async fn test_connection_by_id(
    state: State<'_, AppState>,
    id: String,
) -> Result<TestConnectionResponse, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;

    let (connection, password) = service.get_connection_with_password(uuid)
        .await
        .map_err(|e| e.to_string())?;
    
    let connection_name = connection.name.clone();
    let host = connection.host.clone();
    let port = connection.port;
    let db_type = connection.db_type.clone();

    match service.test_connection(connection, &password).await {
        Ok(_) => {
            Ok(TestConnectionResponse {
                success: true,
                message: "Connection successful".to_string(),
            })
        }
        Err(e) => {
            let error_msg = format!("{}", e);
            println!("[Connection Test Failed (ID)]: {}", error_msg); // Added log
            let message = if error_msg.contains("connection refused")
                || error_msg.contains("Connection refused")
                || error_msg.contains("actively refused it")
            {
                format!("Cannot connect to {} server at {}:{}. Please check if the server is running and the host/port are correct.", db_type, host, port)
            } else if error_msg.contains("password authentication failed")
                || error_msg.contains("authentication failed")
                || error_msg.contains("Access denied")
            {
                "Authentication failed. Please check your username and password.".to_string()
            } else if error_msg.contains("does not exist") {
                format!("Database connection failed: {}", error_msg)
            } else {
                let clean_msg = error_msg
                    .replace("Input/output error: ", "")
                    .replace("Connection failed: ", "");
                format!("Connection failed: {}", clean_msg)
            };
            Ok(TestConnectionResponse {
                success: false,
                message,
            })
        }
    }
}

#[tauri::command]
pub async fn switch_database(
    state: State<'_, AppState>,
    id: String,
    request: SwitchDatabaseRequest,
) -> Result<dbplus_backend::models::entities::connection::Model, String> {
    use dbplus_backend::services::connection_service::ConnectionService;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;
    let database = request.database.trim().to_string();
    
    if database.is_empty() {
        return Err("Database cannot be empty".to_string());
    }
    if database.len() > 63 {
        return Err("Database name is too long (max 63 chars)".to_string());
    }

    let service = ConnectionService::new(state.db.clone())
        .map_err(|e| e.to_string())?;
    
    service.update_connection_database(uuid, database)
        .await
        .map_err(|e| e.to_string())
}
