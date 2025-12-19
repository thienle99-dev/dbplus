use crate::services::autocomplete::schema_cache::SchemaCacheService;
use crate::services::db_driver::DatabaseDriver;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct AutocompleteRequest {
    pub sql: String,
    pub cursor_pos: usize,
    pub connection_id: Uuid,
    pub database_name: String,
    pub active_schema: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub label: String,
    pub insert_text: String,
    pub kind: String, // "keyword", "table", "column", "schema", "function"
    pub detail: Option<String>,
    pub score: i32,
}

pub struct AutocompleteEngine {
    schema_cache: Arc<SchemaCacheService>,
}

impl AutocompleteEngine {
    pub fn new(schema_cache: Arc<SchemaCacheService>) -> Self {
        Self { schema_cache }
    }

    pub async fn suggest(
        &self,
        req: AutocompleteRequest,
        driver: Arc<dyn DatabaseDriver>,
    ) -> Result<Vec<Suggestion>> {
        use crate::services::autocomplete::parser::{AutocompleteParser, CursorContext};

        // 1. Parse Context (Lightweight)
        let parse_result = AutocompleteParser::parse(&req.sql, req.cursor_pos);

        // 2. Safety Check (Strings/Comments)
        if !parse_result.is_safe_location {
            return Ok(Vec::new()); // No suggestions inside strings/comments
        }

        let mut suggestions = Vec::new();

        // 3. Handle Context
        match parse_result.context {
            CursorContext::From | CursorContext::Join => {
                let schema = req.active_schema.as_deref().unwrap_or("public");
                let objects = self
                    .schema_cache
                    .get_schema_metadata(
                        req.connection_id,
                        &req.database_name,
                        schema,
                        driver.clone(),
                        false,
                    )
                    .await?;

                for obj in objects {
                    suggestions.push(Suggestion {
                        label: obj.object_name.clone(),
                        insert_text: obj.object_name.clone(),
                        kind: obj.object_type,
                        detail: Some(format!("in {}", obj.schema_name)),
                        score: 100,
                    });
                }
            }
            CursorContext::Select
            | CursorContext::Where
            | CursorContext::On
            | CursorContext::OrderBy
            | CursorContext::GroupBy => {
                // If we have an identifier chain ending in dot, try alias resolution
                if let Some(chain) = &parse_result.identifier_chain {
                    if let Some(last) = chain.parts.last() {
                        if last.is_empty() && chain.parts.len() > 1 {
                            // "something."
                            let potential_alias = &chain.parts[chain.parts.len() - 2];

                            // Resolve alias
                            let table_to_search = if let Some(real_table) =
                                parse_result.aliases.get(potential_alias)
                            {
                                // Found alias "u" -> "users"
                                // BUT the real table might be "public.users" or just "users"
                                real_table.clone()
                            } else {
                                // Maybe it's a direct table ref "public."
                                potential_alias.clone()
                            };

                            // Fetch columns for this specific table
                            // We need to split schema/table from table_to_search
                            let (schema, table) = if table_to_search.contains('.') {
                                let parts: Vec<&str> = table_to_search.split('.').collect();
                                (parts[0].to_string(), parts[1].to_string())
                            } else {
                                (
                                    req.active_schema
                                        .clone()
                                        .unwrap_or_else(|| "public".to_string()),
                                    table_to_search,
                                )
                            };

                            let cols = self
                                .schema_cache
                                .get_columns(
                                    req.connection_id,
                                    &req.database_name,
                                    &schema,
                                    &table,
                                    driver.clone(),
                                )
                                .await?;

                            for col in cols {
                                suggestions.push(Suggestion {
                                    label: col.object_name.clone(),
                                    insert_text: col.object_name.clone(),
                                    kind: "column".to_string(),
                                    detail: Some(format!("from {}", table)),
                                    score: 110,
                                });
                            }
                            return Ok(suggestions);
                        }
                    }
                }

                // General Column Suggestions (from all visible tables in alias map)
                for (alias, table_ref) in &parse_result.aliases {
                    let (schema, table) = if table_ref.contains('.') {
                        let parts: Vec<&str> = table_ref.split('.').collect();
                        (parts[0].to_string(), parts[1].to_string())
                    } else {
                        (
                            req.active_schema
                                .clone()
                                .unwrap_or_else(|| "public".to_string()),
                            table_ref.clone(),
                        )
                    };

                    // Lazy load columns
                    if let Ok(cols) = self
                        .schema_cache
                        .get_columns(
                            req.connection_id,
                            &req.database_name,
                            &schema,
                            &table,
                            driver.clone(),
                        )
                        .await
                    {
                        for col in cols {
                            let display_name = format!("{}.{}", alias, col.object_name);
                            suggestions.push(Suggestion {
                                label: display_name,
                                insert_text: col.object_name.clone(), // Or maybe full ref? Usually just column name if context is clear, but let's stick to simple insert
                                kind: "column".to_string(),
                                detail: Some(format!("from {}", table)),
                                score: 80,
                            });
                        }
                    }
                }

                // Also suggest functions
                suggestions.push(Suggestion {
                    label: "COUNT(*)".to_string(),
                    insert_text: "COUNT(*)".to_string(),
                    kind: "function".to_string(),
                    detail: Some("Aggregate".to_string()),
                    score: 90,
                });
            }
            _ => {
                // General keywords
                let keywords = vec![
                    "SELECT",
                    "FROM",
                    "WHERE",
                    "GROUP BY",
                    "ORDER BY",
                    "HAVING",
                    "LIMIT",
                    "INSERT",
                    "UPDATE",
                    "DELETE",
                    "JOIN",
                    "LEFT JOIN",
                    "RIGHT JOIN",
                    "INNER JOIN",
                    "OUTER JOIN",
                ];
                for kw in keywords {
                    suggestions.push(Suggestion {
                        label: kw.to_string(),
                        insert_text: kw.to_string(),
                        kind: "keyword".to_string(),
                        detail: None,
                        score: 50,
                    });
                }
            }
        }

        Ok(suggestions)
    }
}
