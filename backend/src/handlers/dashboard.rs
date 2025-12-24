use crate::app_state::AppState;
use crate::services::dashboard_service::DashboardService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
pub struct CreateDashboardParams {
    name: String,
    description: Option<String>,
}

#[derive(Deserialize)]
pub struct AddChartParams {
    saved_query_id: Uuid,
    name: String,
    chart_type: String,
    config: serde_json::Value,
    layout: serde_json::Value,
}

// Dashboard Endpoints

pub async fn list_dashboards(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service.get_dashboards(connection_id).await {
        Ok(dashboards) => (StatusCode::OK, Json(dashboards)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn create_dashboard(
    State(state): State<AppState>,
    Path(connection_id): Path<Uuid>,
    Json(payload): Json<CreateDashboardParams>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service
        .create_dashboard(connection_id, payload.name, payload.description)
        .await
    {
        Ok(dashboard) => (StatusCode::CREATED, Json(dashboard)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn get_dashboard(
    State(state): State<AppState>,
    Path((_connection_id, dashboard_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service.get_dashboard(dashboard_id).await {
        Ok(Some(dashboard)) => (StatusCode::OK, Json(dashboard)).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, "Dashboard not found").into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_dashboard(
    State(state): State<AppState>,
    Path((_connection_id, dashboard_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service.delete_dashboard(dashboard_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

// Chart Endpoints

pub async fn list_charts(
    State(state): State<AppState>,
    Path((_connection_id, dashboard_id)): Path<(Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service.get_dashboard_charts(dashboard_id).await {
        Ok(charts) => (StatusCode::OK, Json(charts)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn add_chart(
    State(state): State<AppState>,
    Path((_connection_id, dashboard_id)): Path<(Uuid, Uuid)>,
    Json(payload): Json<AddChartParams>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service
        .add_chart(
            dashboard_id,
            payload.saved_query_id,
            payload.name,
            payload.chart_type,
            payload.config,
            payload.layout,
        )
        .await
    {
        Ok(chart) => (StatusCode::CREATED, Json(chart)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}

pub async fn delete_chart(
    State(state): State<AppState>,
    Path((_connection_id, _dashboard_id, chart_id)): Path<(Uuid, Uuid, Uuid)>,
) -> impl IntoResponse {
    let service = DashboardService::new(state.db.clone());
    match service.delete_chart(chart_id).await {
        Ok(_) => StatusCode::NO_CONTENT.into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()).into_response(),
    }
}
