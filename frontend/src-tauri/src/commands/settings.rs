use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Setting {
    pub key: String,
    pub value: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSettingRequest {
    pub value: String,
}

#[tauri::command]
pub async fn get_all_settings(
    state: State<'_, AppState>,
) -> Result<Vec<Setting>, String> {
    use dbplus_backend::models::entities::setting;
    use sea_orm::EntityTrait;
    
    let settings = setting::Entity::find()
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(settings.into_iter().map(|s| Setting {
        key: s.key,
        value: s.value,
        created_at: s.created_at.to_string(),
        updated_at: s.updated_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn get_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<Option<Setting>, String> {
    use dbplus_backend::models::entities::setting;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    
    let setting = setting::Entity::find()
        .filter(setting::Column::Key.eq(&key))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(setting.map(|s| Setting {
        key: s.key,
        value: s.value,
        created_at: s.created_at.to_string(),
        updated_at: s.updated_at.to_string(),
    }))
}

#[tauri::command]
pub async fn update_setting(
    state: State<'_, AppState>,
    key: String,
    request: UpdateSettingRequest,
) -> Result<Setting, String> {
    use dbplus_backend::models::entities::setting;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use chrono::Utc;
    
    // Try to find existing setting
    let existing = setting::Entity::find()
        .filter(setting::Column::Key.eq(&key))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    let result = if let Some(existing) = existing {
        // Update existing
        let mut active: setting::ActiveModel = existing.into();
        active.value = Set(request.value);
        active.updated_at = Set(Utc::now().into());
        active.update(&state.db).await.map_err(|e| e.to_string())?
    } else {
        // Create new
        let new_setting = setting::ActiveModel {
            key: Set(key),
            value: Set(request.value),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };
        new_setting.insert(&state.db).await.map_err(|e| e.to_string())?
    };

    Ok(Setting {
        key: result.key,
        value: result.value,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_setting(
    state: State<'_, AppState>,
    key: String,
) -> Result<(), String> {
    use dbplus_backend::models::entities::setting;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let setting = setting::Entity::find()
        .filter(setting::Column::Key.eq(&key))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(setting) = setting {
        setting.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn reset_settings(
    state: State<'_, AppState>,
) -> Result<(), String> {
    use dbplus_backend::models::entities::setting;
    use sea_orm::{EntityTrait, DeleteMany};
    
    setting::Entity::delete_many()
        .exec(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}
