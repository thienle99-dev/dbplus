use sqlparser::dialect::GenericDialect;
use sqlparser::tokenizer::{Token, Tokenizer};
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq)]
pub enum CursorContext {
    Select,
    From,
    Join,
    Where,
    On,
    GroupBy,
    OrderBy,
    Limit,
    Unknown,
}

#[derive(Debug, Clone)]
pub struct QualifiedIdentifier {
    pub parts: Vec<String>,
    // The range of the entire chain in the original string
    pub start: usize,
    pub end: usize,
}

#[derive(Debug, Clone)]
pub struct ParseResult {
    pub context: CursorContext,
    pub current_token: Option<String>,
    pub current_token_range: Option<(usize, usize)>,
    pub identifier_chain: Option<QualifiedIdentifier>,
    pub aliases: HashMap<String, String>,
    pub is_safe_location: bool,
}

pub struct AutocompleteParser;

impl AutocompleteParser {
    pub fn parse(sql: &str, cursor_pos: usize) -> ParseResult {
        let dialect = GenericDialect {};
        let mut tokenizer = Tokenizer::new(&dialect, sql);

        let tokens = match tokenizer.tokenize() {
            Ok(t) => {
                tracing::debug!("Successfully tokenized full SQL: {} tokens", t.len());
                t
            }
            Err(e) => {
                tracing::warn!(
                    "Failed to tokenize full SQL: {}. Trying fallback with prefix.",
                    e
                );
                if let Ok(prefix_tokens) = Tokenizer::new(&dialect, &sql[..cursor_pos]).tokenize() {
                    tracing::debug!("Fallback prefix tokenized: {} tokens", prefix_tokens.len());
                    prefix_tokens
                } else {
                    tracing::error!("Totally failed to tokenize SQL even with prefix.");
                    return ParseResult {
                        context: CursorContext::Unknown,
                        current_token: None,
                        current_token_range: None,
                        identifier_chain: None,
                        aliases: HashMap::new(),
                        is_safe_location: true,
                    };
                }
            }
        };

        // 1. Check if cursor is inside a string or comment
        let (safe, _in_comment_loc, _in_string_loc) = Self::fast_check_safety(sql, cursor_pos);
        if !safe {
            return ParseResult {
                context: CursorContext::Unknown,
                current_token: None,
                current_token_range: None,
                identifier_chain: None,
                aliases: HashMap::new(),
                is_safe_location: false,
            };
        }

        // 2. Extract the identifier chain at the cursor (e.g., "schema.table.")
        let (chain, range) = Self::extract_identifier_chain(sql, cursor_pos);

        let current_token = chain.parts.last().cloned();

        // 3. Analyze query structure to find aliases and context
        let (aliases, tokens_before) = Self::analyze_structure(&tokens, sql, cursor_pos);

        // 4. Determine context based on tokens before cursor
        let context = if tokens_before.is_empty() {
            CursorContext::Select // Start of query
        } else {
            Self::determine_context(&tokens_before)
        };

        ParseResult {
            context,
            current_token,
            current_token_range: range,
            identifier_chain: Some(chain),
            aliases,
            is_safe_location: true,
        }
    }

    fn fast_check_safety(sql: &str, cursor: usize) -> (bool, bool, bool) {
        let chars: Vec<char> = sql.chars().collect();
        let mut in_quote = false;
        let mut quote_char = ' ';
        let mut in_comment = false;
        let mut in_block_comment = false;

        let mut i = 0;
        while i < chars.len() && i < cursor {
            let c = chars[i];

            if in_comment {
                if c == '\n' {
                    in_comment = false;
                }
            } else if in_block_comment {
                if c == '*' && i + 1 < chars.len() && chars[i + 1] == '/' {
                    in_block_comment = false;
                    i += 1;
                }
            } else if in_quote {
                if c == quote_char {
                    // Check for escaped quote (SQL style: '')
                    if i + 1 < chars.len() && chars[i + 1] == quote_char {
                        i += 1;
                    } else {
                        in_quote = false;
                    }
                }
            } else {
                if c == '\'' || c == '"' || c == '`' {
                    in_quote = true;
                    quote_char = c;
                } else if c == '-' && i + 1 < chars.len() && chars[i + 1] == '-' {
                    in_comment = true;
                    i += 1;
                } else if c == '/' && i + 1 < chars.len() && chars[i + 1] == '*' {
                    in_block_comment = true;
                    i += 1;
                }
            }
            i += 1;
        }

        let is_safe = !in_quote && !in_comment && !in_block_comment;
        (is_safe, in_comment || in_block_comment, in_quote)
    }

