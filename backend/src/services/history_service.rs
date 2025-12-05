use sea_orm::*;
use uuid::Uuid;
use chrono::Utc;
use crate::models::entities::query_history;

pub struct HistoryService {
    db: DatabaseConnection,
}

impl HistoryService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn add_entry(
        &self,
        connection_id: Uuid,
        sql: String,
        row_count: Option<i32>,
        execution_time: Option<i32>,
        success: bool,
        error_message: Option<String>,
    ) -> Result<query_history::Model, DbErr> {
        let entry = query_history::ActiveModel {
            id: Set(Uuid::new_v4()),
            connection_id: Set(connection_id),
            sql: Set(sql),
            row_count: Set(row_count),
            execution_time: Set(execution_time),
            success: Set(success),
            error_message: Set(error_message),
            executed_at: Set(Utc::now().into()),
        };

        entry.insert(&self.db).await
    }

    pub async fn get_history(&self, connection_id: Uuid, limit: u64) -> Result<Vec<query_history::Model>, DbErr> {
        query_history::Entity::find()
            .filter(query_history::Column::ConnectionId.eq(connection_id))
            .order_by_desc(query_history::Column::ExecutedAt)
            .limit(limit)
            .all(&self.db)
            .await
    }

    pub async fn clear_history(&self, connection_id: Uuid) -> Result<(), DbErr> {
        query_history::Entity::delete_many()
            .filter(query_history::Column::ConnectionId.eq(connection_id))
            .exec(&self.db)
            .await?;
        Ok(())
    }
}
