use crate::models::entities::{saved_query, saved_query_folder};
use chrono::Utc;
use sea_orm::*;
use sea_orm::prelude::Expr;
use uuid::Uuid;

pub struct SavedQueryFolderService {
    db: DatabaseConnection,
}

impl SavedQueryFolderService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn list_folders(&self, connection_id: Uuid) -> Result<Vec<saved_query_folder::Model>, DbErr> {
        saved_query_folder::Entity::find()
            .filter(saved_query_folder::Column::ConnectionId.eq(connection_id))
            .order_by_asc(saved_query_folder::Column::Name)
            .all(&self.db)
            .await
    }

    pub async fn create_folder(&self, connection_id: Uuid, name: String) -> Result<saved_query_folder::Model, DbErr> {
        let folder = saved_query_folder::ActiveModel {
            id: Set(Uuid::new_v4()),
            connection_id: Set(connection_id),
            name: Set(name),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };
        folder.insert(&self.db).await
    }

    pub async fn update_folder(&self, folder_id: Uuid, name: String) -> Result<saved_query_folder::Model, DbErr> {
        let mut folder: saved_query_folder::ActiveModel = saved_query_folder::Entity::find_by_id(folder_id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::RecordNotFound("Folder not found".to_owned()))?
            .into();

        folder.name = Set(name);
        folder.updated_at = Set(Utc::now().into());
        folder.update(&self.db).await
    }

    pub async fn delete_folder(&self, folder_id: Uuid) -> Result<(), DbErr> {
        // Ensure saved queries under this folder become unfiled.
        saved_query::Entity::update_many()
            .col_expr(saved_query::Column::FolderId, Expr::value(Option::<Uuid>::None))
            .filter(saved_query::Column::FolderId.eq(folder_id))
            .exec(&self.db)
            .await?;

        let result = saved_query_folder::Entity::delete_by_id(folder_id)
            .exec(&self.db)
            .await?;

        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Folder not found".to_owned()));
        }
        Ok(())
    }
}
