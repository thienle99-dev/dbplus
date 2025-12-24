// Backend library for DBPlus
// This library exports all the core functionality that can be used by both
// the HTTP server (bin) and the Tauri app (via IPC commands)

pub mod app_state;
pub mod config;
pub mod handlers;
pub mod models;
pub mod services;
pub mod utils;

pub use app_state::AppState;

use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection};

/// Initialize the database connection and run migrations
pub async fn init_database(database_url: &str) -> anyhow::Result<DatabaseConnection> {
    tracing::info!("Connecting to database: {}", database_url);

    let db = Database::connect(database_url)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to connect to database: {}", e))?;

    tracing::info!("Running migrations...");
    Migrator::up(&db, None)
        .await
        .map_err(|e| anyhow::anyhow!("Failed to run migrations: {}", e))?;

    tracing::info!("Database initialized successfully");
    Ok(db)
}

/// Initialize the application state
pub fn init_app_state(db: DatabaseConnection) -> AppState {
    AppState::new(db)
}
