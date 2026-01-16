pub mod capabilities;
pub mod connection;
pub mod management;
pub mod query;
pub mod schema;
pub mod table;

pub use connection::CouchbaseDriver;

pub fn normalize_error<E: std::fmt::Display>(e: E, prefix: &str) -> anyhow::Error {
    let err_msg = e.to_string();

    // Try to find JSON block in case there's a prefix like "index failure: {"
    let json_start = err_msg.find('{');
    let json_val = if let Some(start) = json_start {
        serde_json::from_str::<serde_json::Value>(&err_msg[start..]).ok()
    } else {
        None
    };

    if let Some(json) = json_val {
        let extracted_msg = json
            .get("extended_context")
            .and_then(|ctx| ctx.get("message"))
            .or_else(|| json.get("message"))
            .or_else(|| {
                json.get("errors")
                    .and_then(|e| e.as_array())
                    .and_then(|a| a.first())
                    .and_then(|e| e.get("msg").or_else(|| e.get("message")))
            })
            .and_then(|m| m.as_str());

        if let Some(s) = extracted_msg {
            // Often contains "cause: [_:Message]"
            if let Some(cause_idx) = s.find("cause: [_:") {
                let start = cause_idx + 10;
                let cause = &s[start..];
                // Strip trailing bracket if exists
                let cause = cause.strip_suffix(']').unwrap_or(cause);
                return anyhow::anyhow!("{}: {}", prefix, cause);
            }
            return anyhow::anyhow!("{}: {}", prefix, s);
        }
    }

    anyhow::anyhow!("{}: {}", prefix, err_msg)
}
