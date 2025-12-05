// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

struct BackendProcess {
    child: Mutex<Option<Child>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(BackendProcess {
            child: Mutex::new(None),
        })
        .setup(|app| {
            let resource_path = app
                .path()
                .resource_dir()
                .expect("failed to get resource dir")
                .join("resources/dbplus-backend");

            let app_data_dir = app
                .path()
                .app_data_dir()
                .expect("failed to get app data dir");

            // Ensure app data dir exists
            if !app_data_dir.exists() {
                std::fs::create_dir_all(&app_data_dir).expect("failed to create app data dir");
            }

            let db_path = app_data_dir.join("dbplus.db");

            #[cfg(target_os = "macos")]
            let backend_path = resource_path;

            #[cfg(target_os = "windows")]
            let backend_path = resource_path.with_extension("exe");

            // Check if backend exists (might not in dev mode if not copied)
            if backend_path.exists() {
                let child = Command::new(backend_path)
                    .arg(db_path.to_string_lossy().to_string())
                    .spawn();

                match child {
                    Ok(child) => {
                        let state = app.state::<BackendProcess>();
                        *state.child.lock().unwrap() = Some(child);
                        println!("Backend started successfully");
                    }
                    Err(e) => {
                        eprintln!("Failed to start backend: {}", e);
                    }
                }
            } else {
                println!(
                    "Backend binary not found at {:?}. Assuming dev mode or manual start.",
                    backend_path
                );
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                // Check if it's the main window or last window?
                // For now, we rely on the app exit event or Drop, but Tauri doesn't guarantee Drop on exit.
                // We can use the build-in cleanup if we implement it on the struct, but the struct is in State.
            }
        })
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                let state = app_handle.state::<BackendProcess>();
                let mut child_guard = state.child.lock().unwrap();
                if let Some(mut child) = child_guard.take() {
                    let _ = child.kill();
                    println!("Backend process killed");
                }
            }
        });
}
