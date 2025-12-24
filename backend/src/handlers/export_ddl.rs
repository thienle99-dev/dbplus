use crate::app_state::AppState;
use crate::models::export_ddl::{ExportDdlOptions, ExportDdlResult};
use crate::services::connection_service::ConnectionService;
use crate::services::pg_dump::{is_pg_dump_available, run_pg_dump};
use crate::services::postgres::PostgresDriver;
use axum::{
    extract::{Path, State},
    Json,
};
use uuid::Uuid;

pub async fn export_postgres_ddl(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(options): Json<ExportDdlOptions>,
) -> Result<Json<ExportDdlResult>, String> {
    let service = ConnectionService::new(state.db.clone()).map_err(|e| e.to_string())?;

    // Get connection details
    let (conn, password) = service
        .get_connection_with_password(id)
        .await
        .map_err(|e| e.to_string())?;

    if conn.db_type != "postgres" {
        return Err("Only PostgreSQL is supported for DDL Export currently".to_string());
    }

    // Determine method
    let method = options.export_method.clone().unwrap_or_else(|| {
        // Backward compatibility
        if options.prefer_pg_dump && is_pg_dump_available() {
            "user_pg_dump".to_string()
        } else {
            "driver".to_string()
        }
    });

    if method == "bundled_pg_dump" || method == "user_pg_dump" {
        let path = crate::utils::pg_dump_finder::get_pg_dump_path(
            &method,
            options.pg_dump_path.as_deref(),
        )
        .map_err(|e| e.to_string())?;

        // Use database from options if provided, otherwise use connection database
        let database = options.database.as_deref().unwrap_or(&conn.database);

        let ddl = run_pg_dump(
            Some(path),
            &conn.host,
            conn.port,
            &conn.username,
            database,
            &password,
            &options,
        )
        .await
        .map_err(|e| e.to_string())?;

        Ok(Json(ExportDdlResult { ddl, method }))
    } else {
        // Override connection database if specified in options
        let mut conn_for_driver = conn.clone();
        if let Some(ref db) = options.database {
            conn_for_driver.database = db.clone();
        }

        let driver = PostgresDriver::new(&conn_for_driver, &password)
            .await
            .map_err(|e| e.to_string())?;

        use crate::services::driver::ddl_export::DdlExportDriver;
        let ddl = driver
            .export_ddl(&options)
            .await
            .map_err(|e| e.to_string())?;

        Ok(Json(ExportDdlResult {
            ddl,
            method: "driver".to_string(),
        }))
    }
}

pub async fn check_pg_dump_status() -> Json<crate::models::export_ddl::PgDumpStatusResponse> {
    use crate::models::export_ddl::{DriverStatus, PgDumpStatus, PgDumpStatusResponse};
    use crate::utils::pg_dump_finder::{find_bundled_pg_dump, find_user_pg_dump, validate_pg_dump};

    let bundled = match find_bundled_pg_dump() {
        Some(path) => match validate_pg_dump(&path) {
            Ok(v) => PgDumpStatus {
                found: true,
                version: Some(v),
                path: Some(path.to_string_lossy().to_string()),
            },
            Err(_) => PgDumpStatus {
                found: false,
                version: None,
                path: Some(path.to_string_lossy().to_string()),
            },
        },
        None => PgDumpStatus {
            found: false,
            version: None,
            path: None,
        },
    };

    let user = match find_user_pg_dump() {
        Some((path, version)) => PgDumpStatus {
            found: true,
            version: Some(version),
            path: Some(path.to_string_lossy().to_string()),
        },
        None => PgDumpStatus {
            found: false,
            version: None,
            path: None,
        },
    };

    let driver = DriverStatus {
        available: true,
        supports_full_export: false,
    };

    Json(PgDumpStatusResponse {
        bundled,
        user,
        driver,
    })
}
