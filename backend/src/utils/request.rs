use axum::http::HeaderMap;

pub fn database_override_from_headers(headers: &HeaderMap) -> Option<String> {
    headers
        .get("x-dbplus-database")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

