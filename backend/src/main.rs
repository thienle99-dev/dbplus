// Hide console window on Windows when running as a sidecar
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use axum::extract::DefaultBodyLimit;
use axum::{
    routing::{delete, get, patch, post, put},
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
        // Snippet routes
        .route(
            "/api/snippets",
            get(handlers::snippet::list_snippets).post(handlers::snippet::create_snippet),
        )
        .route(
            "/api/snippets/:id",
            put(handlers::snippet::update_snippet).delete(handlers::snippet::delete_snippet),
        )
        .route(
            "/api/connections/:id/query-results",
            patch(handlers::result_edit::update_result_row)
                .delete(handlers::result_edit::delete_result_row),
        )
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
            "/api/connections/:id/database",
            patch(handlers::connection::switch_database),
        )
        .route(
            "/api/connections/:id/databases",
            get(handlers::database::list_databases).post(handlers::database::create_database),
        )
        .route(
            "/api/connections/:id/databases/:name",
            delete(handlers::database::drop_database),
        )
        .route(
            "/api/connections/:id/schemas",
            get(handlers::schema::list_schemas).post(handlers::schema::create_schema),
        )
        .route(
            "/api/connections/:id/schemas/:name",
            delete(handlers::schema::drop_schema),
        )
        .route(
            "/api/connections/:id/schema-metadata",
            get(handlers::schema::list_schema_metadata),
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
            "/api/connections/:id/execute-script",
            post(handlers::data_tools::execute_script),
        )
        .route(
            "/api/connections/:id/execute/stream",
            post(handlers::query_stream::execute_query_stream),
        )
        .route(
            "/api/connections/:id/explain",
            post(handlers::explain::explain_query),
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
        .route(
            "/api/connections/:id/saved-query-folders",
            get(handlers::saved_query_folder::list_folders)
                .post(handlers::saved_query_folder::create_folder),
        )
        .route(
            "/api/connections/:id/saved-query-folders/:folder_id",
            put(handlers::saved_query_folder::update_folder)
                .delete(handlers::saved_query_folder::delete_folder),
        )
        // History routes
        .route(
            "/api/connections/:id/history",
            get(handlers::history::get_history)
                .post(handlers::history::add_history)
                .delete(handlers::history::clear_history),
        )
        .route(
            "/api/connections/:id/history/:entry_id",
            delete(handlers::history::delete_history_entry),
        )
        .route(
            "/api/connections/:id/history/delete",
            post(handlers::history::delete_history_entries),
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
        .route(
            "/api/connections/:id/triggers",
            get(handlers::table_info::get_table_triggers),
        )
        .route(
            "/api/connections/:id/table-comment",
            get(handlers::table_info::get_table_comment)
                .put(handlers::table_info::set_table_comment),
        )
        .route(
            "/api/connections/:id/permissions",
            get(handlers::table_info::get_table_permissions)
                .put(handlers::table_info::set_table_permissions),
        )
        .route(
            "/api/connections/:id/dependencies",
            get(handlers::table_info::get_table_dependencies),
        )
        .route(
            "/api/connections/:id/roles",
            get(handlers::table_info::list_roles),
        )
        .route(
            "/api/connections/:id/storage-info",
            get(handlers::table_info::get_storage_bloat_info),
        )
        .route(
            "/api/connections/:id/partitions",
            get(handlers::table_info::get_partitions),
        )
        .route(
            "/api/connections/:id/backup/sql",
            get(handlers::data_tools::backup_postgres_sql),
        )
        // Views and Functions routes
        .route(
            "/api/connections/:id/views",
            get(handlers::schema::list_views),
        )
        .route(
            "/api/connections/:id/view-definition",
            get(handlers::schema::get_view_definition),
        )
        .route(
            "/api/connections/:id/functions",
            get(handlers::schema::list_functions),
        )
        .route(
            "/api/connections/:id/function-definition",
            get(handlers::schema::get_function_definition),
        )
        // SQLite-specific tools
        .route(
            "/api/connections/:id/sqlite/attachments",
            get(handlers::sqlite_tools::list_sqlite_attachments)
                .post(handlers::sqlite_tools::create_sqlite_attachment),
        )
        .route(
            "/api/connections/:id/sqlite/attachments/:name",
            delete(handlers::sqlite_tools::delete_sqlite_attachment),
        )
        // Settings routes
        .route("/api/settings", get(handlers::settings::get_all_settings))
        .route(
            "/api/settings/reset",
            post(handlers::settings::reset_settings),
        )
        .route(
            "/api/settings/:key",
            get(handlers::settings::get_setting)
                .put(handlers::settings::update_setting)
                .delete(handlers::settings::delete_setting),
        )
        .layer(DefaultBodyLimit::max(10 * 1024 * 1024))
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
