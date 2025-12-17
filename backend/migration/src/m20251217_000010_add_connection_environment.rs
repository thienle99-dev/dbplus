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
                    .add_column(
                        ColumnDef::new(Connections::Environment)
                            .string()
                            .not_null()
                            .default("development"),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .add_column(
                        ColumnDef::new(Connections::SafeModeLevel)
                            .integer()
                            .not_null()
                            .default(1), // 0: None, 1: Warning, 2: Strict
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .drop_column(Connections::Environment)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .drop_column(Connections::SafeModeLevel)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Connections {
    Table,
    Environment,
    SafeModeLevel,
}
