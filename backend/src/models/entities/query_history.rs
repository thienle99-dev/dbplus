use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "query_history")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub connection_id: Uuid,
    pub sql: String,
    pub row_count: Option<i32>,
    pub execution_time: Option<i32>, // milliseconds
    pub success: bool,
    pub error_message: Option<String>,
    pub executed_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::connection::Entity",
        from = "Column::ConnectionId",
        to = "super::connection::Column::Id",
        on_delete = "Cascade"
    )]
    Connection,
}

impl Related<super::connection::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Connection.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
