use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SavedFilters::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SavedFilters::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(SavedFilters::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(SavedFilters::Schema).string().not_null())
                    .col(ColumnDef::new(SavedFilters::TableRef).string().not_null())
                    .col(ColumnDef::new(SavedFilters::Name).string().not_null())
                    .col(ColumnDef::new(SavedFilters::Filter).string().not_null())
                    .col(
                        ColumnDef::new(SavedFilters::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-saved_filters-connection_id")
                            .from(SavedFilters::Table, SavedFilters::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SavedFilters::Table).to_owned())
            .await
    }
}

#[derive(DeriveIden)]
enum SavedFilters {
    Table,
    Id,
    ConnectionId,
    Schema,
    #[sea_orm(iden = "table")]
    TableRef,
    Name,
    Filter,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Connections {
    Table,
    Id,
}