    fn extract_identifier_chain(
        sql: &str,
        cursor: usize,
    ) -> (QualifiedIdentifier, Option<(usize, usize)>) {
        if cursor == 0 {
            return (
                QualifiedIdentifier {
                    parts: vec![],
                    start: 0,
                    end: 0,
                },
                None,
            );
        }

        let chars: Vec<char> = sql.chars().collect();
        let mut start = cursor;

        while start > 0 {
            let c = chars[start - 1];
            if c.is_alphanumeric() || c == '_' || c == '.' || c == '"' {
                start -= 1;
            } else {
                break;
            }
        }

        if start == cursor {
            return (
                QualifiedIdentifier {
                    parts: vec![],
                    start: cursor,
                    end: cursor,
                },
                None,
            );
        }

        let byte_start = chars
            .iter()
            .take(start)
            .map(|c| c.len_utf8())
            .sum::<usize>();
        let byte_end = chars
            .iter()
            .take(cursor)
            .map(|c| c.len_utf8())
            .sum::<usize>();

        let slice = &sql[byte_start..byte_end];
        let parts: Vec<String> = slice
            .split('.')
            .map(|s| s.replace("\"", "").to_string())
            .collect();

        (
            QualifiedIdentifier {
                parts,
                start: byte_start,
                end: byte_end,
            },
            Some((byte_start, byte_end)),
        )
    }

