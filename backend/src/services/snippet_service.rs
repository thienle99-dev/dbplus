use crate::models::entities::query_snippet;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

pub struct SnippetService {
    db: DatabaseConnection,
}

impl SnippetService {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub async fn create_snippet(
        &self,
        name: String,
        description: Option<String>,
        sql: String,
        tags: Option<Vec<String>>,
    ) -> Result<query_snippet::Model, DbErr> {
        let snippet = query_snippet::ActiveModel {
            id: Set(Uuid::new_v4()),
            name: Set(name),
            description: Set(description),
            sql: Set(sql),
            tags: Set(tags.map(|t| serde_json::to_value(t).unwrap())),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        snippet.insert(&self.db).await
    }

    pub async fn get_snippets(&self) -> Result<Vec<query_snippet::Model>, DbErr> {
        query_snippet::Entity::find()
            .order_by_desc(query_snippet::Column::UpdatedAt)
            .all(&self.db)
            .await
    }

    pub async fn update_snippet(
        &self,
        id: Uuid,
        name: Option<String>,
        description: Option<String>,
        sql: Option<String>,
        tags: Option<Vec<String>>,
    ) -> Result<query_snippet::Model, DbErr> {
        let mut snippet: query_snippet::ActiveModel = query_snippet::Entity::find_by_id(id)
            .one(&self.db)
            .await?
            .ok_or(DbErr::RecordNotFound("Snippet not found".to_owned()))?
            .into();

        if let Some(name) = name {
            snippet.name = Set(name);
        }
        if let Some(description) = description {
            snippet.description = Set(Some(description));
        }
        if let Some(sql) = sql {
            snippet.sql = Set(sql);
        }
        if let Some(tags) = tags {
            snippet.tags = Set(Some(serde_json::to_value(tags).unwrap()));
        }

        snippet.updated_at = Set(Utc::now().into());

        snippet.update(&self.db).await
    }

    pub async fn delete_snippet(&self, id: Uuid) -> Result<(), DbErr> {
        let result = query_snippet::Entity::delete_by_id(id)
            .exec(&self.db)
            .await?;
        if result.rows_affected == 0 {
            return Err(DbErr::RecordNotFound("Snippet not found".to_owned()));
        }
        Ok(())
    }
}
