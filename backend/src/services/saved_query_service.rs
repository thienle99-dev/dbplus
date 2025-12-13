use crate::models::entities::saved_query;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

pub struct SavedQueryService {
    db: DatabaseConnection,
}

impl SavedQueryService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_saved_query(
        &self,
        connection_id: Uuid,
        name: String,
        description: Option<String>,
        sql: String,
        folder_id: Option<Uuid>,
        tags: Option<Vec<String>>,
        metadata: Option<serde_json::Value>,
    ) -> Result<saved_query::Model, DbErr> {
        let saved_query = saved_query::ActiveModel {
            id: Set(Uuid::new_v4()),
            connection_id: Set(connection_id),
            name: Set(name),
            description: Set(description),
            sql: Set(sql),
            folder_id: Set(folder_id),
            tags: Set(tags.map(|t| serde_json::to_value(t).unwrap())),
            metadata: Set(metadata),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        saved_query.insert(&self.db).await
    }

    pub async fn get_saved_queries(
        &self,
        connection_id: Uuid,
    ) -> Result<Vec<saved_query::Model>, DbErr> {
        saved_query::Entity::find()
            .filter(saved_query::Column::ConnectionId.eq(connection_id))
            .order_by_desc(saved_query::Column::UpdatedAt)
            .all(&self.db)
            .await
    }

    pub async fn update_saved_query(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        sql: Option<String>,
        folder_id: Option<Option<Uuid>>,
        tags: Option<Vec<String>>,
        metadata: Option<serde_json::Value>,
    ) -> Result<saved_query::Model, DbErr> {
        let mut saved_query: saved_query::ActiveModel = saved_query::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::RecordNotFound("Saved query not found".to_owned()))?
            .into();

        if let Some(name) = name {
            saved_query.name = Set(name);
        }
        if let Some(description) = description {
            saved_query.description = Set(Some(description));
        }
        if let Some(sql) = sql {
            saved_query.sql = Set(sql);
        }
        if let Some(folder_id) = folder_id {
            saved_query.folder_id = Set(folder_id);
        }
        if let Some(tags) = tags {
            saved_query.tags = Set(Some(serde_json::to_value(tags).unwrap()));
        }
        if let Some(metadata) = metadata {
            saved_query.metadata = Set(Some(metadata));
        }

        saved_query.updated_at = Set(Utc::now().into());

        saved_query.update(&self.db).await
    }

    pub async fn delete_saved_query(&self, id: Uuid) -> Result<(), DbErr> {
        let result = saved_query::Entity::delete_by_id(id).exec(&self.db).await?;
        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Saved query not found".to_owned()));
        }
        Ok(())
    }
}
