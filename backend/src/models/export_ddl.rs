use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DdlScope {
    Database,
    Schema,
    Objects,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum DdlObjectType {
    Table,
    View,
    Function,
    Sequence,
    Type,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DdlObjectSpec {
    pub object_type: DdlObjectType,
    pub schema: String,
    pub name: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportDdlOptions {
    pub scope: DdlScope,
    pub schemas: Option<Vec<String>>,
    pub objects: Option<Vec<DdlObjectSpec>>,
    pub include_drop: bool,
    pub if_exists: bool,
    pub include_owner_privileges: bool,
    pub include_comments: bool,
    pub prefer_pg_dump: bool,
    pub export_method: Option<String>, // "bundled_pg_dump", "user_pg_dump", "driver"
    pub pg_dump_path: Option<String>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExportDdlResult {
    pub ddl: String,
    pub method: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PgDumpStatus {
    pub found: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DriverStatus {
    pub available: bool,
    pub supports_full_export: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PgDumpStatusResponse {
    pub bundled: PgDumpStatus,
    pub user: PgDumpStatus,
    pub driver: DriverStatus,
}
