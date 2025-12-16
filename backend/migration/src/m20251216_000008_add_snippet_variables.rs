use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(QuerySnippets::Table)
                    .add_column(ColumnDef::new(QuerySnippets::Variables).json())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(QuerySnippets::Table)
                    .drop_column(QuerySnippets::Variables)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum QuerySnippets {
    Table,
    Variables,
}
