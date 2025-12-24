use super::bson_to_json;
use super::connection::MongoDriver;
use crate::services::db_driver::QueryResult;
use crate::services::driver::QueryDriver;
use anyhow::{anyhow, Result};
use async_trait::async_trait;
use mongodb::bson::{doc, Document};

#[async_trait]
impl QueryDriver for MongoDriver {
    async fn execute(&self, query: &str) -> Result<u64> {
        let db_name = self.database_name.as_deref().unwrap_or("admin");
        let db = self.client.database(db_name);

        // Try to parse query as a command Document
        let command_doc: Document = serde_json::from_str(query)
            .map_err(|e| anyhow!("Failed to parse query as JSON command: {}", e))?;

        let _result = db.run_command(command_doc).await?;
        Ok(1)
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        self.execute_query(query).await
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        let db_name = self.database_name.as_deref().unwrap_or("admin");
        let db = self.client.database(db_name);

        let command_doc: Document = serde_json::from_str(query)
            .map_err(|e| anyhow!("Failed to parse query as JSON command: {}", e))?;

        let result = db.run_command(command_doc).await?;
        let json_res = bson_to_json(&mongodb::bson::Bson::Document(result));

        // If the result contains 'cursor', it's likely a find or aggregate.
        // We might want to iterate it, but run_command returns the first result set / cursor info.
        // For now, return the raw JSON result.

        Ok(QueryResult {
            columns: vec!["result".to_string()],
            rows: vec![vec![json_res.clone()]],
            affected_rows: 0,
            column_metadata: None,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
            row_metadata: None,
            execution_time_ms: None,
            json: Some(json_res),
            display_mode: Some("json".to_string()),
        })
    }

    async fn execute_script(&self, script: &str) -> Result<u64> {
        // Mongo doesn't have "scripts" in the SQL sense,
        // but we could support newline-separated commands.
        self.execute(script).await
    }

    async fn explain(&self, query: &str, _analyze: bool) -> Result<serde_json::Value> {
        let command_doc: Document = serde_json::from_str(query)
            .map_err(|e| anyhow!("Failed to parse query as JSON command: {}", e))?;

        let db_name = self.database_name.as_deref().unwrap_or("admin");
        let db = self.client.database(db_name);

        let explain_cmd = doc! {
            "explain": command_doc
        };

        let result = db.run_command(explain_cmd).await?;
        Ok(bson_to_json(&mongodb::bson::Bson::Document(result)))
    }
}
