use crate::app_state::AppState;
use crate::services::mock_data::generator::GenerationConfig;
use crate::services::mock_data::service::MockDataService;
use axum::{
    extract::{Json, State},
    response::IntoResponse,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct MockDataRequest {
    pub connection_id: Uuid,
    pub config: GenerationConfig,
}

pub async fn preview_mock_data(
    State(state): State<AppState>,
    Json(payload): Json<MockDataRequest>,
) -> impl IntoResponse {
    let service = MockDataService::new(state.db.clone());

    match service
        .preview_data(payload.connection_id, payload.config)
        .await
    {
        Ok(data) => Json(serde_json::json!({ "success": true, "data": data })),
        Err(e) => Json(serde_json::json!({ "success": false, "error": e.to_string() })),
    }
}

pub async fn generate_mock_data_sql(
    State(state): State<AppState>,
    Json(payload): Json<MockDataRequest>,
) -> impl IntoResponse {
    let service = MockDataService::new(state.db.clone());

    match service
        .generate_sql_insert(payload.connection_id, payload.config)
        .await
    {
        Ok(sql) => Json(serde_json::json!({ "success": true, "sql": sql })),
        Err(e) => Json(serde_json::json!({ "success": false, "error": e.to_string() })),
    }
}
