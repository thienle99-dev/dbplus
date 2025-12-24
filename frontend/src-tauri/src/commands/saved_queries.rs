use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedQuery {
    pub id: i32,
    pub connection_id: String,
    pub name: String,
    pub query: String,
    pub description: Option<String>,
    pub folder_id: Option<i32>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSavedQueryRequest {
    pub name: String,
    pub query: String,
    pub description: Option<String>,
    pub folder_id: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSavedQueryRequest {
    pub name: String,
    pub query: String,
    pub description: Option<String>,
    pub folder_id: Option<i32>,
}

#[tauri::command]
pub async fn list_saved_queries(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<SavedQuery>, String> {
    use dbplus_backend::models::entities::saved_query;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let queries = saved_query::Entity::find()
        .filter(saved_query::Column::ConnectionId.eq(uuid))
        .order_by_asc(saved_query::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(queries.into_iter().map(|q| SavedQuery {
        id: q.id,
        connection_id: q.connection_id.to_string(),
        name: q.name,
        query: q.query,
        description: q.description,
        folder_id: q.folder_id,
        created_at: q.created_at.to_string(),
        updated_at: q.updated_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn create_saved_query(
    state: State<'_, AppState>,
    connection_id: String,
    request: CreateSavedQueryRequest,
) -> Result<SavedQuery, String> {
    use dbplus_backend::models::entities::saved_query;
    use sea_orm::{ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let new_query = saved_query::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        connection_id: Set(uuid),
        name: Set(request.name),
        query: Set(request.query),
        description: Set(request.description),
        folder_id: Set(request.folder_id),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
    };

    let result = new_query.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SavedQuery {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        name: result.name,
        query: result.query,
        description: result.description,
        folder_id: result.folder_id,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn update_saved_query(
    state: State<'_, AppState>,
    connection_id: String,
    query_id: i32,
    request: UpdateSavedQueryRequest,
) -> Result<SavedQuery, String> {
    use dbplus_backend::models::entities::saved_query;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let query = saved_query::Entity::find_by_id(query_id)
        .filter(saved_query::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Saved query not found".to_string())?;

    let mut active: saved_query::ActiveModel = query.into();
    active.name = Set(request.name);
    active.query = Set(request.query);
    active.description = Set(request.description);
    active.folder_id = Set(request.folder_id);
    active.updated_at = Set(Utc::now().into());

    let result = active.update(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SavedQuery {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        name: result.name,
        query: result.query,
        description: result.description,
        folder_id: result.folder_id,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_saved_query(
    state: State<'_, AppState>,
    connection_id: String,
    query_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::saved_query;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let query = saved_query::Entity::find_by_id(query_id)
        .filter(saved_query::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(query) = query {
        query.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Saved Query Folders

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedQueryFolder {
    pub id: i32,
    pub connection_id: String,
    pub name: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFolderRequest {
    pub name: String,
}

#[tauri::command]
pub async fn list_folders(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<SavedQueryFolder>, String> {
    use dbplus_backend::models::entities::saved_query_folder;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let folders = saved_query_folder::Entity::find()
        .filter(saved_query_folder::Column::ConnectionId.eq(uuid))
        .order_by_asc(saved_query_folder::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(folders.into_iter().map(|f| SavedQueryFolder {
        id: f.id,
        connection_id: f.connection_id.to_string(),
        name: f.name,
        created_at: f.created_at.to_string(),
        updated_at: f.updated_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn create_folder(
    state: State<'_, AppState>,
    connection_id: String,
    request: CreateFolderRequest,
) -> Result<SavedQueryFolder, String> {
    use dbplus_backend::models::entities::saved_query_folder;
    use sea_orm::{ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let new_folder = saved_query_folder::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        connection_id: Set(uuid),
        name: Set(request.name),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
    };

    let result = new_folder.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SavedQueryFolder {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        name: result.name,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn update_folder(
    state: State<'_, AppState>,
    connection_id: String,
    folder_id: i32,
    request: UpdateFolderRequest,
) -> Result<SavedQueryFolder, String> {
    use dbplus_backend::models::entities::saved_query_folder;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let folder = saved_query_folder::Entity::find_by_id(folder_id)
        .filter(saved_query_folder::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Folder not found".to_string())?;

    let mut active: saved_query_folder::ActiveModel = folder.into();
    active.name = Set(request.name);
    active.updated_at = Set(Utc::now().into());

    let result = active.update(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SavedQueryFolder {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        name: result.name,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_folder(
    state: State<'_, AppState>,
    connection_id: String,
    folder_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::saved_query_folder;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let folder = saved_query_folder::Entity::find_by_id(folder_id)
        .filter(saved_query_folder::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(folder) = folder {
        folder.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

// Saved Filters

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SavedFilter {
    pub id: i32,
    pub connection_id: String,
    pub table_name: String,
    pub filter_name: String,
    pub filter_json: String,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSavedFilterRequest {
    pub table_name: String,
    pub filter_name: String,
    pub filter_json: String,
}

#[tauri::command]
pub async fn list_saved_filters(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<SavedFilter>, String> {
    use dbplus_backend::models::entities::saved_filter;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let filters = saved_filter::Entity::find()
        .filter(saved_filter::Column::ConnectionId.eq(uuid))
        .order_by_asc(saved_filter::Column::FilterName)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(filters.into_iter().map(|f| SavedFilter {
        id: f.id,
        connection_id: f.connection_id.to_string(),
        table_name: f.table_name,
        filter_name: f.filter_name,
        filter_json: f.filter_json,
        created_at: f.created_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn create_saved_filter(
    state: State<'_, AppState>,
    connection_id: String,
    request: CreateSavedFilterRequest,
) -> Result<SavedFilter, String> {
    use dbplus_backend::models::entities::saved_filter;
    use sea_orm::{ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let new_filter = saved_filter::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        connection_id: Set(uuid),
        table_name: Set(request.table_name),
        filter_name: Set(request.filter_name),
        filter_json: Set(request.filter_json),
        created_at: Set(Utc::now().into()),
    };

    let result = new_filter.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(SavedFilter {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        table_name: result.table_name,
        filter_name: result.filter_name,
        filter_json: result.filter_json,
        created_at: result.created_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_saved_filter(
    state: State<'_, AppState>,
    connection_id: String,
    filter_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::saved_filter;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let filter = saved_filter::Entity::find_by_id(filter_id)
        .filter(saved_filter::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(filter) = filter {
        filter.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}
