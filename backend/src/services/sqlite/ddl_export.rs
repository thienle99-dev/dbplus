use super::SQLiteDriver;
use crate::models::export_ddl::{DdlObjectType, DdlScope, ExportDdlOptions};
use crate::services::driver::ddl_export::DdlExportDriver;
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use sqlx::{Row, SqlitePool};

pub struct SQLiteDdlExport {
    pool: SqlitePool,
}

impl SQLiteDdlExport {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
        match options.scope {
            DdlScope::Database | DdlScope::Schema => self.export_full_database_ddl().await,
            DdlScope::Objects => {
                let mut ddl = String::new();
                if let Some(objects) = &options.objects {
                    for obj in objects {
                        let obj_ddl = match obj.object_type {
                            DdlObjectType::Table => {
                                self.export_object_ddl("table", &obj.name).await?
                            }
                            DdlObjectType::View => {
                                self.export_object_ddl("view", &obj.name).await?
                            }
                            _ => format!(
                                "-- Object type {:?} not supported for SQLite DDL export\n",
                                obj.object_type
                            ),
                        };
                        ddl.push_str(&obj_ddl);
                        ddl.push_str("\n\n");
                    }
                }
                Ok(ddl)
            }
        }
    }

    async fn export_full_database_ddl(&self) -> Result<String> {
        let query = "SELECT sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type DESC, name";
        let rows = sqlx::query(query).fetch_all(&self.pool).await?;

        let mut ddl = String::new();
        for row in rows {
            let sql: String = row.get(0);
            ddl.push_str(&sql);
            ddl.push_str(";\n");
        }
        Ok(ddl)
    }

    async fn export_object_ddl(&self, type_: &str, name: &str) -> Result<String> {
        let query = "SELECT sql FROM sqlite_master WHERE type = ? AND name = ?";
        let row = sqlx::query(query)
            .bind(type_)
            .bind(name)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(row) = row {
            let sql: String = row.get(0);
            Ok(format!("{};", sql))
        } else {
            Err(anyhow!("{} {} not found", type_, name))
        }
    }
}

#[async_trait]
impl DdlExportDriver for SQLiteDriver {
    async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
        let exporter = SQLiteDdlExport::new(self.pool().clone());
        exporter.export_ddl(options).await
    }
}
