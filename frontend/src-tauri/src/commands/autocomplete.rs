use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;

#[derive(Debug, Serialize, Deserialize)]
pub struct Suggestion {
    pub label: String,
    pub insert_text: String,
    pub kind: String,
    pub detail: Option<String>,
    pub score: i32,
}

#[derive(Serialize)]
struct AutocompleteRequest {
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
}

#[tauri::command]
pub async fn autocomplete_suggest(
    state: State<'_, AppState>,
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
) -> Result<Vec<Suggestion>, String> {
    // Call the backend handler directly
    let uuid = uuid::Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let request = dbplus_backend::handlers::autocomplete::AutocompleteRequest {
        connection_id: uuid,
        sql,
        cursor_pos,
        active_schema,
        database_name: None,
    };

    let result = dbplus_backend::handlers::autocomplete::get_suggestions_impl(
        &state.inner().clone(),
        request,
    )
    .await
    .map_err(|e| e.to_string())?;

    // Convert backend suggestions to our format
    let suggestions = result
        .into_iter()
        .map(|s| Suggestion {
            label: s.label,
            insert_text: s.insert_text,
            kind: s.kind,
            detail: s.detail,
            score: s.score,
        })
        .collect();

    Ok(suggestions)
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RefreshScope {
    All,
    Schema(String),
    Table { schema_name: String, table_name: String },
}

#[tauri::command]
pub async fn schema_refresh(
    state: State<'_, AppState>,
    connection_id: String,
    scope: Option<RefreshScope>,
) -> Result<(), String> {
    let uuid = uuid::Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // Convert enum to the format expected by backend
    let (scope_str, schema_name, table_name) = match scope {
        Some(RefreshScope::All) | None => ("all".to_string(), None, None),
        Some(RefreshScope::Schema(s)) => ("schema".to_string(), Some(s), None),
        Some(RefreshScope::Table { schema_name, table_name }) => (
            "table".to_string(),
            Some(schema_name),
            Some(table_name),
        ),
    };

    let request = dbplus_backend::handlers::schema_refresh::RefreshRequest {
        scope: scope_str,
        schema_name,
        table_name,
    };

    dbplus_backend::handlers::schema_refresh::refresh_schema_impl(
        &state.inner().clone(),
        uuid,
        request,
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(())
}
