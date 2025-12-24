// Hide console window on Windows when running as a sidecar
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

// Import from library
use dbplus_backend::init_database;

#[tokio::main]
async fn main() {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Initialize logging
    tracing_subscriber::fmt::init();

    // Parse command line arguments for database path
    let args: Vec<String> = std::env::args().collect();
    let db_path = if args.len() > 1 {
        args[1].clone()
    } else {
        "dbplus.db".to_string()
    };

    // Database URL (SQLite)
    let database_url = format!("sqlite://{}?mode=rwc", db_path);

    tracing::info!("Initializing database connection...");

    // Initialize database and run migrations
    match init_database(&database_url).await {
        Ok(_) => {
            tracing::info!("Database initialized and migrations run successfully.");
        }
        Err(e) => {
            tracing::error!("Failed to initialize database: {}", e);
        }
    };
}
