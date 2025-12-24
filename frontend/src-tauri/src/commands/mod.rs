// Command modules for Tauri IPC
// Each module contains commands for a specific feature area

pub mod autocomplete;
pub mod connection;
pub mod schema;

// Re-export all commands for easy registration
pub use autocomplete::*;
pub use connection::*;
pub use schema::*;
