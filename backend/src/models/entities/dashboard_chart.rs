use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "dashboard_charts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub dashboard_id: Uuid,
    pub saved_query_id: Uuid,
    pub name: String,
    pub r#type: String, // 'type' is a reserved keyword
    #[sea_orm(column_type = "Json")]
    pub config: serde_json::Value,
    #[sea_orm(column_type = "Json")]
    pub layout: serde_json::Value,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::dashboard::Entity",
        from = "Column::DashboardId",
        to = "super::dashboard::Column::Id",
        on_delete = "Cascade"
    )]
    Dashboard,
    #[sea_orm(
        belongs_to = "super::saved_query::Entity",
        from = "Column::SavedQueryId",
        to = "super::saved_query::Column::Id",
        on_delete = "Cascade"
    )]
    SavedQuery,
}

impl Related<super::dashboard::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Dashboard.def()
    }
}

impl Related<super::saved_query::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SavedQuery.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
