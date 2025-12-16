use anyhow::{anyhow, Result};
use std::env;
use std::path::{Path, PathBuf};
use std::process::Command;

pub fn find_bundled_pg_dump() -> Option<PathBuf> {
    // 1. Check environment variable override
    if let Ok(bin_dir) = env::var("DBPLUS_POSTGRES_BIN_DIR") {
        let path = PathBuf::from(bin_dir).join(if cfg!(windows) {
            "pg_dump.exe"
        } else {
            "pg_dump"
        });
        if path.exists() {
            return Some(path);
        }
    }

    // 2. Check relative to executable
    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            // Try common resource locations relative to binary
            let candidates = vec![
                // macOS bundle path: sidecar is usually in Contents/MacOS, resources in Contents/Resources
                exe_dir.join("../Resources/postgres/bin/pg_dump"),
                // Standard resources folder or dev layout
                exe_dir.join("postgres/bin/pg_dump"),
                exe_dir.join("resources/postgres/bin/pg_dump"),
                // Current dir fallback
                PathBuf::from("postgres/bin/pg_dump"),
            ];

            for path in candidates {
                let actual_path = if cfg!(windows) {
                    path.with_extension("exe")
                } else {
                    path
                };

                if actual_path.exists() {
                    return Some(actual_path);
                }
            }
        }
    }

    None
}

pub fn find_user_pg_dump() -> Option<(PathBuf, String)> {
    // Check PATH
    let cmd = if cfg!(windows) { "where" } else { "which" };

    if let Ok(output) = Command::new(cmd).arg("pg_dump").output() {
        if output.status.success() {
            let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
            // `where` on windows might return multiple lines
            if let Some(first_path) = path_str.lines().next() {
                let path = PathBuf::from(first_path);
                if let Ok(version) = validate_pg_dump(&path) {
                    return Some((path, version));
                }
            }
        }
    }

    // Check common locations if not in PATH
    let common_paths = if cfg!(target_os = "macos") {
        vec![
            "/opt/homebrew/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "/Applications/Postgres.app/Contents/Versions/latest/bin/pg_dump",
            "/Library/PostgreSQL/16/bin/pg_dump",
            "/Library/PostgreSQL/15/bin/pg_dump",
            "/Library/PostgreSQL/14/bin/pg_dump",
            "/Library/PostgreSQL/13/bin/pg_dump",
        ]
    } else if cfg!(target_os = "linux") {
        vec![
            "/usr/bin/pg_dump",
            "/usr/local/bin/pg_dump",
            "/usr/lib/postgresql/16/bin/pg_dump",
            "/usr/lib/postgresql/15/bin/pg_dump",
            "/usr/lib/postgresql/14/bin/pg_dump",
        ]
    } else if cfg!(windows) {
        vec![
            r"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe",
            r"C:\Program Files\PostgreSQL\14\bin\pg_dump.exe",
        ]
    } else {
        vec![]
    };

    for p in common_paths {
        let path = PathBuf::from(p);
        if path.exists() {
            if let Ok(version) = validate_pg_dump(&path) {
                return Some((path, version));
            }
        }
    }

    None
}

pub fn validate_pg_dump(path: &Path) -> Result<String> {
    let output = Command::new(path)
        .arg("--version")
        .output()
        .map_err(|e| anyhow!("Failed to execute pg_dump: {}", e))?;

    if output.status.success() {
        let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(version)
    } else {
        Err(anyhow!("pg_dump execution failed"))
    }
}

pub fn get_pg_dump_path(method: &str, custom_path: Option<&str>) -> Result<PathBuf> {
    match method {
        "bundled_pg_dump" => find_bundled_pg_dump()
            .ok_or_else(|| anyhow!("Bundled pg_dump not found in app resources")),
        "user_pg_dump" => {
            if let Some(path_str) = custom_path {
                let path = PathBuf::from(path_str);
                if path_str.trim().is_empty() {
                    // fall through to auto find if empty string explicitly passed (though Option handles this usually)
                } else {
                    if path.exists() {
                        validate_pg_dump(&path)?;
                        return Ok(path);
                    } else {
                        return Err(anyhow!("Custom pg_dump path does not exist"));
                    }
                }
            }
            find_user_pg_dump()
                .map(|(p, _)| p)
                .ok_or_else(|| anyhow!("pg_dump not found in PATH or common locations. Please install PostgreSQL or specify a path."))
        }
        _ => Err(anyhow!("Invalid export method: {}", method)),
    }
}
