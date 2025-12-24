use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub id: i32,
    pub connection_id: String,
    pub query: String,
    pub executed_at: String,
    pub execution_time_ms: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddHistoryRequest {
    pub query: String,
    pub execution_time_ms: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
}

#[tauri::command]
pub async fn get_history(
    state: State<'_, AppState>,
    connection_id: String,
    limit: Option<i64>,
) -> Result<Vec<HistoryEntry>, String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let mut query = query_history::Entity::find()
        .filter(query_history::Column::ConnectionId.eq(uuid))
        .order_by_desc(query_history::Column::ExecutedAt);
    
    if let Some(limit) = limit {
        query = query.limit(limit as u64);
    }
    
    let history = query.all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(history.into_iter().map(|h| HistoryEntry {
        id: h.id,
        connection_id: h.connection_id.to_string(),
        query: h.query,
        executed_at: h.executed_at.to_string(),
        execution_time_ms: h.execution_time_ms,
        status: h.status,
        error_message: h.error_message,
    }).collect())
}

#[tauri::command]
pub async fn add_history(
    state: State<'_, AppState>,
    connection_id: String,
    request: AddHistoryRequest,
) -> Result<HistoryEntry, String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let new_entry = query_history::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        connection_id: Set(uuid),
        query: Set(request.query),
        executed_at: Set(Utc::now().into()),
        execution_time_ms: Set(request.execution_time_ms),
        status: Set(request.status),
        error_message: Set(request.error_message),
    };

    let result = new_entry.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(HistoryEntry {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        query: result.query,
        executed_at: result.executed_at.to_string(),
        execution_time_ms: result.execution_time_ms,
        status: result.status,
        error_message: result.error_message,
    })
}

#[tauri::command]
pub async fn delete_history_entry(
    state: State<'_, AppState>,
    connection_id: String,
    entry_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let entry = query_history::Entity::find_by_id(entry_id)
        .filter(query_history::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(entry) = entry {
        entry.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn clear_history(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<(), String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    query_history::Entity::delete_many()
        .filter(query_history::Column::ConnectionId.eq(uuid))
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeleteHistoryEntriesRequest {
    pub entry_ids: Vec<i32>,
}

#[tauri::command]
pub async fn delete_history_entries(
    state: State<'_, AppState>,
    connection_id: String,
    request: DeleteHistoryEntriesRequest,
) -> Result<(), String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    query_history::Entity::delete_many()
        .filter(query_history::Column::ConnectionId.eq(uuid))
        .filter(query_history::Column::Id.is_in(request.entry_ids))
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
