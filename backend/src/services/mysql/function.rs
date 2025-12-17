use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;

use super::MySqlDriver;
use crate::services::db_driver::FunctionInfo;
use crate::services::driver::FunctionOperations;

#[async_trait]
impl FunctionOperations for MySqlDriver {
    async fn list_functions(&self, schema: &str) -> Result<Vec<FunctionInfo>> {
        let mut conn = self.pool.get_conn().await?;
        let query = r#"
            SELECT ROUTINE_NAME, ROUTINE_TYPE, DTD_IDENTIFIER
            FROM information_schema.ROUTINES
            WHERE ROUTINE_SCHEMA = ?
        "#;

        let rows: Vec<(String, String, Option<String>)> = conn.exec(query, (schema,)).await?;

        Ok(rows
            .into_iter()
            .map(|(name, _type_, return_type)| FunctionInfo {
                schema: schema.to_string(),
                name,
                definition: "".to_string(),
                language: Some("SQL".to_string()),
                return_type,
                arguments: None,
                owner: None,
            })
            .collect())
    }

    async fn get_function_definition(
        &self,
        schema: &str,
        function_name: &str,
    ) -> Result<FunctionInfo> {
        let mut conn = self.pool.get_conn().await?;

        let type_query = "SELECT ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_NAME = ?";
        let type_: Option<String> = conn.exec_first(type_query, (schema, function_name)).await?;

        let routine_type = type_.ok_or_else(|| anyhow::anyhow!("Function not found"))?;

        let show_query = format!(
            "SHOW CREATE {} `{}`.`{}`",
            routine_type, schema, function_name
        );

        let row: mysql_async::Row = conn
            .query_first(show_query)
            .await?
            .ok_or_else(|| anyhow::anyhow!("Definition not found"))?;

        // "Create Function" or "Create Procedure" is usually at index 2
        let definition: String = row
            .get(2)
            .ok_or_else(|| anyhow::anyhow!("Could not extract definition"))?;

        Ok(FunctionInfo {
            schema: schema.to_string(),
            name: function_name.to_string(),
            definition,
            language: Some("SQL".to_string()),
            return_type: None,
            arguments: None,
            owner: None,
        })
    }
}
