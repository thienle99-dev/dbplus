use axum::{
    routing::get,
    Router,
};
use std::net::SocketAddr;
use sea_orm::{Database, DatabaseConnection};
use migration::{Migrator, MigratorTrait};

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Database URL (SQLite)
    let database_url = "sqlite://dbplus.db?mode=rwc";

    // Connect to database
    let db: DatabaseConnection = Database::connect(database_url).await.expect("Failed to connect to database");

    // Run migrations
    Migrator::up(&db, None).await.expect("Failed to run migrations");

    // build our application with a route
    let app = Router::new()
        .route("/", get(handler))
        .with_state(db);

    // run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handler() -> &'static str {
    "Hello, DBPlus!"
}
