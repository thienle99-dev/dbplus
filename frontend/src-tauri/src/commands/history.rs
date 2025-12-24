use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;
use sea_orm::QuerySelect;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryEntry {
    pub id: String,
    pub connection_id: String,
    pub sql: String,
    pub executed_at: String,
    pub execution_time: Option<i32>,
    pub success: bool,
    pub error_message: Option<String>,
    pub row_count: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddHistoryRequest {
    pub sql: String,
    pub execution_time: Option<i32>,
    pub success: bool,
    pub error_message: Option<String>,
    pub row_count: Option<i32>,
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
        id: h.id.to_string(),
        connection_id: h.connection_id.to_string(),
        sql: h.sql,
        executed_at: h.executed_at.to_string(),
        execution_time: h.execution_time,
        success: h.success,
        error_message: h.error_message,
        row_count: h.row_count,
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
        sql: Set(request.sql),
        row_count: Set(request.row_count),
        execution_time: Set(request.execution_time),
        success: Set(request.success),
        error_message: Set(request.error_message),
        executed_at: Set(Utc::now().into()),
    };

    let result = new_entry.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(HistoryEntry {
        id: result.id.to_string(),
        connection_id: result.connection_id.to_string(),
        sql: result.sql,
        executed_at: result.executed_at.to_string(),
        execution_time: result.execution_time,
        success: result.success,
        error_message: result.error_message,
        row_count: result.row_count,
    })
}

#[tauri::command]
pub async fn delete_history_entry(
    state: State<'_, AppState>,
    connection_id: String,
    entry_id: String,
) -> Result<(), String> {
    use dbplus_backend::models::entities::query_history;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let entry_uuid = Uuid::parse_str(&entry_id).map_err(|e| e.to_string())?;
    let entry = query_history::Entity::find_by_id(entry_uuid)
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
    pub entry_ids: Vec<String>,
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
    
    let entry_uuids: Result<Vec<Uuid>, _> = request.entry_ids.iter()
        .map(|id| Uuid::parse_str(id))
        .collect();
    let entry_uuids = entry_uuids.map_err(|e| e.to_string())?;
    
    query_history::Entity::delete_many()
        .filter(query_history::Column::ConnectionId.eq(uuid))
        .filter(query_history::Column::Id.is_in(entry_uuids))
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
