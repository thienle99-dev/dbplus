use crate::models::entities::query_snippet;
use chrono::Utc;
use sea_orm::*;
use uuid::Uuid;

pub struct SnippetService {
    db: DatabaseConnection,
}

type DefaultSnippet = (String, Option<String>, String, Option<Vec<String>>);

fn default_snippets() -> Vec<DefaultSnippet> {
    vec![
        (
            "Select from table (limit)".to_string(),
            Some("Basic SELECT template with schema/table/limit variables".to_string()),
            "SELECT *\nFROM {{schema}}.{{table}}\nLIMIT {{limit}};".to_string(),
            Some(vec!["common".to_string(), "select".to_string(), "template".to_string()]),
        ),
        (
            "Count rows".to_string(),
            Some("Count rows in a table".to_string()),
            "SELECT COUNT(*) AS count\nFROM {{schema}}.{{table}};".to_string(),
            Some(vec!["common".to_string(), "select".to_string()]),
        ),
        (
            "Find by id".to_string(),
            Some("Lookup one row by an id column".to_string()),
            "SELECT *\nFROM {{schema}}.{{table}}\nWHERE {{id_column}} = {{id}}\nLIMIT 1;".to_string(),
            Some(vec!["common".to_string(), "where".to_string(), "template".to_string()]),
        ),
        (
            "Filter by date range".to_string(),
            Some("Filter by a date/timestamp column".to_string()),
            "SELECT *\nFROM {{schema}}.{{table}}\nWHERE {{date_column}} BETWEEN '{{start_date}}' AND '{{end_date}}'\nORDER BY {{date_column}} DESC\nLIMIT {{limit}};".to_string(),
            Some(vec!["common".to_string(), "where".to_string(), "template".to_string()]),
        ),
        (
            "Top N by group".to_string(),
            Some("Group and rank by count".to_string()),
            "SELECT {{group_by}} AS key, COUNT(*) AS cnt\nFROM {{schema}}.{{table}}\nGROUP BY {{group_by}}\nORDER BY cnt DESC\nLIMIT {{limit}};".to_string(),
            Some(vec!["common".to_string(), "group-by".to_string(), "template".to_string()]),
        ),
        (
            "Join two tables".to_string(),
            Some("JOIN template with aliases".to_string()),
            "SELECT a.*, b.*\nFROM {{schema}}.{{table_a}} a\nJOIN {{schema}}.{{table_b}} b ON a.{{a_key}} = b.{{b_key}}\nLIMIT {{limit}};".to_string(),
            Some(vec!["common".to_string(), "join".to_string(), "template".to_string()]),
        ),
        (
            "EXPLAIN (Postgres)".to_string(),
            Some("Explain plan in Postgres (no ANALYZE)".to_string()),
            "EXPLAIN (FORMAT JSON)\n{{query}}".to_string(),
            Some(vec!["postgres".to_string(), "explain".to_string()]),
        ),
        (
            "EXPLAIN ANALYZE + BUFFERS (Postgres)".to_string(),
            Some("Performance analysis with timing and buffers".to_string()),
            "EXPLAIN (ANALYZE, BUFFERS)\n{{query}}".to_string(),
            Some(vec!["postgres".to_string(), "explain".to_string(), "performance".to_string()]),
        ),
        (
            "Create index (Postgres)".to_string(),
            Some("Create an index to speed up lookups (dangerous: modifies schema)".to_string()),
            "CREATE INDEX {{index_name}}\nON {{schema}}.{{table}} ({{column}});".to_string(),
            Some(vec!["postgres".to_string(), "index".to_string(), "dangerous".to_string()]),
        ),
        (
            "Update by id".to_string(),
            Some("Update rows by id (dangerous: modifies data)".to_string()),
            "UPDATE {{schema}}.{{table}}\nSET {{column}} = {{value}}\nWHERE {{id_column}} = {{id}};".to_string(),
            Some(vec!["common".to_string(), "update".to_string(), "dangerous".to_string()]),
        ),
    ]
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
            variables: Set(None),
            created_at: Set(Utc::now().into()),
            updated_at: Set(Utc::now().into()),
        };

        snippet.insert(&self.db).await
    }

    async fn ensure_default_snippets(&self) -> Result<(), DbErr> {
        let existing = query_snippet::Entity::find().count(&self.db).await?;
        if existing > 0 {
            return Ok(());
        }

        let now = Utc::now().into();
        let models: Vec<query_snippet::ActiveModel> = default_snippets()
            .into_iter()
            .map(
                |(name, description, sql, tags)| query_snippet::ActiveModel {
                    id: Set(Uuid::new_v4()),
                    name: Set(name),
                    description: Set(description),
                    sql: Set(sql),
                    tags: Set(tags.map(|t| serde_json::to_value(t).unwrap())),
                    variables: Set(None),
                    created_at: Set(now),
                    updated_at: Set(now),
                },
            )
            .collect();

        query_snippet::Entity::insert_many(models)
            .exec(&self.db)
            .await?;
        Ok(())
    }

    pub async fn get_snippets(&self) -> Result<Vec<query_snippet::Model>, DbErr> {
        // Seed a small set of common snippets when the table is empty.
        // This gives users a good starting point without requiring a separate "seed" action.
        let _ = self.ensure_default_snippets().await;
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
