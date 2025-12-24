// Command modules for Tauri IPC
// Each module contains commands for a specific feature area

pub mod autocomplete;
pub mod connection;
pub mod dashboards;
pub mod database;
pub mod history;
pub mod query;
pub mod saved_queries;
pub mod schema;
pub mod settings;
pub mod snippets;

// Re-export all commands for easy registration
pub use autocomplete::*;
pub use connection::*;
pub use dashboards::*;
pub use database::*;
pub use history::*;
pub use query::*;
pub use saved_queries::*;
pub use schema::*;
pub use settings::*;
pub use snippets::*;
