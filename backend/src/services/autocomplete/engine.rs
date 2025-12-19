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
    pub database_name: Option<String>,
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

        // 1. Parse Context
        let parse_result = AutocompleteParser::parse(&req.sql, req.cursor_pos);

        // 2. Safety Check
        if !parse_result.is_safe_location {
            return Ok(Vec::new());
        }

        // 3. Extract current typing prefix for filtering
        let current_prefix = parse_result.current_token.as_deref().unwrap_or("");

        let mut suggestions = Vec::new();
        let active_schema = req.active_schema.as_deref().unwrap_or("public");

        // 4. Generate suggestions based on context
        match parse_result.context {
            CursorContext::From | CursorContext::Join => {
                // Suggest tables and views from active schema
                self.add_table_suggestions(
                    &mut suggestions,
                    &req,
                    active_schema,
                    driver.clone(),
                    current_prefix,
                    true, // in_active_schema
                )
                .await?;

                // Also suggest schemas for qualified references
                self.add_schema_suggestions(&mut suggestions, &req, driver.clone(), current_prefix)
                    .await?;
            }

            CursorContext::Select
            | CursorContext::Where
            | CursorContext::On
            | CursorContext::OrderBy
            | CursorContext::GroupBy => {
                // Check if typing after alias/table qualifier (e.g., "u.")
                if let Some(chain) = &parse_result.identifier_chain {
                    if let Some(last) = chain.parts.last() {
                        if last.is_empty() && chain.parts.len() > 1 {
                            // Qualified column reference: "alias." or "schema.table."
                            let qualifier = &chain.parts[chain.parts.len() - 2];
                            self.add_qualified_column_suggestions(
                                &mut suggestions,
                                &req,
                                qualifier,
                                &parse_result.aliases,
                                driver.clone(),
                                current_prefix,
                            )
                            .await?;

                            // Apply filtering and ranking
                            Self::filter_and_rank(&mut suggestions, current_prefix);
                            return Ok(suggestions);
                        }
                    }
                }

                // Debug: Log context and extracted aliases
                tracing::debug!(
                    "Autocomplete context: {:?}, Aliases found: {:?}",
                    parse_result.context,
                    parse_result.aliases
                );

                // General column suggestions from all tables in FROM/JOIN
                self.add_column_suggestions(
                    &mut suggestions,
                    &req,
                    &parse_result.aliases,
                    driver.clone(),
                    current_prefix,
                )
                .await?;

                // Add function suggestions
                self.add_function_suggestions(
                    &mut suggestions,
                    &req,
                    active_schema,
                    driver.clone(),
                    current_prefix,
                )
                .await?;

                // Add common aggregate functions
                self.add_builtin_functions(&mut suggestions, current_prefix);
            }

            _ => {
                // Unknown context: suggest keywords
                self.add_keyword_suggestions(&mut suggestions, current_prefix);
            }
        }

        // 5. Filter, rank, and sort suggestions
        tracing::info!("📊 Before filter: {} suggestions", suggestions.len());
        Self::filter_and_rank(&mut suggestions, current_prefix);
        tracing::info!(
            "✅ After filter: {} suggestions (prefix: '{}')",
            suggestions.len(),
            current_prefix
        );

        Ok(suggestions)
    }

    async fn add_table_suggestions(
        &self,
        suggestions: &mut Vec<Suggestion>,
        req: &AutocompleteRequest,
        schema: &str,
        driver: Arc<dyn DatabaseDriver>,
        _prefix: &str,
        in_active_schema: bool,
    ) -> Result<()> {
        let objects = self
            .schema_cache
            .get_schema_metadata(
                req.connection_id,
                req.database_name.as_deref().unwrap_or("postgres"),
                schema,
                driver,
                false,
            )
            .await?;

        for obj in objects {
            let base_score = if in_active_schema { 700 } else { 650 };
            suggestions.push(Suggestion {
                label: obj.object_name.clone(),
                insert_text: obj.object_name.clone(),
                kind: obj.object_type.clone(),
                detail: Some(format!("in {}", obj.schema_name)),
                score: base_score,
            });
        }

        Ok(())
    }

    async fn add_schema_suggestions(
        &self,
        suggestions: &mut Vec<Suggestion>,
        _req: &AutocompleteRequest,
        driver: Arc<dyn DatabaseDriver>,
        _prefix: &str,
    ) -> Result<()> {
        if let Ok(schemas) = DatabaseDriver::get_schemas(&*driver).await {
            for schema in schemas {
                suggestions.push(Suggestion {
                    label: schema.clone(),
                    insert_text: schema.clone(),
                    kind: "schema".to_string(),
                    detail: Some("schema".to_string()),
                    score: 600,
                });
            }
        }

        Ok(())
    }

    async fn add_qualified_column_suggestions(
        &self,
        suggestions: &mut Vec<Suggestion>,
        req: &AutocompleteRequest,
        qualifier: &str,
        aliases: &std::collections::HashMap<String, String>,
        driver: Arc<dyn DatabaseDriver>,
        _prefix: &str,
    ) -> Result<()> {
        // Resolve qualifier to actual table
        let table_ref = aliases
            .get(qualifier)
            .map(|s| s.as_str())
            .unwrap_or(qualifier);

        let (schema, table) = if table_ref.contains('.') {
            let parts: Vec<&str> = table_ref.split('.').collect();
            (parts[0].to_string(), parts[1].to_string())
        } else {
            (
                req.active_schema
                    .clone()
                    .unwrap_or_else(|| "public".to_string()),
                table_ref.to_string(),
            )
        };

        if let Ok(cols) = self
            .schema_cache
            .get_columns(
                req.connection_id,
                req.database_name.as_deref().unwrap_or("postgres"),
                &schema,
                &table,
                driver,
            )
            .await
        {
            for col in cols {
                suggestions.push(Suggestion {
                    label: col.object_name.clone(),
                    insert_text: col.object_name.clone(),
                    kind: "column".to_string(),
                    detail: Some(format!("{}.{}", qualifier, col.object_name)),
                    score: 1000, // Highest priority for qualified columns
                });
            }
        }

        Ok(())
    }

    async fn add_column_suggestions(
        &self,
        suggestions: &mut Vec<Suggestion>,
        req: &AutocompleteRequest,
        aliases: &std::collections::HashMap<String, String>,
        driver: Arc<dyn DatabaseDriver>,
        _prefix: &str,
    ) -> Result<()> {
        tracing::info!(
            "add_column_suggestions called with {} aliases",
            aliases.len()
        );

        if aliases.is_empty() {
            tracing::warn!("❌ No aliases found - cannot suggest columns");
            return Ok(());
        }

        for (alias, table_ref) in aliases {
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

            let db_name = req.database_name.as_deref().unwrap_or("postgres");

            tracing::debug!(
                "Fetching columns for alias '{}' -> table '{}.{}' in database '{}'",
                alias,
                schema,
                table,
                db_name
            );

            if let Ok(cols) = self
                .schema_cache
                .get_columns(req.connection_id, db_name, &schema, &table, driver.clone())
                .await
            {
                tracing::debug!(
                    "✅ Successfully fetched {} columns for {}.{}",
                    cols.len(),
                    schema,
                    table
                );
                if cols.is_empty() {
                    tracing::warn!("⚠️ No columns found in cache/db for {}.{}!", schema, table);
                }
                for col in cols {
                    let display_name = format!("{}.{}", alias, col.object_name);
                    suggestions.push(Suggestion {
                        label: display_name,
                        insert_text: col.object_name.clone(),
                        kind: "column".to_string(),
                        detail: Some(format!("from {}", table)),
                        score: 800, // Columns from FROM/JOIN tables
                    });
                }
            } else {
                tracing::warn!("Failed to fetch columns for {}.{}", schema, table);
            }
        }

        Ok(())
    }

    async fn add_function_suggestions(
        &self,
        suggestions: &mut Vec<Suggestion>,
        _req: &AutocompleteRequest,
        schema: &str,
        driver: Arc<dyn DatabaseDriver>,
        _prefix: &str,
    ) -> Result<()> {
        // Get user-defined functions from active schema
        if let Ok(functions) = DatabaseDriver::list_functions(&*driver, schema).await {
            for func in functions {
                let signature = func.arguments.as_deref().unwrap_or("");
                suggestions.push(Suggestion {
                    label: format!("{}({})", func.name, signature),
                    insert_text: format!("{}()", func.name),
                    kind: "function".to_string(),
                    detail: Some(format!("in {}", func.schema)),
                    score: 550,
                });
            }
        }

        Ok(())
    }

    fn add_builtin_functions(&self, suggestions: &mut Vec<Suggestion>, _prefix: &str) {
        let builtins = vec![
            ("COUNT", "COUNT(*)", "Aggregate function"),
            ("SUM", "SUM()", "Aggregate function"),
            ("AVG", "AVG()", "Aggregate function"),
            ("MIN", "MIN()", "Aggregate function"),
            ("MAX", "MAX()", "Aggregate function"),
            ("COALESCE", "COALESCE()", "Returns first non-null value"),
            ("NULLIF", "NULLIF()", "Returns NULL if equal"),
            ("CAST", "CAST( AS )", "Type conversion"),
            ("UPPER", "UPPER()", "Convert to uppercase"),
            ("LOWER", "LOWER()", "Convert to lowercase"),
            ("TRIM", "TRIM()", "Remove whitespace"),
            ("NOW", "NOW()", "Current timestamp"),
            ("CURRENT_DATE", "CURRENT_DATE", "Current date"),
            (
                "CURRENT_TIMESTAMP",
                "CURRENT_TIMESTAMP",
                "Current timestamp",
            ),
        ];

        for (name, insert, detail) in builtins {
            suggestions.push(Suggestion {
                label: name.to_string(),
                insert_text: insert.to_string(),
                kind: "function".to_string(),
                detail: Some(detail.to_string()),
                score: 500,
            });
        }
    }

    fn add_keyword_suggestions(&self, suggestions: &mut Vec<Suggestion>, _prefix: &str) {
        let keywords = vec![
            "SELECT",
            "FROM",
            "WHERE",
            "JOIN",
            "LEFT JOIN",
            "RIGHT JOIN",
            "INNER JOIN",
            "OUTER JOIN",
            "FULL JOIN",
            "CROSS JOIN",
            "ON",
            "GROUP BY",
            "HAVING",
            "ORDER BY",
            "LIMIT",
            "OFFSET",
            "UNION",
            "UNION ALL",
            "INTERSECT",
            "EXCEPT",
            "INSERT INTO",
            "UPDATE",
            "DELETE FROM",
            "CREATE TABLE",
            "ALTER TABLE",
            "DROP TABLE",
            "TRUNCATE",
            "AS",
            "DISTINCT",
            "ALL",
            "AND",
            "OR",
            "NOT",
            "IN",
            "EXISTS",
            "BETWEEN",
            "LIKE",
            "ILIKE",
            "IS NULL",
            "IS NOT NULL",
            "CASE",
            "WHEN",
            "THEN",
            "ELSE",
            "END",
        ];

        for kw in keywords {
            suggestions.push(Suggestion {
                label: kw.to_string(),
                insert_text: kw.to_string(),
                kind: "keyword".to_string(),
                detail: None,
                score: 100,
            });
        }
    }

    fn filter_and_rank(suggestions: &mut Vec<Suggestion>, prefix: &str) {
        let prefix_lower = prefix.to_lowercase();

        // Calculate match quality and adjust scores
        for suggestion in suggestions.iter_mut() {
            let label_lower = suggestion.label.to_lowercase();

            if prefix.is_empty() {
                // No filtering, keep base score
                continue;
            }

            // Check match type
            let match_boost = if label_lower.starts_with(&prefix_lower) {
                // Prefix match - highest boost
                300
            } else if label_lower.contains(&prefix_lower) {
                // Substring match - medium boost
                150
            } else if Self::fuzzy_match(&label_lower, &prefix_lower) {
                // Fuzzy match - low boost
                50
            } else {
                // No match - filter out
                suggestion.score = -1;
                continue;
            };

            suggestion.score += match_boost;
        }

        // Remove non-matching suggestions
        suggestions.retain(|s| s.score >= 0);

        // Sort by score (descending), then by label (ascending) for stability
        suggestions.sort_by(|a, b| b.score.cmp(&a.score).then_with(|| a.label.cmp(&b.label)));

        // Limit results to top 50 for performance
        suggestions.truncate(50);
    }

    fn fuzzy_match(text: &str, pattern: &str) -> bool {
        let mut pattern_chars = pattern.chars();
        let mut current_pattern_char = pattern_chars.next();

        for text_char in text.chars() {
            if let Some(pc) = current_pattern_char {
                if text_char == pc {
                    current_pattern_char = pattern_chars.next();
                }
            } else {
                return true;
            }
        }

        current_pattern_char.is_none()
    }
}
