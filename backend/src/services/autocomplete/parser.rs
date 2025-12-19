use sqlparser::dialect::GenericDialect;
use sqlparser::tokenizer::{Token, Tokenizer, Word};
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
    // Alias -> Table Name (fully qualified if possible)
    pub aliases: HashMap<String, String>,
    pub is_safe_location: bool,
}

pub struct AutocompleteParser;

impl AutocompleteParser {
    pub fn parse(sql: &str, cursor_pos: usize) -> ParseResult {
        // Use GenericDialect for maximum compatibility in this MVP
        let dialect = GenericDialect {};
        let mut tokenizer = Tokenizer::new(&dialect, sql);

        // Handling potentially unclosed strings is tricky with strict tokenizers.
        // For MVP, if it fails, we might just try to substring up to cursor?
        // But then we lose context.
        // Let's try to tokenize the whole thing. If it fails, maybe just the prefix.
        let tokens = match tokenizer.tokenize() {
            Ok(t) => t,
            Err(_) => {
                // Fallback: Try tokenizing up to the cursor + a bit of slack?
                // Or just try tokenizing strictly up to text_len.
                // If the entire string is invalid, we return a safe default.
                // Getting tokens even from invalid SQL is hard with sqlparser if it panics/errors.
                // Let's try tokenizing just the prefix as a fallback strategy usually works for "in-progress" typing.
                if let Ok(prefix_tokens) = Tokenizer::new(&dialect, &sql[..cursor_pos]).tokenize() {
                    prefix_tokens
                } else {
                    return ParseResult {
                        context: CursorContext::Unknown,
                        current_token: None,
                        current_token_range: None,
                        identifier_chain: None,
                        aliases: HashMap::new(),
                        is_safe_location: true, // Optimistic fallback
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

        let (alias_map, tokens_before) = Self::analyze_structure(&tokens, sql, cursor_pos);

        // 2. Determine Context from tokens
        let context = Self::determine_context(&tokens_before);

        // 3. Extract identifier chain at cursor
        let (chain, range) = Self::extract_identifier_chain(sql, cursor_pos);

        // 4. Current token simple extraction
        let current_token = chain.parts.last().cloned();

        ParseResult {
            context,
            current_token,
            current_token_range: range,
            identifier_chain: Some(chain),
            aliases: alias_map,
            is_safe_location: true,
        }
    }

    fn fast_check_safety(sql: &str, cursor: usize) -> (bool, bool, bool) {
        let mut in_quote = false;
        let mut quote_char = '\0';
        let mut in_comment = false; // -- style
        let mut in_block_comment = false; // /* */ style

        let chars: Vec<char> = sql.chars().collect();
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
                    // Check for escape (doubling)
                    if i + 1 < chars.len() && chars[i + 1] == quote_char {
                        i += 1;
                    } else {
                        in_quote = false;
                    }
                }
            } else {
                // Start states
                if c == '\'' || c == '"' {
                    // " is sometimes identifier, but let's treat as unsafe for specialized suggestions for now? No, quoted identifiers are fine to complete!
                    // Actually, if we are in a double quoted string (identifier), we SHOULD suggest.
                    // If we are in single quote (literal), we should NOT.
                    if c == '\'' {
                        in_quote = true;
                        quote_char = c;
                    }
                    // We ignore " for safety check, as "Identifier" autocomplete is valid.
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

        // If we hit cursor while in these states
        let is_safe = !in_quote && !in_comment && !in_block_comment;
        (is_safe, in_comment || in_block_comment, in_quote)
    }

    fn extract_identifier_chain(
        sql: &str,
        cursor: usize,
    ) -> (QualifiedIdentifier, Option<(usize, usize)>) {
        // Backtrack from cursor to find the chain
        // Allowed chars: alphanumeric, _, $ (sometimes), and .
        // We stop at space or specialized chars

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

        // Find start
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

        let slice = &sql[start..cursor];
        // Split by dot, preserving empty parts for trailing dots (e.g. "schema.")
        let parts: Vec<String> = slice
            .split('.')
            .map(|s| s.replace("\"", "").to_string())
            .collect();

        // Special case: if ends with dot, the last part is empty string
        // "schema." -> ["schema", ""]

        (
            QualifiedIdentifier {
                parts,
                start,
                end: cursor,
            },
            Some((start, cursor)),
        )
    }

    fn analyze_structure(
        tokens: &[Token],
        _sql: &str,
        _cursor: usize,
    ) -> (HashMap<String, String>, Vec<Token>) {
        let mut aliases = HashMap::new();
        let mut tokens_before = Vec::new();

        // We need to approximate where the cursor is relative to tokens.
        // Since we don't have offsets, we can't be sure 100%.
        // But for *Context* determination (SELECT/FROM), simply using ALL tokens before the likely current word is usually enough.
        // Or if we assume the parser is called with *valid* tokens, we can just iterate all.
        // Wait, `tokens` passed here is the full list.

        // Since we did a backward scan for the identifier chain, we know the "word" at cursor.
        // A better MVP heuristic: Just use the full token stream to find aliases.
        // And use tokens strictly before the last "Word" for context.

        // 1. Extract Aliases (Global scan)
        let mut i = 0;
        while i < tokens.len() {
            // Pattern: FROM/JOIN table (AS) alias
            match &tokens[i] {
                Token::Word(w) => {
                    let k = w.value.to_uppercase();
                    if k == "FROM" || k == "JOIN" {
                        // Attempt to capture table + alias
                        if i + 1 < tokens.len() {
                            // Next token: Table name (or schema.table)
                            // For MVP, handle simple "schema.table" or "table"
                            let mut table_ref = String::new();
                            let mut next_idx = i + 1;

                            // Parse table ref
                            if let Token::Word(t) = &tokens[next_idx] {
                                table_ref = t.value.clone();
                                next_idx += 1;

                                // Check for dot
                                if next_idx < tokens.len()
                                    && matches!(tokens[next_idx], Token::Char('.'))
                                {
                                    table_ref.push('.');
                                    next_idx += 1;
                                    if next_idx < tokens.len() {
                                        if let Token::Word(t2) = &tokens[next_idx] {
                                            table_ref.push_str(&t2.value);
                                            next_idx += 1;
                                        }
                                    }
                                }
                            }

                            // Now look for Alias
                            // Optional AS
                            let mut alias = None;
                            if next_idx < tokens.len() {
                                if let Token::Word(possible_as) = &tokens[next_idx] {
                                    if possible_as.value.to_uppercase() == "AS" {
                                        next_idx += 1;
                                        if next_idx < tokens.len() {
                                            if let Token::Word(a) = &tokens[next_idx] {
                                                alias = Some(a.value.clone());
                                            }
                                        }
                                    } else if !Self::is_keyword(&possible_as.value) {
                                        // Implicit alias
                                        alias = Some(possible_as.value.clone());
                                    }
                                }
                            }

                            if let Some(a) = alias {
                                aliases.insert(a, table_ref);
                            }
                        }
                    }
                }
                _ => {}
            }
            i += 1;
        }

        // 2. Tokens before cursor
        // Heuristic: We assume the parser is usually called *while typing* at the end or inserting.
        // We'll trust `extract_identifier_chain` to give us the current "being typed" word.
        // Context is determined by the last significant keyword before that chain.

        // This is imperfect without offsets but works for 90% of cases.
        // We simply return all tokens for now as "context source" but context detection needs to scan backwards from end.
        // Actually, we should probably strip the "current typed word" if it exists in the token stream to see "what came before".

        // For MVP, let's just return the full stream and let context detector handle "last keyword".
        tokens_before = tokens.to_vec();

        (aliases, tokens_before)
    }

    fn determine_context(tokens: &[Token]) -> CursorContext {
        // Scan backwards from the end of the token stream.
        // Skip identifiers, commas, dots, parens (maybe).
        // The first Keyword we hit usually defines the clause.

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
                    "GROUP" => return CursorContext::GroupBy, // Tokenizer might split GROUP BY? Yes usually two tokens.
                    "ORDER" => return CursorContext::OrderBy,
                    "LIMIT" => return CursorContext::Limit,
                    "HAVING" => return CursorContext::Where, // Treated typically like Where for logic
                    "SET" => return CursorContext::Unknown,  // UPDATE SET - maybe special?
                    _ => {
                        // Check for multi-word keywords that might be split
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

            // Stop at semicolon?
            if matches!(token, Token::SemiColon) {
                // If we hit a semicolon scanning backwards, we are likely in a new statement (which might be empty/start)
                return CursorContext::Unknown;
            }
        }

        // Default
        CursorContext::Unknown
    }

    fn is_keyword(s: &str) -> bool {
        let keywords = [
            "SELECT", "FROM", "JOIN", "WHERE", "ON", "GROUP", "ORDER", "BY", "LIMIT", "HAVING",
            "UNION", "LEFT", "RIGHT", "INNER", "OUTER", "CROSS", "FULL", "AND", "OR", "NOT", "IN",
            "IS", "NULL", "LIKE",
        ];
        keywords.contains(&s.to_uppercase().as_str())
    }
}
