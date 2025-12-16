use crate::models::export_ddl::{DdlObjectType, DdlScope, ExportDdlOptions};
use anyhow::{anyhow, Result};
use std::path::PathBuf;
use std::process::Stdio;
use tokio::process::Command;

pub async fn run_pg_dump(
    pg_dump_path: Option<PathBuf>,
    host: &str,
    port: i32,
    username: &str,
    database: &str,
    password: &str,
    options: &ExportDdlOptions,
) -> Result<String> {
    // Determine pg_dump path.
    let pg_dump_bin = pg_dump_path
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| "pg_dump".to_string());

    let mut cmd = Command::new(pg_dump_bin);

    // Connection args
    cmd.arg("--host").arg(host);
    cmd.arg("--port").arg(port.to_string());
    cmd.arg("--username").arg(username);
    cmd.arg("--dbname").arg(database);
    cmd.arg("--no-password"); // We rely on env var

    // Env var for password (secure, not logged in args)
    cmd.env("PGPASSWORD", password);

    // DDL Export Options: "Schema Only"
    // Since this feature is "Export DDL", we assume we don't want data.
    cmd.arg("--schema-only");

    // Scope selection
    match options.scope {
        DdlScope::Database => {
            // No extra args, dumps whole DB schema
        }
        DdlScope::Schema => {
            if let Some(schemas) = &options.schemas {
                for s in schemas {
                    cmd.arg("--schema").arg(s);
                }
            }
        }
        DdlScope::Objects => {
            if let Some(objs) = &options.objects {
                for obj in objs {
                    match obj.object_type {
                        DdlObjectType::Table | DdlObjectType::View | DdlObjectType::Sequence => {
                            // pg_dump -t "schema"."name"
                            // We quote identifiers to handle special characters.
                            // Note: .arg passes the value directly. We need to format the string that pg_dump interprets.
                            let pattern = format!("\"{}\".\"{}\"", obj.schema, obj.name);
                            cmd.arg("--table").arg(pattern);
                        }
                        _ => {
                            // Functions/Types not supported by simple pg_dump -t flags.
                            tracing::warn!(
                                "Skipping object {:?} in pg_dump export (not supported by -t)",
                                obj
                            );
                        }
                    }
                }
            }
        }
    }

    // Other options
    if options.include_drop {
        cmd.arg("--clean");
    }
    if options.if_exists {
        cmd.arg("--if-exists");
    }
    if !options.include_owner_privileges {
        cmd.arg("--no-owner");
        cmd.arg("--no-privileges");
    }

    // Note: include_comments handling is limited in pg_dump (it always includes them).

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    tracing::info!("Running pg_dump for database: {}", database);

    let child = cmd.spawn().map_err(|e| {
        anyhow!(
            "Failed to start pg_dump. Is PostgreSQL client installed and in PATH? Error: {}",
            e
        )
    })?;

    let output = child.wait_with_output().await?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!(
            "pg_dump failed with status {}: {}",
            output.status,
            stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    Ok(stdout)
}

pub fn is_pg_dump_available() -> bool {
    std::process::Command::new("pg_dump")
        .arg("--version")
        .output()
        .is_ok()
}
