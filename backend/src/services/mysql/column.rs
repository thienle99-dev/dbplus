use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use super::MySqlDriver;
use crate::services::db_driver::ColumnDefinition;
use crate::services::driver::ColumnManagement;

#[async_trait]
impl ColumnManagement for MySqlDriver {
    async fn add_column(&self, schema: &str, table: &str, column: &ColumnDefinition) -> Result<()> {
        let null_str = if column.is_nullable {
            "NULL"
        } else {
            "NOT NULL"
        };
        let default_str = if let Some(ref d) = column.default_value {
            // Basic escaping for default value string literal?
            format!("DEFAULT '{}'", d.replace("'", "''"))
        } else {
            "".to_string()
        };

        let query = format!(
            "ALTER TABLE `{}`.`{}` ADD COLUMN `{}` {} {} {}",
            schema, table, column.name, column.data_type, null_str, default_str
        );

        let mut conn = self.pool.get_conn().await?;
        conn.query_drop(query).await?;
        Ok(())
    }

    async fn alter_column(
        &self,
        schema: &str,
        table: &str,
        column_name: &str,
        new_def: &ColumnDefinition,
    ) -> Result<()> {
        let null_str = if new_def.is_nullable {
            "NULL"
        } else {
            "NOT NULL"
        };
        let default_str = if let Some(ref d) = new_def.default_value {
            format!("DEFAULT '{}'", d.replace("'", "''"))
        } else {
            "".to_string()
        };

        let query = format!(
            "ALTER TABLE `{}`.`{}` CHANGE COLUMN `{}` `{}` {} {} {}",
            schema, table, column_name, new_def.name, new_def.data_type, null_str, default_str
        );

        let mut conn = self.pool.get_conn().await?;
        conn.query_drop(query).await?;
        Ok(())
    }

    async fn drop_column(&self, schema: &str, table: &str, column_name: &str) -> Result<()> {
        let query = format!(
            "ALTER TABLE `{}`.`{}` DROP COLUMN `{}`",
            schema, table, column_name
        );
        let mut conn = self.pool.get_conn().await?;
        conn.query_drop(query).await?;
        Ok(())
    }
}
