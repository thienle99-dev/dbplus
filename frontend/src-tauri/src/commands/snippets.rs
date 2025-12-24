use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Snippet {
    pub id: String,
    pub name: String,
    pub content: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSnippetRequest {
    pub name: String,
    pub content: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSnippetRequest {
    pub name: String,
    pub content: String,
    pub description: Option<String>,
}

#[tauri::command]
pub async fn list_snippets(
    state: State<'_, AppState>,
) -> Result<Vec<Snippet>, String> {
    use dbplus_backend::models::entities::query_snippet as snippet;
    use sea_orm::{EntityTrait, QueryOrder};
    
    let snippets = snippet::Entity::find()
        .order_by_asc(snippet::Column::Name)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(snippets.into_iter().map(|s| Snippet {
        id: s.id.to_string(),
        name: s.name,
        content: s.sql,
        description: s.description,
        created_at: s.created_at.to_string(),
        updated_at: s.updated_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn create_snippet(
    state: State<'_, AppState>,
    request: CreateSnippetRequest,
) -> Result<Snippet, String> {
    use dbplus_backend::models::entities::query_snippet as snippet;
    use sea_orm::{ActiveModelTrait, Set, ActiveValue};
    use chrono::Utc;
    
    let new_snippet = snippet::ActiveModel {
        id: Set(Uuid::new_v4()),
        name: Set(request.name),
        sql: Set(request.content),
        description: Set(request.description),
        tags: Set(None),
        variables: Set(None),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
    };

    let result = new_snippet.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Snippet {
        id: result.id.to_string(),
        name: result.name,
        content: result.sql,
        description: result.description,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn update_snippet(
    state: State<'_, AppState>,
    id: String,
    request: UpdateSnippetRequest,
) -> Result<Snippet, String> {
    use dbplus_backend::models::entities::query_snippet as snippet;
    use sea_orm::{EntityTrait, ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;

    let snippet = snippet::Entity::find_by_id(uuid)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Snippet not found".to_string())?;

    let mut active: snippet::ActiveModel = snippet.into();
    active.name = Set(request.name);
    active.sql = Set(request.content);
    active.description = Set(request.description);
    active.updated_at = Set(Utc::now().into());

    let result = active.update(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Snippet {
        id: result.id.to_string(),
        name: result.name,
        content: result.sql,
        description: result.description,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_snippet(
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    use dbplus_backend::models::entities::query_snippet as snippet;
    use sea_orm::{EntityTrait, ModelTrait};
    
    let uuid = Uuid::parse_str(&id).map_err(|e| e.to_string())?;

    let snippet = snippet::Entity::find_by_id(uuid)
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(snippet) = snippet {
        snippet.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}
