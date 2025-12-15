use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SqliteAttachedDbs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SqliteAttachedDbs::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(SqliteAttachedDbs::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(SqliteAttachedDbs::Name).string().not_null())
                    .col(ColumnDef::new(SqliteAttachedDbs::FilePath).string().not_null())
                    .col(
                        ColumnDef::new(SqliteAttachedDbs::ReadOnly)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(SqliteAttachedDbs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(SqliteAttachedDbs::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-sqlite_attached_dbs-connection_id")
                            .from(SqliteAttachedDbs::Table, SqliteAttachedDbs::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx-sqlite_attached_dbs-connection_id-name")
                            .table(SqliteAttachedDbs::Table)
                            .col(SqliteAttachedDbs::ConnectionId)
                            .col(SqliteAttachedDbs::Name)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SqliteAttachedDbs::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SqliteAttachedDbs {
    Table,
    Id,
    ConnectionId,
    Name,
    FilePath,
    ReadOnly,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Connections {
    Table,
    Id,
}

