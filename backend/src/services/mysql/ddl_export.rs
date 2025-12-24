use super::MySqlDriver;
use crate::models::export_ddl::{DdlObjectType, DdlScope, ExportDdlOptions};
use crate::services::driver::ddl_export::DdlExportDriver;
use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

pub struct MySqlDdlExport {
    driver: MySqlDriver,
}

impl MySqlDdlExport {
    pub fn new(driver: MySqlDriver) -> Self {
        Self { driver }
    }

    pub async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
        match options.scope {
            DdlScope::Database => {
                let db = options.database.as_deref().unwrap_or("");
                self.export_database_ddl(db).await
            }
            DdlScope::Schema => {
                let schema = options
                    .schemas
                    .as_ref()
                    .and_then(|s| s.first())
                    .map(|s| s.as_str())
                    .unwrap_or("");
                self.export_database_ddl(schema).await
            }
            DdlScope::Objects => {
                let mut ddl = String::new();
                if let Some(objects) = &options.objects {
                    for obj in objects {
                        let obj_ddl = match obj.object_type {
                            DdlObjectType::Table => {
                                self.export_table_ddl(&obj.schema, &obj.name).await?
                            }
                            DdlObjectType::View => {
                                self.export_view_ddl(&obj.schema, &obj.name).await?
                            }
                            DdlObjectType::Function => {
                                self.export_function_ddl(&obj.schema, &obj.name).await?
                            }
                            _ => format!(
                                "-- Object type {:?} not supported for MySQL DDL export yet\n",
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

    async fn export_database_ddl(&self, name: &str) -> Result<String> {
        let mut conn = self.driver.pool.get_conn().await?;
        let sql = format!("SHOW CREATE DATABASE `{}`", name.replace("`", "``"));
        let row: Option<(String, String)> = conn.query_first(sql).await?;
        if let Some((_, ddl)) = row {
            Ok(format!("{};", ddl))
        } else {
            Err(anyhow::anyhow!("Database {} not found", name))
        }
    }

    async fn export_table_ddl(&self, schema: &str, name: &str) -> Result<String> {
        let mut conn = self.driver.pool.get_conn().await?;
        let sql = format!(
            "SHOW CREATE TABLE `{}`.`{}`",
            schema.replace("`", "``"),
            name.replace("`", "``")
        );
        let row: Option<(String, String)> = conn.query_first(sql).await?;
        if let Some((_, ddl)) = row {
            Ok(format!("{};", ddl))
        } else {
            Err(anyhow::anyhow!("Table {}.{} not found", schema, name))
        }
    }

    async fn export_view_ddl(&self, schema: &str, name: &str) -> Result<String> {
        let mut conn = self.driver.pool.get_conn().await?;
        let sql = format!(
            "SHOW CREATE VIEW `{}`.`{}`",
            schema.replace("`", "``"),
            name.replace("`", "``")
        );
        let row: Option<(String, String, String, String, String)> = conn.query_first(sql).await?;
        if let Some((_, ddl, _, _, _)) = row {
            Ok(format!("{};", ddl))
        } else {
            Err(anyhow::anyhow!("View {}.{} not found", schema, name))
        }
    }

    async fn export_function_ddl(&self, schema: &str, name: &str) -> Result<String> {
        let mut conn = self.driver.pool.get_conn().await?;
        let sql = format!(
            "SHOW CREATE FUNCTION `{}`.`{}`",
            schema.replace("`", "``"),
            name.replace("`", "``")
        );
        // SHOW CREATE FUNCTION returns (Function, sql_mode, Create Function, character_set_client, collation_connection, Database Collation)
        let row: Option<(String, String, String, String, String, String)> =
            conn.query_first(sql).await?;
        if let Some((_, _, ddl, _, _, _)) = row {
            Ok(format!("DELIMITER //\n{};\n//\nDELIMITER ;", ddl))
        } else {
            Err(anyhow::anyhow!("Function {}.{} not found", schema, name))
        }
    }
}

#[async_trait]
impl DdlExportDriver for MySqlDriver {
    async fn export_ddl(&self, options: &ExportDdlOptions) -> Result<String> {
        let exporter = MySqlDdlExport::new(self.clone());
        exporter.export_ddl(options).await
    }
}
