pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20240101_000002_add_metadata;
mod m20240101_000003_create_dashboards;
mod m20250101_000004_create_snippets;
mod m20251213_000005_saved_query_folders;
mod m20251215_000006_sqlite_attached_dbs;
mod m20251216_000007_create_user_settings;
mod m20251216_000008_add_snippet_variables;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20240101_000002_add_metadata::Migration),
            Box::new(m20240101_000003_create_dashboards::Migration),
            Box::new(m20250101_000004_create_snippets::Migration),
            Box::new(m20251213_000005_saved_query_folders::Migration),
            Box::new(m20251215_000006_sqlite_attached_dbs::Migration),
            Box::new(m20251216_000007_create_user_settings::Migration),
            Box::new(m20251216_000008_add_snippet_variables::Migration),
        ]
    }
}
