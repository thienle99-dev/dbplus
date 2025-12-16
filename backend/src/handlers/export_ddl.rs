use crate::models::export_ddl::{DdlObjectType, DdlScope, ExportDdlOptions, ExportDdlResult};
use crate::services::connection_service::ConnectionService;
use crate::services::ddl_generator::DdlGenerator;
use crate::services::pg_dump::{is_pg_dump_available, run_pg_dump};
use crate::services::postgres::PostgresDriver;
use axum::{
    extract::{Path, State},
    Json,
};
use sea_orm::DatabaseConnection;
use uuid::Uuid;

pub async fn export_postgres_ddl(
    State(db): State<DatabaseConnection>,
    Path(id): Path<Uuid>,
    Json(options): Json<ExportDdlOptions>,
) -> Result<Json<ExportDdlResult>, String> {
    let service = ConnectionService::new(db).map_err(|e| e.to_string())?;

    // Get connection details
    let (conn, password) = service
        .get_connection_with_password(id)
        .await
        .map_err(|e| e.to_string())?;

    if conn.db_type != "postgres" {
        return Err("Only PostgreSQL is supported for DDL Export currently".to_string());
    }

    // Determine method: pg_dump or introspection
    let pg_dump_avail = is_pg_dump_available();
    let use_pg_dump = options.prefer_pg_dump && pg_dump_avail;

    if use_pg_dump {
        let ddl = run_pg_dump(
            &conn.host,
            conn.port,
            &conn.username,
            &conn.database,
            &password,
            &options,
        )
        .await
        .map_err(|e| e.to_string())?;

        Ok(Json(ExportDdlResult {
            ddl,
            method: "pg_dump".to_string(),
        }))
    } else {
        // Introspection Fallback
        // Currently only supported for DdlScope::Objects
        if options.scope != DdlScope::Objects {
            return Err(
                "Full Schema/Database export requires pg_dump. Please install pg_dump or select specific objects.".to_string(),
            );
        }

        let driver = PostgresDriver::new(&conn, &password)
            .await
            .map_err(|e| e.to_string())?;

        let mut ddl_output = String::new();
        ddl_output.push_str(&format!("-- DDL Export for database: {}\n", conn.database));
        ddl_output.push_str(&format!("-- Generated at: {}\n\n", chrono::Utc::now()));

        if let Some(objects) = options.objects {
            for obj in objects {
                let res = match obj.object_type {
                    DdlObjectType::Table => {
                        DdlGenerator::generate_table_ddl(&driver, &obj.schema, &obj.name).await
                    }
                    DdlObjectType::View => {
                        DdlGenerator::generate_view_ddl(&driver, &obj.schema, &obj.name).await
                    }
                    DdlObjectType::Function => {
                        DdlGenerator::generate_function_ddl(&driver, &obj.schema, &obj.name).await
                    }
                    _ => Ok(format!(
                        "-- Skipping unsupported object type: {:?} ({}.{})",
                        obj.object_type, obj.schema, obj.name
                    )),
                };

                match res {
                    Ok(sql) => {
                        ddl_output.push_str(&sql);
                        ddl_output.push_str("\n\n");
                    }
                    Err(e) => {
                        ddl_output.push_str(&format!(
                            "-- Error generating DDL for {}.{}: {}\n\n",
                            obj.schema, obj.name, e
                        ));
                    }
                }
            }
        }

        Ok(Json(ExportDdlResult {
            ddl: ddl_output,
            method: "introspection".to_string(),
        }))
    }
}

pub async fn check_pg_dump() -> Json<crate::models::export_ddl::PgDumpStatus> {
    let output = std::process::Command::new("pg_dump")
        .arg("--version")
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let version = String::from_utf8_lossy(&o.stdout).trim().to_string();
            Json(crate::models::export_ddl::PgDumpStatus {
                found: true,
                version: Some(version),
                path: None, // Cannot easily determine path across OSes without 'which'
            })
        }
        Ok(_) | Err(_) => Json(crate::models::export_ddl::PgDumpStatus {
            found: false,
            version: None,
            path: None,
        }),
    }
}
