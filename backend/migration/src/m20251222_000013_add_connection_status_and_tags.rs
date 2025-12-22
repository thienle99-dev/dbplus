use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .add_column(ColumnDef::new(Connections::StatusColor).string())
                    .add_column(ColumnDef::new(Connections::Tags).string())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .drop_column(Connections::StatusColor)
                    .drop_column(Connections::Tags)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Connections {
    Table,
    StatusColor,
    Tags,
}
