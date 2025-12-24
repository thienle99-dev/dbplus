# Not Yet Implemented IPC Functions

The following Tauri commands are currently stubbed with "not implemented" errors and require backend implementation in `ConnectionService` or specific drivers.

## Database Management (`database.rs`)

- `list_databases`: Listing databases for a connection.
- `create_database`: Creating a new database.
- `drop_database`: Dropping an existing database.

## Query Execution (`query.rs`)

- `execute_query`: Executing arbitrary SQL queries (requires result set parsing).
- `explain_query`: Getting the execution plan for a query.

## Data Editing (`result_edit.rs`)

- `update_result_row`: Updating a specific row in a result set.
- `delete_result_row`: Deleting a specific row from a result set.

## Extensions (`extensions.rs`)

- `list_extensions`: Listing installed/available database extensions.
- `install_extension`: Installing a new extension.

## Data Tools (`data_tools.rs`)

- `execute_script`: Running a large SQL script.
- `backup_postgres_sql`: Generating a backup for Postgres databases.

## SQLite Specific (`sqlite_tools.rs`)

- `list_sqlite_attachments`: Listing attached SQLite databases.
- `attach_sqlite_database`: Attaching an external SQLite database file.
- `detach_sqlite_database`: Detaching a previously attached database.

## Schema Diff (`schema_diff.rs`)

- `compare_schemas`: Comparing two schemas to find differences.
- `generate_migration`: Generating SQL migration scripts from schema differences.
