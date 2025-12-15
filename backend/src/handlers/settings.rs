use axum::{
    extract::{Path, State},
    http::StatusCode,
    Json,
};
use sea_orm::{ActiveModelTrait, ColumnTrait, DatabaseConnection, EntityTrait, QueryFilter, Set};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;

use crate::models::entities::user_settings;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingResponse {
    pub key: String,
    pub value: JsonValue,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub value: JsonValue,
}

/// Get a specific setting by key
pub async fn get_setting(
    State(db): State<DatabaseConnection>,
    Path(key): Path<String>,
) -> Result<Json<SettingResponse>, StatusCode> {
    let setting = user_settings::Entity::find()
        .filter(user_settings::Column::Key.eq(&key))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    match setting {
        Some(s) => Ok(Json(SettingResponse {
            key: s.key,
            value: s.value,
        })),
        None => Err(StatusCode::NOT_FOUND),
    }
}

/// Get all settings
pub async fn get_all_settings(
    State(db): State<DatabaseConnection>,
) -> Result<Json<Vec<SettingResponse>>, StatusCode> {
    let settings = user_settings::Entity::find()
        .all(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = settings
        .into_iter()
        .map(|s| SettingResponse {
            key: s.key,
            value: s.value,
        })
        .collect();

    Ok(Json(response))
}

/// Update or create a setting
pub async fn update_setting(
    State(db): State<DatabaseConnection>,
    Path(key): Path<String>,
    Json(payload): Json<UpdateSettingRequest>,
) -> Result<Json<SettingResponse>, StatusCode> {
    // Try to find existing setting
    let existing = user_settings::Entity::find()
        .filter(user_settings::Column::Key.eq(&key))
        .one(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let setting = match existing {
        Some(s) => {
            // Update existing
            let mut active: user_settings::ActiveModel = s.into();
            active.value = Set(payload.value.clone());
            active.updated_at = Set(chrono::Utc::now().naive_utc());
            active
                .update(&db)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        }
        None => {
            // Create new
            let new_setting = user_settings::ActiveModel {
                key: Set(key.clone()),
                value: Set(payload.value.clone()),
                created_at: Set(chrono::Utc::now().naive_utc()),
                updated_at: Set(chrono::Utc::now().naive_utc()),
                ..Default::default()
            };
            new_setting
                .insert(&db)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        }
    };

    Ok(Json(SettingResponse {
        key: setting.key,
        value: setting.value,
    }))
}

/// Reset all settings to defaults
pub async fn reset_settings(
    State(db): State<DatabaseConnection>,
) -> Result<StatusCode, StatusCode> {
    user_settings::Entity::delete_many()
        .exec(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}

/// Delete a specific setting
pub async fn delete_setting(
    State(db): State<DatabaseConnection>,
    Path(key): Path<String>,
) -> Result<StatusCode, StatusCode> {
    user_settings::Entity::delete_many()
        .filter(user_settings::Column::Key.eq(&key))
        .exec(&db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(StatusCode::NO_CONTENT)
}
