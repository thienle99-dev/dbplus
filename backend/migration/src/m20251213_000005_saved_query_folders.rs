use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SavedQueryFolders::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SavedQueryFolders::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(SavedQueryFolders::ConnectionId)
                            .uuid()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SavedQueryFolders::Name).string().not_null())
                    .col(
                        ColumnDef::new(SavedQueryFolders::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SavedQueryFolders::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-saved_query_folders-connection_id")
                            .from(SavedQueryFolders::Table, SavedQueryFolders::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(SavedQueries::Table)
                    .add_column(ColumnDef::new(SavedQueries::FolderId).uuid())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(SavedQueries::Table)
                    .drop_column(SavedQueries::FolderId)
                    .to_owned(),
            )
            .await?;
        manager
            .drop_table(Table::drop().table(SavedQueryFolders::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SavedQueryFolders {
    Table,
    Id,
    ConnectionId,
    Name,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum SavedQueries {
    Table,
    FolderId,
}

#[derive(Iden)]
enum Connections {
    Table,
    Id,
}

