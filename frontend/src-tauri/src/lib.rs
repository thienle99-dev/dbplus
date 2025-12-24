use tauri::Manager;

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Get app data directory
            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");
            
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }
            
            let db_path = app_data_dir.join("dbplus.db");
            let database_url = format!("sqlite://{}?mode=rwc", db_path.display());

            // Initialize database and app state
            let runtime = tokio::runtime::Runtime::new().expect("Failed to create Tokio runtime");
            let app_state = runtime.block_on(async {
                let db = dbplus_backend::init_database(&database_url)
                    .await
                    .expect("Failed to initialize database");
                dbplus_backend::init_app_state(db)
            });

            // Manage the app state
            app.manage(app_state);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File picker
            pick_sqlite_db_file,
            // Connection commands
            commands::list_connections,
            commands::get_connection,
            commands::create_connection,
            commands::update_connection,
            commands::delete_connection,
            commands::test_connection,
            commands::test_connection_by_id,
            commands::switch_database,
            // Schema commands
            commands::schema_list_schemas,
            commands::schema_list_tables,
            commands::schema_get_columns,
            // Autocomplete commands
            commands::autocomplete_suggest,
            commands::schema_refresh,
            // Query commands
            commands::execute_query,
            commands::cancel_query,
            commands::explain_query,
            // Database commands
            commands::list_databases,
            commands::create_database,
            commands::drop_database,
            // History commands
            commands::get_history,
            commands::add_history,
            commands::delete_history_entry,
            commands::clear_history,
            commands::delete_history_entries,
            // Settings commands
            commands::get_all_settings,
            commands::get_setting,
            commands::update_setting,
            commands::delete_setting,
            commands::reset_settings,
            // Snippet commands
            commands::list_snippets,
            commands::create_snippet,
            commands::update_snippet,
            commands::delete_snippet,
            // Saved query commands
            commands::list_saved_queries,
            commands::create_saved_query,
            commands::update_saved_query,
            commands::delete_saved_query,
            commands::list_folders,
            commands::create_folder,
            commands::update_folder,
            commands::delete_folder,
            commands::list_saved_filters,
            commands::create_saved_filter,
            commands::delete_saved_filter,
            // Dashboard commands
            commands::list_dashboards,
            commands::get_dashboard,
            commands::create_dashboard,
            commands::delete_dashboard,
            commands::list_charts,
            commands::add_chart,
            commands::delete_chart,
            // Table operations
            commands::create_table,
            commands::drop_table,
            commands::add_column,
            commands::drop_column,
            commands::create_schema,
            commands::drop_schema,
            commands::get_table_data,
            // Result editing
            commands::update_result_row,
            commands::delete_result_row,
            // Session commands
            commands::list_sessions,
            commands::kill_session,
            // Table info commands
            commands::get_table_constraints,
            commands::get_table_statistics,
            commands::get_table_indexes,
            commands::get_table_triggers,
            commands::get_table_comment,
            commands::set_table_comment,
            commands::get_table_permissions,
            commands::get_table_dependencies,
            commands::get_storage_bloat_info,
            commands::get_partitions,
            commands::get_fk_orphans,
            commands::list_roles,
            commands::get_schema_permissions,
            commands::get_function_permissions,
            // Data tools
            commands::execute_script,
            commands::backup_postgres_sql,
            // Export DDL
            commands::export_postgres_ddl,
            // Schema diff
            commands::compare_schemas,
            commands::generate_migration,
            // Extensions
            commands::list_extensions,
            commands::install_extension,
            // Search
            commands::search_objects,
            // SQLite tools
            commands::list_sqlite_attachments,
            commands::attach_sqlite_database,
            commands::detach_sqlite_database,
            // Mock data
            commands::preview_mock_data,
            commands::generate_mock_data_sql,
            // Extra Schema commands
            commands::schema_list_functions,
            commands::schema_list_views,
            commands::schema_get_view_definition,
            commands::schema_get_function_definition,
            commands::schema_get_schema_foreign_keys,
            commands::schema_list_schema_metadata,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                // Cleanup if needed
            }
        });
}

#[tauri::command]
fn pick_sqlite_db_file() -> Option<String> {
    rfd::FileDialog::new()
        .add_filter("SQLite Database", &["db", "sqlite", "sqlite3"])
        .pick_file()
        .map(|p| p.to_string_lossy().to_string())
}
