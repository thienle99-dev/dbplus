use axum::{
    routing::{delete, get, post, put},
    Router,
};
use migration::{Migrator, MigratorTrait};
use sea_orm::{Database, DatabaseConnection};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

mod config;
mod handlers;
mod models;
mod services;
mod utils;

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
    tracing::info!("Using database at: {}", database_url);

    // Connect to database
    let db: DatabaseConnection = Database::connect(database_url)
        .await
        .expect("Failed to connect to database");

    // Run migrations
    Migrator::up(&db, None)
        .await
        .expect("Failed to run migrations");

    // build our application with a route
    let app = Router::new()
        .route("/", get(handler))
        .route(
            "/api/connections",
            get(handlers::connection::list_connections)
                .post(handlers::connection::create_connection),
        )
        .route(
            "/api/connections/test",
            axum::routing::post(handlers::connection::test_connection),
        )
        .route(
            "/api/connections/:id",
            get(handlers::connection::get_connection)
                .put(handlers::connection::update_connection)
                .delete(handlers::connection::delete_connection),
        )
        .route(
            "/api/connections/:id/databases",
            get(handlers::database::list_databases),
        )
        .route(
            "/api/connections/:id/schemas",
            get(handlers::schema::list_schemas),
        )
        .route(
            "/api/connections/:id/tables",
            get(handlers::schema::list_tables),
        )
        .route(
            "/api/connections/:id/columns",
            get(handlers::schema::list_columns).post(handlers::schema::add_column),
        )
        .route(
            "/api/connections/:id/columns/:name",
            put(handlers::schema::alter_column).delete(handlers::schema::drop_column),
        )
        .route(
            "/api/connections/:id/query",
            get(handlers::schema::get_table_data),
        )
        .route(
            "/api/connections/:id/execute",
            post(handlers::query::execute_query),
        )
        .route(
            "/api/connections/:id/saved-queries",
            get(handlers::saved_query::list_saved_queries)
                .post(handlers::saved_query::create_saved_query),
        )
        .route(
            "/api/connections/:id/saved-queries/:query_id",
            put(handlers::saved_query::update_saved_query)
                .delete(handlers::saved_query::delete_saved_query),
        )
        // History routes
        .route(
            "/api/connections/:id/history",
            get(handlers::history::list_history).delete(handlers::history::clear_history),
        )
        // Dashboard routes
        .route(
            "/api/connections/:id/dashboards",
            get(handlers::dashboard::list_dashboards).post(handlers::dashboard::create_dashboard),
        )
        .route(
            "/api/connections/:id/dashboards/:dashboard_id",
            get(handlers::dashboard::get_dashboard).delete(handlers::dashboard::delete_dashboard),
        )
        .route(
            "/api/connections/:id/dashboards/:dashboard_id/charts",
            get(handlers::dashboard::list_charts).post(handlers::dashboard::add_chart),
        )
        .route(
            "/api/connections/:id/dashboards/:dashboard_id/charts/:chart_id",
            delete(handlers::dashboard::delete_chart),
        )
        // Table Info routes
        .route(
            "/api/connections/:id/constraints",
            get(handlers::table_info::get_table_constraints),
        )
        .route(
            "/api/connections/:id/table-stats",
            get(handlers::table_info::get_table_statistics),
        )
        .route(
            "/api/connections/:id/indexes",
            get(handlers::table_info::get_table_indexes),
        )
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(db);

    // run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 19999));
    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn handler() -> &'static str {
    "Hello, DBPlus!"
}
