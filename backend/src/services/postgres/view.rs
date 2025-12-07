use crate::services::db_driver::ViewInfo;
use crate::services::driver::ViewOperations;
use anyhow::Result;
use async_trait::async_trait;
use deadpool_postgres::Pool;

pub struct PostgresView {
    pool: Pool,
}

impl PostgresView {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl ViewOperations for PostgresView {
    async fn list_views(&self, schema: &str) -> Result<Vec<ViewInfo>> {
        tracing::info!("[PostgresView] list_views - schema: {}", schema);

        let client = self.pool.get().await?;
        let query = "
            SELECT 
                schemaname,
                viewname,
                definition,
                viewowner
            FROM pg_views
            WHERE schemaname = $1
            ORDER BY viewname";

        let rows = client.query(query, &[&schema]).await?;

        let views = rows
            .iter()
            .map(|row| ViewInfo {
                schema: row.get(0),
                name: row.get(1),
                definition: row.get(2),
                owner: row.get(3),
                created_at: None,
            })
            .collect();

        tracing::info!("[PostgresView] list_views - found {} views", rows.len());
        Ok(views)
    }

    async fn get_view_definition(
        &self,
        schema: &str,
        view_name: &str,
    ) -> Result<ViewInfo> {
        tracing::info!(
            "[PostgresView] get_view_definition - schema: {}, view: {}",
            schema,
            view_name
        );

        let client = self.pool.get().await?;
        let query = "
            SELECT 
                schemaname,
                viewname,
                definition,
                viewowner
            FROM pg_views
            WHERE schemaname = $1 AND viewname = $2";

        let row = client.query_one(query, &[&schema, &view_name]).await?;

        Ok(ViewInfo {
            schema: row.get(0),
            name: row.get(1),
            definition: row.get(2),
            owner: row.get(3),
            created_at: None,
        })
    }
}
