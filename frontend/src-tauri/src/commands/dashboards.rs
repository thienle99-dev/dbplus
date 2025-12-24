use serde::{Deserialize, Serialize};
use tauri::State;
use dbplus_backend::AppState;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Dashboard {
    pub id: i32,
    pub connection_id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Chart {
    pub id: i32,
    pub dashboard_id: i32,
    pub title: String,
    pub chart_type: String,
    pub query: String,
    pub config_json: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDashboardRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AddChartRequest {
    pub title: String,
    pub chart_type: String,
    pub query: String,
    pub config_json: Option<String>,
}

#[tauri::command]
pub async fn list_dashboards(
    state: State<'_, AppState>,
    connection_id: String,
) -> Result<Vec<Dashboard>, String> {
    use dbplus_backend::models::entities::dashboard;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, QueryOrder};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let dashboards = dashboard::Entity::find()
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .order_by_desc(dashboard::Column::UpdatedAt)
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(dashboards.into_iter().map(|d| Dashboard {
        id: d.id,
        connection_id: d.connection_id.to_string(),
        name: d.name,
        description: d.description,
        created_at: d.created_at.to_string(),
        updated_at: d.updated_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn get_dashboard(
    state: State<'_, AppState>,
    connection_id: String,
    dashboard_id: i32,
) -> Result<Option<Dashboard>, String> {
    use dbplus_backend::models::entities::dashboard;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let dashboard = dashboard::Entity::find_by_id(dashboard_id)
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(dashboard.map(|d| Dashboard {
        id: d.id,
        connection_id: d.connection_id.to_string(),
        name: d.name,
        description: d.description,
        created_at: d.created_at.to_string(),
        updated_at: d.updated_at.to_string(),
    }))
}

#[tauri::command]
pub async fn create_dashboard(
    state: State<'_, AppState>,
    connection_id: String,
    request: CreateDashboardRequest,
) -> Result<Dashboard, String> {
    use dbplus_backend::models::entities::dashboard;
    use sea_orm::{ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let new_dashboard = dashboard::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        connection_id: Set(uuid),
        name: Set(request.name),
        description: Set(request.description),
        created_at: Set(Utc::now().into()),
        updated_at: Set(Utc::now().into()),
    };

    let result = new_dashboard.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Dashboard {
        id: result.id,
        connection_id: result.connection_id.to_string(),
        name: result.name,
        description: result.description,
        created_at: result.created_at.to_string(),
        updated_at: result.updated_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_dashboard(
    state: State<'_, AppState>,
    connection_id: String,
    dashboard_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::dashboard;
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    let dashboard = dashboard::Entity::find_by_id(dashboard_id)
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(dashboard) = dashboard {
        dashboard.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn list_charts(
    state: State<'_, AppState>,
    connection_id: String,
    dashboard_id: i32,
) -> Result<Vec<Chart>, String> {
    use dbplus_backend::models::entities::{dashboard, dashboard_chart};
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // Verify dashboard belongs to connection
    let _dashboard = dashboard::Entity::find_by_id(dashboard_id)
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Dashboard not found".to_string())?;
    
    let charts = dashboard_chart::Entity::find()
        .filter(dashboard_chart::Column::DashboardId.eq(dashboard_id))
        .all(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(charts.into_iter().map(|c| Chart {
        id: c.id,
        dashboard_id: c.dashboard_id,
        title: c.title,
        chart_type: c.chart_type,
        query: c.query,
        config_json: c.config_json,
        created_at: c.created_at.to_string(),
    }).collect())
}

#[tauri::command]
pub async fn add_chart(
    state: State<'_, AppState>,
    connection_id: String,
    dashboard_id: i32,
    request: AddChartRequest,
) -> Result<Chart, String> {
    use dbplus_backend::models::entities::{dashboard, dashboard_chart};
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use chrono::Utc;
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // Verify dashboard belongs to connection
    let _dashboard = dashboard::Entity::find_by_id(dashboard_id)
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Dashboard not found".to_string())?;
    
    let new_chart = dashboard_chart::ActiveModel {
        id: sea_orm::ActiveValue::NotSet,
        dashboard_id: Set(dashboard_id),
        title: Set(request.title),
        chart_type: Set(request.chart_type),
        query: Set(request.query),
        config_json: Set(request.config_json),
        created_at: Set(Utc::now().into()),
    };

    let result = new_chart.insert(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    Ok(Chart {
        id: result.id,
        dashboard_id: result.dashboard_id,
        title: result.title,
        chart_type: result.chart_type,
        query: result.query,
        config_json: result.config_json,
        created_at: result.created_at.to_string(),
    })
}

#[tauri::command]
pub async fn delete_chart(
    state: State<'_, AppState>,
    connection_id: String,
    dashboard_id: i32,
    chart_id: i32,
) -> Result<(), String> {
    use dbplus_backend::models::entities::{dashboard, dashboard_chart};
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ModelTrait};
    
    let uuid = Uuid::parse_str(&connection_id).map_err(|e| e.to_string())?;
    
    // Verify dashboard belongs to connection
    let _dashboard = dashboard::Entity::find_by_id(dashboard_id)
        .filter(dashboard::Column::ConnectionId.eq(uuid))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Dashboard not found".to_string())?;
    
    let chart = dashboard_chart::Entity::find_by_id(chart_id)
        .filter(dashboard_chart::Column::DashboardId.eq(dashboard_id))
        .one(&state.db)
        .await
        .map_err(|e| e.to_string())?;

    if let Some(chart) = chart {
        chart.delete(&state.db).await.map_err(|e| e.to_string())?;
    }

    Ok(())
}
