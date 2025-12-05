use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SavedQueries::Table)
                    .add_column(ColumnDef::new(SavedQueries::Metadata).json())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SavedQueries::Table)
                    .drop_column(SavedQueries::Metadata)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum SavedQueries {
    Table,
    Metadata,
}
