use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(QuerySnippets::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(QuerySnippets::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(QuerySnippets::Name).string().not_null())
                    .col(ColumnDef::new(QuerySnippets::Description).string())
                    .col(ColumnDef::new(QuerySnippets::Sql).text().not_null())
                    .col(ColumnDef::new(QuerySnippets::Tags).json())
                    .col(
                        ColumnDef::new(QuerySnippets::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(QuerySnippets::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(QuerySnippets::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum QuerySnippets {
    Table,
    Id,
    Name,
    Description,
    Sql,
    Tags,
    CreatedAt,
    UpdatedAt,
}
