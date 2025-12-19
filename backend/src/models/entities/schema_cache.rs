use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "schema_cache")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: i32,
    pub connection_id: Uuid,
    pub database_name: String,
    pub schema_name: String,
    pub object_name: String,
    pub object_type: String, // "table", "view", "function", "column"
    pub parent_name: Option<String>,
    pub metadata: Option<Json>,
    pub last_updated: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}
