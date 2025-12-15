pub fn count_sql_statements(script: &str) -> u64 {
    split_sql_statements(script).len() as u64
}

pub fn split_sql_statements(script: &str) -> Vec<String> {
    let mut out = Vec::new();
    let mut buf = String::new();

    let mut in_single = false;
    let mut in_double = false;
    let mut in_line_comment = false;
    let mut in_block_comment = false;
    let mut dollar_tag: Option<String> = None;

    let chars: Vec<char> = script.chars().collect();
    let mut i = 0usize;
    while i < chars.len() {
        let c = chars[i];
        let next = chars.get(i + 1).copied();

        if in_line_comment {
            buf.push(c);
            if c == '\n' {
                in_line_comment = false;
            }
            i += 1;
            continue;
        }

        if in_block_comment {
            buf.push(c);
            if c == '*' && next == Some('/') {
                buf.push('/');
                in_block_comment = false;
                i += 2;
                continue;
            }
            i += 1;
            continue;
        }

        if let Some(tag) = &dollar_tag {
            buf.push(c);
            if c == '$' {
                let remaining: String = chars[i..].iter().collect();
                let closing = format!("${}$", tag);
                if remaining.starts_with(&closing) {
                    // we already pushed the first '$', now push the rest of the closing tag
                    for ch in closing.chars().skip(1) {
                        buf.push(ch);
                    }
                    dollar_tag = None;
                    i += closing.chars().count();
                    continue;
                }
            }
            i += 1;
            continue;
        }

        if !in_single && !in_double {
            if c == '-' && next == Some('-') {
                buf.push(c);
                buf.push('-');
                in_line_comment = true;
                i += 2;
                continue;
            }
            if c == '/' && next == Some('*') {
                buf.push(c);
                buf.push('*');
                in_block_comment = true;
                i += 2;
                continue;
            }
        }

        if !in_double && c == '\'' {
            buf.push(c);
            if in_single && next == Some('\'') {
                // escaped single quote
                buf.push('\'');
                i += 2;
                continue;
            }
            in_single = !in_single;
            i += 1;
            continue;
        }

        if !in_single && c == '"' {
            buf.push(c);
            if in_double && next == Some('"') {
                // escaped double quote
                buf.push('"');
                i += 2;
                continue;
            }
            in_double = !in_double;
            i += 1;
            continue;
        }

        if !in_single && !in_double && c == '$' {
            // Postgres dollar-quoted string: $tag$ ... $tag$
            // tag can be empty.
            let mut j = i + 1;
            while j < chars.len() {
                let ch = chars[j];
                if ch == '$' {
                    let tag: String = chars[i + 1..j].iter().collect();
                    buf.push('$');
                    buf.push_str(&tag);
                    buf.push('$');
                    dollar_tag = Some(tag);
                    i = j + 1;
                    break;
                }
                if !(ch.is_ascii_alphanumeric() || ch == '_') {
                    buf.push('$');
                    i += 1;
                    break;
                }
                j += 1;
            }
            if j >= chars.len() {
                buf.push('$');
                i += 1;
            }
            continue;
        }

        if !in_single && !in_double && c == ';' {
            let stmt = buf.trim();
            if !stmt.is_empty() {
                out.push(stmt.to_string());
            }
            buf.clear();
            i += 1;
            continue;
        }

        buf.push(c);
        i += 1;
    }

    let last = buf.trim();
    if !last.is_empty() {
        out.push(last.to_string());
    }

    out
}

