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
