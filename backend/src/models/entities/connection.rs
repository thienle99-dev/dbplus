use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "connections")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    #[serde(rename = "type")]
    pub db_type: String,
    pub host: String,
    pub port: i32,
    pub database: String,
    pub username: String,
    pub password: String, // Encrypted
    pub ssl: bool,
    pub ssl_cert: Option<String>, // Encrypted
    pub ssl_mode: Option<String>,
    pub ssl_ca_file: Option<String>,
    pub ssl_key_file: Option<String>,
    pub ssl_cert_file: Option<String>,

    #[sea_orm(default_value = "false")]
    pub ssh_enabled: bool,
    pub ssh_host: Option<String>,
    pub ssh_port: Option<i32>,
    pub ssh_user: Option<String>,
    pub ssh_auth_type: Option<String>,
    pub ssh_password: Option<String>, // Encrypted
    pub ssh_key_file: Option<String>,
    pub ssh_key_passphrase: Option<String>, // Encrypted

    #[sea_orm(default_value = "false")]
    pub is_read_only: bool,
    pub last_used: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::saved_query::Entity")]
    SavedQueries,
    #[sea_orm(has_many = "super::query_history::Entity")]
    QueryHistory,
}

impl Related<super::saved_query::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::SavedQueries.def()
    }
}

impl Related<super::query_history::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::QueryHistory.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
