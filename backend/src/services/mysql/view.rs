use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use super::MySqlDriver;
use crate::services::db_driver::ViewInfo;
use crate::services::driver::ViewOperations;

#[async_trait]
impl ViewOperations for MySqlDriver {
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT TABLE_NAME, VIEW_DEFINITION
            FROM information_schema.VIEWS
            WHERE TABLE_SCHEMA = ?
        "#;

        let rows: Vec<(String, Option<String>)> = conn.exec(query, (schema,)).await?;

        Ok(rows
            .into_iter()
            .map(|(name, def)| ViewInfo {
                schema: schema.to_string(),
                name,
                definition: def.unwrap_or_default(),
                owner: None,
                created_at: None,
            })
            .collect())
    }

    async fn get_view_definition(&self, schema: &str, view_name: &str) -> Result<ViewInfo> {
        let mut conn = self.pool.get_conn().await?;
        let query = format!("SHOW CREATE VIEW `{}`.`{}`", schema, view_name);
        // Result is (View, Create View, character_set_client, collation_connection) usually
        // But `query_first` with tuple `(String, String)` maps first two columns.

        // Note: SHOW CREATE VIEW returns columns: View, Create View, ...
        let row: Option<(String, String)> = conn.query_first(query).await?;

        if let Some((_, definition)) = row {
            Ok(ViewInfo {
                schema: schema.to_string(),
                name: view_name.to_string(),
                definition,
                owner: None,
                created_at: None,
            })
        } else {
            Err(anyhow::anyhow!("View not found"))
        }
    }
}
