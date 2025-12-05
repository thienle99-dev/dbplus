use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;
use crate::models::entities::{dashboard, dashboard_chart};

pub struct DashboardService {
    db: DatabaseConnection,
}

impl DashboardService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    // Dashboard CRUD
    pub async fn create_dashboard(
        &self,
        connection_id: Uuid,
        name: String,
        description: Option<String>,
    ) -> Result<dashboard::Model, DbErr> {
        let dashboard = dashboard::ActiveModel {
            id: Set(Uuid::new_v4()),
            connection_id: Set(connection_id),
            name: Set(name),
            description: Set(description),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        dashboard.insert(&self.db).await
    }

    pub async fn get_dashboards(&self, connection_id: Uuid) -> Result<Vec<dashboard::Model>, DbErr> {
        dashboard::Entity::find()
            .filter(dashboard::Column::ConnectionId.eq(connection_id))
            .order_by_desc(dashboard::Column::UpdatedAt)
            .all(&self.db)
            .await
    }

    pub async fn get_dashboard(&self, id: Uuid) -> Result<Option<dashboard::Model>, DbErr> {
        dashboard::Entity::find_by_id(id).one(&self.db).await
    }

    pub async fn delete_dashboard(&self, id: Uuid) -> Result<(), DbErr> {
        let result = dashboard::Entity::delete_by_id(id).exec(&self.db).await?;
        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Dashboard not found".to_owned()));
        }
        Ok(())
    }

    // Chart CRUD
    pub async fn add_chart(
        &self,
        dashboard_id: Uuid,
        saved_query_id: Uuid,
        name: String,
        chart_type: String,
        config: serde_json::Value,
        layout: serde_json::Value,
    ) -> Result<dashboard_chart::Model, DbErr> {
        let chart = dashboard_chart::ActiveModel {
            id: Set(Uuid::new_v4()),
            dashboard_id: Set(dashboard_id),
            saved_query_id: Set(saved_query_id),
            name: Set(name),
            r#type: Set(chart_type),
            config: Set(config),
            layout: Set(layout),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        chart.insert(&self.db).await
    }

    pub async fn get_dashboard_charts(&self, dashboard_id: Uuid) -> Result<Vec<dashboard_chart::Model>, DbErr> {
        dashboard_chart::Entity::find()
            .filter(dashboard_chart::Column::DashboardId.eq(dashboard_id))
            .all(&self.db)
            .await
    }

    pub async fn delete_chart(&self, id: Uuid) -> Result<(), DbErr> {
        let result = dashboard_chart::Entity::delete_by_id(id).exec(&self.db).await?;
        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Chart not found".to_owned()));
        }
        Ok(())
    }
}
