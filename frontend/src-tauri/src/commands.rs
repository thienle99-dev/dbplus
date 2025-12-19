use serde::{Deserialize, Serialize};
use reqwest::Client;

const BASE_URL: &str = "http://127.0.0.1:19999/api";

#[derive(Debug, Serialize, Deserialize)]
pub struct Suggestion {
    pub label: String,
    pub insert_text: String,
    pub kind: String,
    pub detail: Option<String>,
    pub score: i32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableRef {
    pub schema: String,
    pub name: String,
    pub table_type: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnRef {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
    pub is_foreign_key: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub enum RefreshScope {
    All,
    Schema(String),
    Table { schema_name: String, table_name: String },
}

#[derive(Serialize)]
struct AutocompleteRequest {
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
    // database_name is optional in backend, we can omit it if unknown
}

#[derive(Serialize)]
struct RefreshSchemaRequest {
    scope: String,
    schema_name: Option<String>,
    table_name: Option<String>,
}

#[tauri::command]
pub async fn autocomplete_suggest(
    connection_id: String,
    sql: String,
    cursor_pos: usize,
    active_schema: Option<String>,
) -> Result<Vec<Suggestion>, String> {
    let client = Client::new();
    let body = AutocompleteRequest {
        connection_id,
        sql,
        cursor_pos,
        active_schema,
    };

    let response = client
        .post(format!("{}/autocomplete", BASE_URL))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed: {}", response.status()));
    }

    let suggestions = response
        .json::<Vec<Suggestion>>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(suggestions)
}

#[tauri::command]
pub async fn schema_list_schemas(connection_id: String) -> Result<Vec<String>, String> {
    let client = Client::new();
    let response = client
        .get(format!("{}/connections/{}/schemas", BASE_URL, connection_id))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed: {}", response.status()));
    }

    let schemas = response
        .json::<Vec<String>>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(schemas)
}

#[tauri::command]
pub async fn schema_list_tables(
    connection_id: String,
    schema: String,
) -> Result<Vec<TableRef>, String> {
    let client = Client::new();
    let response = client
        .get(format!("{}/connections/{}/tables", BASE_URL, connection_id))
        .query(&[("schema", &schema)])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed: {}", response.status()));
    }

    let tables = response
        .json::<Vec<TableRef>>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(tables)
}

#[tauri::command]
pub async fn schema_get_columns(
    connection_id: String,
    schema: String,
    table: String,
) -> Result<Vec<ColumnRef>, String> {
    let client = Client::new();
    let response = client
        .get(format!("{}/connections/{}/columns", BASE_URL, connection_id))
        .query(&[("schema", &schema), ("table", &table)])
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed: {}", response.status()));
    }

    let columns = response
        .json::<Vec<ColumnRef>>()
        .await
        .map_err(|e| e.to_string())?;

    Ok(columns)
}

#[tauri::command]
pub async fn schema_refresh(
    connection_id: String,
    scope: Option<RefreshScope>,
) -> Result<(), String> {
    let client = Client::new();
    
    // Convert enum to the flat request structure expected by backend API
    let (scope_str, schema_name, table_name) = match scope {
        Some(RefreshScope::All) | None => ("all".to_string(), None, None),
        Some(RefreshScope::Schema(s)) => ("schema".to_string(), Some(s), None),
        Some(RefreshScope::Table { schema_name, table_name }) => (
            "table".to_string(),
            Some(schema_name),
            Some(table_name),
        ),
    };

    let body = RefreshSchemaRequest {
        scope: scope_str,
        schema_name,
        table_name,
    };

    let response = client
        .post(format!("{}/connections/{}/schema/refresh", BASE_URL, connection_id))
        .json(&body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("Request failed: {}", response.status()));
    }

    Ok(())
}
