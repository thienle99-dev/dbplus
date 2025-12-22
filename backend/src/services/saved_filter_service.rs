use crate::models::entities::saved_filter;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

pub struct SavedFilterService {
    db: DatabaseConnection,
}

impl SavedFilterService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_saved_filter(
        &self,
        connection_id: Uuid,
        schema: String,
        table_ref: String,
        name: String,
        filter: String,
    ) -> Result<saved_filter::Model, DbErr> {
        let saved_filter = saved_filter::ActiveModel {
            id: Set(Uuid::new_v4()),
            connection_id: Set(connection_id),
            schema: Set(schema),
            table_ref: Set(table_ref),
            name: Set(name),
            filter: Set(filter),
            created_at: Set(Utc::now().into()),
        };

        saved_filter.insert(&self.db).await
    }

    pub async fn get_saved_filters(
        &self,
        connection_id: Uuid,
        schema: &str,
        table_ref: &str,
    ) -> Result<Vec<saved_filter::Model>, DbErr> {
        saved_filter::Entity::find()
            .filter(
                saved_filter::Column::ConnectionId
                    .eq(connection_id)
                    .and(saved_filter::Column::Schema.eq(schema))
                    .and(saved_filter::Column::TableRef.eq(table_ref)),
            )
            .order_by_desc(saved_filter::Column::CreatedAt)
            .all(&self.db)
            .await
    }

    pub async fn delete_saved_filter(&self, id: Uuid) -> Result<(), DbErr> {
        let result = saved_filter::Entity::delete_by_id(id)
            .exec(&self.db)
            .await?;
        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Saved filter not found".to_owned()));
        }
        Ok(())
    }
}