    fn analyze_structure(
        tokens: &[Token],
        sql: &str,
        cursor: usize,
    ) -> (HashMap<String, String>, Vec<Token>) {
        let mut aliases = HashMap::new();
        let mut tokens_before = Vec::new();

        tracing::debug!("Extracting aliases from {} tokens", tokens.len());

        let mut i = 0;
        while i < tokens.len() {
            match &tokens[i] {
                Token::Word(w) => {
                    let k = w.value.to_uppercase();
                    if k == "FROM" || k == "JOIN" {
                        let mut next_idx = i + 1;

                        // Helper to skip whitespace
                        while next_idx < tokens.len()
                            && matches!(tokens[next_idx], Token::Whitespace(_))
                        {
                            next_idx += 1;
                        }

                        if next_idx < tokens.len() {
                            let mut table_ref = String::new();

                            if let Token::Word(t) = &tokens[next_idx] {
                                table_ref = t.value.clone();
                                next_idx += 1;

                                // Check for dot
                                if next_idx < tokens.len()
                                    && (matches!(tokens[next_idx], Token::Period)
                                        || matches!(tokens[next_idx], Token::Char('.')))
                                {
                                    table_ref.push('.');
                                    next_idx += 1;

                                    while next_idx < tokens.len()
                                        && matches!(tokens[next_idx], Token::Whitespace(_))
                                    {
                                        next_idx += 1;
                                    }

                                    if next_idx < tokens.len() {
                                        if let Token::Word(t2) = &tokens[next_idx] {
                                            table_ref.push_str(&t2.value);
                                            next_idx += 1;
                                        }
                                    }
                                }
                            }

                            if !table_ref.is_empty() {
                                while next_idx < tokens.len()
                                    && matches!(tokens[next_idx], Token::Whitespace(_))
                                {
                                    next_idx += 1;
                                }

                                let mut alias = None;
                                if next_idx < tokens.len() {
                                    if let Token::Word(aw) = &tokens[next_idx] {
                                        let val = aw.value.to_uppercase();
                                        if val == "AS" {
                                            next_idx += 1;
                                            while next_idx < tokens.len()
                                                && matches!(tokens[next_idx], Token::Whitespace(_))
                                            {
                                                next_idx += 1;
                                            }
                                            if next_idx < tokens.len() {
                                                if let Token::Word(aw2) = &tokens[next_idx] {
                                                    alias = Some(aw2.value.clone());
                                                    next_idx += 1;
                                                }
                                            }
                                        } else if ![
                                            "WHERE", "GROUP", "ORDER", "LIMIT", "JOIN", "ON",
                                            "UNION", "SELECT", "HAVING",
                                        ]
                                        .contains(&val.as_str())
                                        {
                                            alias = Some(aw.value.clone());
                                            next_idx += 1;
                                        }
                                    }
                                }

                                let final_alias = if let Some(a) = alias {
                                    a
                                } else {
                                    if table_ref.contains('.') {
                                        table_ref
                                            .split('.')
                                            .last()
                                            .unwrap_or(&table_ref)
                                            .to_string()
                                    } else {
                                        table_ref.clone()
                                    }
                                };

                                tracing::debug!(
                                    "Found alias: '{}' -> '{}'",
                                    final_alias,
                                    table_ref
                                );
                                aliases.insert(final_alias, table_ref);

                                i = next_idx.saturating_sub(1);
                            }
                        }
                    }
                }
                _ => {}
            }
            i += 1;
        }

        // Filter tokens before cursor
        let mut cursor_idx = tokens.len();
        let mut current_pos = 0;

        for (idx, token) in tokens.iter().enumerate() {
            let token_str = token.to_string();

            // For whitespace tokens, we just advance the position by their length
            // For other tokens, we find their next occurrence after current_pos
            if matches!(token, Token::Whitespace(_)) {
                current_pos += token_str.len();
            } else {
                // Heuristic: try to find the token string in the SQL
                // Note: sqlparser's to_string() might not match original source casing/quoting perfectly,
                // but for context keywords like SELECT/FROM it usually does.
                if let Some(rel_pos) = sql[current_pos..]
                    .to_uppercase()
                    .find(&token_str.to_uppercase())
                {
                    current_pos += rel_pos + token_str.len();
                } else {
                    // Fallback: just advance by estimated length
                    current_pos += token_str.len();
                }
            }

            if current_pos >= cursor {
                cursor_idx = idx + 1; // Include the token at the cursor for better context
                break;
            }
        }

        tokens_before = tokens[..cursor_idx].to_vec();

        tracing::debug!(
            "Alias extraction complete: {} aliases, {} tokens before cursor (out of {})",
            aliases.len(),
            tokens_before.len(),
            tokens.len()
        );

        (aliases, tokens_before)
    }

    fn determine_context(tokens: &[Token]) -> CursorContext {
        let mut i = tokens.len();
        while i > 0 {
            i -= 1;
            let token = &tokens[i];

            if let Token::Word(w) = token {
                let kw = w.value.to_uppercase();
                match kw.as_str() {
                    "SELECT" => return CursorContext::Select,
                    "FROM" => return CursorContext::From,
                    "JOIN" => return CursorContext::Join,
                    "WHERE" => return CursorContext::Where,
                    "ON" => return CursorContext::On,
                    "GROUP" => return CursorContext::GroupBy,
                    "ORDER" => return CursorContext::OrderBy,
                    "LIMIT" => return CursorContext::Limit,
                    "HAVING" => return CursorContext::Where,
                    _ => {
                        if kw == "BY" && i > 0 {
                            if let Token::Word(prev) = &tokens[i - 1] {
                                let prev_kw = prev.value.to_uppercase();
                                if prev_kw == "GROUP" {
                                    return CursorContext::GroupBy;
                                }
                                if prev_kw == "ORDER" {
                                    return CursorContext::OrderBy;
                                }
                            }
                        }
                    }
                }
            }
        }
        CursorContext::Unknown
    }

    pub fn is_keyword(s: &str) -> bool {
        let keywords = [
            "SELECT", "FROM", "WHERE", "GROUP", "ORDER", "LIMIT", "JOIN", "ON", "AS", "AND", "OR",
            "IN", "IS", "NOT", "NULL", "UNION", "ALL", "CASE", "WHEN", "THEN", "ELSE", "END",
        ];
        keywords.contains(&s.to_uppercase().as_str())
    }
}
