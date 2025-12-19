use crate::services::autocomplete::schema_cache::SchemaCacheService;
use crate::services::db_driver::DatabaseDriver;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlparser::dialect::PostgreSqlDialect;
use sqlparser::tokenizer::{Token, Tokenizer};
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
        let tokens = {
            let dialect = PostgreSqlDialect {};
            let mut tokenizer = Tokenizer::new(&dialect, &req.sql);
            tokenizer.tokenize().unwrap_or_default()
        };

        // Find context based on tokens before cursor
        let context = self.get_context(&req.sql, req.cursor_pos, &tokens);

        let mut suggestions = Vec::new();

        match context {
            Context::From | Context::Join => {
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
            Context::Select
            | Context::Where
            | Context::On
            | Context::OrderBy
            | Context::GroupBy => {
                // Find tables in query to suggest columns
                let tables = self.extract_tables(&tokens, req.cursor_pos);
                for (table_name, alias) in tables {
                    // Lazy load columns
                    let schema = req.active_schema.as_deref().unwrap_or("public");
                    let cols = self
                        .schema_cache
                        .get_columns(
                            req.connection_id,
                            &req.database_name,
                            schema,
                            &table_name,
                            driver.clone(),
                        )
                        .await?;

                    for col in cols {
                        let display_name = if let Some(a) = &alias {
                            format!("{}.{}", a, col.object_name)
                        } else {
                            col.object_name.clone()
                        };

                        suggestions.push(Suggestion {
                            label: display_name.clone(),
                            insert_text: col.object_name.clone(),
                            kind: "column".to_string(),
                            detail: Some(format!("from {}", table_name)),
                            score: 80,
                        });
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
            Context::Alias(alias) => {
                let tables = self.extract_tables(&tokens, req.cursor_pos);
                if let Some((table_name, _)) = tables
                    .iter()
                    .find(|(t, a)| a.as_ref() == Some(&alias) || t == &alias)
                {
                    let schema = req.active_schema.as_deref().unwrap_or("public");
                    let cols = self
                        .schema_cache
                        .get_columns(
                            req.connection_id,
                            &req.database_name,
                            schema,
                            table_name,
                            driver.clone(),
                        )
                        .await?;

                    for col in cols {
                        suggestions.push(Suggestion {
                            label: col.object_name.clone(),
                            insert_text: col.object_name.clone(),
                            kind: "column".to_string(),
                            detail: Some(format!("from {}", table_name)),
                            score: 110,
                        });
                    }
                }
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

    fn get_context(&self, sql: &str, cursor_pos: usize, _tokens: &[Token]) -> Context {
        if cursor_pos == 0 {
            return Context::Unknown;
        }

        let text_before = &sql[..cursor_pos];
        let words: Vec<&str> = text_before.split_whitespace().collect();

        if let Some(last_word) = words.last() {
            let upper = last_word.to_uppercase();
            if upper == "SELECT" {
                return Context::Select;
            }
            if upper == "FROM" || upper == "JOIN" {
                return Context::From;
            }
            if upper == "WHERE" || upper == "AND" || upper == "OR" {
                return Context::Where;
            }
            if upper == "ON" {
                return Context::On;
            }
            if upper == "BY" {
                if words.len() >= 2 && words[words.len() - 2].to_uppercase() == "GROUP" {
                    return Context::GroupBy;
                }
                if words.len() >= 2 && words[words.len() - 2].to_uppercase() == "ORDER" {
                    return Context::OrderBy;
                }
            }

            if last_word.ends_with('.') {
                let alias = &last_word[..last_word.len() - 1];
                return Context::Alias(alias.to_string());
            }
        }

        Context::Unknown
    }

    fn extract_tables(
        &self,
        tokens: &[Token],
        _cursor_pos: usize,
    ) -> Vec<(String, Option<String>)> {
        let mut tables = Vec::new();
        let mut i = 0;
        while i < tokens.len() {
            match &tokens[i] {
                Token::Word(w)
                    if w.value.to_uppercase() == "FROM" || w.value.to_uppercase() == "JOIN" =>
                {
                    i += 1;
                    if i < tokens.len() {
                        if let Token::Word(table_word) = &tokens[i] {
                            let table_name = table_word.value.clone();
                            let mut alias = None;
                            i += 1;
                            // Check for AS or alias
                            if i < tokens.len() {
                                if let Token::Word(next_word) = &tokens[i] {
                                    if next_word.value.to_uppercase() == "AS" {
                                        i += 1;
                                        if i < tokens.len() {
                                            if let Token::Word(alias_word) = &tokens[i] {
                                                alias = Some(alias_word.value.clone());
                                            }
                                        }
                                    } else if !["WHERE", "GROUP", "ORDER", "JOIN", "LIMIT", "ON"]
                                        .contains(&next_word.value.to_uppercase().as_str())
                                    {
                                        alias = Some(next_word.value.clone());
                                    }
                                }
                            }
                            tables.push((table_name, alias));
                        }
                    }
                }
                _ => i += 1,
            }
        }
        tables
    }
}

pub enum Context {
    Select,
    From,
    Join,
    Where,
    On,
    OrderBy,
    GroupBy,
    Alias(String),
    Unknown,
}
