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
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

// Import from library
use dbplus_backend::{handlers, init_app_state, init_database};

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

    // Initialize database and run migrations
    let db = match init_database(&database_url).await {
        Ok(db) => db,
        Err(e) => {
            tracing::error!("Failed to initialize database: {}", e);
            return;
        }
    };

    // Initialize app state
    let state = init_app_state(db);

    // build our application with a route
    let app = Router::new()
        .route("/", get(handler))
        .route("/api/queries/cancel", post(handlers::query::cancel_query))
        .route(
            "/api/autocomplete",
            post(handlers::autocomplete::get_suggestions),
        )
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
            "/api/connections/:id/test",
            axum::routing::post(handlers::connection::test_connection_by_id),
        )
        .route(
            "/api/connections/:id",
            get(handlers::connection::get_connection)
                .put(handlers::connection::update_connection)
                .delete(handlers::connection::delete_connection),
        )
        .route(
            "/api/connections/:id/version",
            get(handlers::connection::get_connection_version),
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
        // Mock Data routes
        .route(
            "/api/mock/preview",
            post(handlers::mock_data::preview_mock_data),
        )
        .route(
            "/api/mock/sql",
            post(handlers::mock_data::generate_mock_data_sql),
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
            "/api/connections/:id/schema/refresh",
            post(handlers::schema_refresh::refresh_schema),
        )
        .route(
            "/api/connections/:id/tables",
            get(handlers::schema::list_tables)
                .post(handlers::schema::create_table)
                .delete(handlers::schema::drop_table),
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
            "/api/connections/:id/saved-filters",
            get(handlers::saved_filter::list_saved_filters)
                .post(handlers::saved_filter::create_saved_filter),
        )
        .route(
            "/api/connections/:id/saved-filters/:filter_id",
            delete(handlers::saved_filter::delete_saved_filter),
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
            "/api/connections/:id/permissions/schema",
            get(handlers::table_info::get_schema_permissions),
        )
        .route(
            "/api/connections/:id/permissions/function",
            get(handlers::table_info::get_function_permissions),
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
            "/api/connections/:id/health/orphans",
            get(handlers::table_info::get_fk_orphans),
        )
        .route(
            "/api/connections/:id/backup/sql",
            get(handlers::data_tools::backup_postgres_sql),
        )
        .route(
            "/api/connections/:id/sessions",
            get(handlers::connection::list_sessions),
        )
        .route(
            "/api/connections/:id/sessions/:pid",
            delete(handlers::connection::kill_session),
        )
        .route(
            "/api/connections/:id/export-ddl",
            post(handlers::export_ddl::export_ddl),
        )
        // Schema Diff routes
        .route(
            "/api/schema-diff/test",
            get(handlers::schema_diff::test_schema_diff),
        )
        .route(
            "/api/schema-diff/compare",
            post(handlers::schema_diff::compare_schemas),
        )
        .route(
            "/api/schema-diff/generate-migration",
            post(handlers::schema_diff::generate_migration),
        )
        .route(
            "/api/settings/pg-dump/check",
            get(handlers::export_ddl::check_pg_dump_status),
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
            "/api/connections/:id/extensions",
            get(handlers::extensions::list_extensions),
        )
        .route(
            "/api/connections/:id/search",
            get(handlers::search::search_objects),
        )
        .route(
            "/api/connections/:id/function-definition",
            get(handlers::schema::get_function_definition),
        )
        .route(
            "/api/connections/:id/foreign-keys",
            get(handlers::schema::get_schema_foreign_keys),
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
        .with_state(state);

    // run it
    let addr = SocketAddr::from(([127, 0, 0, 1], 19999));
    tracing::info!("listening on {}", addr);
    let listener = match tokio::net::TcpListener::bind(addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            if e.kind() == std::io::ErrorKind::AddrInUse {
                tracing::error!("Port {} is already in use. Please check if another instance of DBPlus is running.", addr.port());
            }
            return;
        }
    };
    if let Err(e) = axum::serve(listener, app).await {
        tracing::error!("Server error: {}", e);
    }
}

async fn handler() -> &'static str {
    "Hello, DBPlus!"
}
