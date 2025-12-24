// Command modules for Tauri IPC
// Each module contains commands for a specific feature area

pub mod autocomplete;
pub mod connection;
pub mod dashboards;
pub mod data_tools;
pub mod database;
pub mod export_ddl;
pub mod extensions;
pub mod history;
pub mod mock_data;
pub mod query;
pub mod result_edit;
pub mod saved_queries;
pub mod schema;
pub mod schema_diff;
pub mod search;
pub mod session;
pub mod settings;
pub mod snippets;
pub mod sqlite_tools;
pub mod table_info;
pub mod table_ops;

// Re-export all commands for easy registration
pub use autocomplete::*;
pub use connection::*;
pub use dashboards::*;
pub use data_tools::*;
pub use database::*;
pub use export_ddl::*;
pub use extensions::*;
pub use history::*;
pub use mock_data::*;
pub use query::*;
pub use result_edit::*;
pub use saved_queries::*;
pub use schema::*;
pub use schema_diff::*;
pub use search::*;
pub use session::*;
pub use settings::*;
pub use snippets::*;
pub use sqlite_tools::*;
pub use table_info::*;
pub use table_ops::*;
