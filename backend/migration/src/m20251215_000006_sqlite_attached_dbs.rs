use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(DbplusSqliteAttachedDbs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DbplusSqliteAttachedDbs::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(DbplusSqliteAttachedDbs::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(DbplusSqliteAttachedDbs::Name).string().not_null())
                    .col(ColumnDef::new(DbplusSqliteAttachedDbs::FilePath).string().not_null())
                    .col(
                        ColumnDef::new(DbplusSqliteAttachedDbs::ReadOnly)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .col(
                        ColumnDef::new(DbplusSqliteAttachedDbs::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DbplusSqliteAttachedDbs::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-sqlite_attached_dbs-connection_id")
                            .from(
                                DbplusSqliteAttachedDbs::Table,
                                DbplusSqliteAttachedDbs::ConnectionId,
                            )
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .index(
                        Index::create()
                            .name("idx-sqlite_attached_dbs-connection_id-name")
                            .table(DbplusSqliteAttachedDbs::Table)
                            .col(DbplusSqliteAttachedDbs::ConnectionId)
                            .col(DbplusSqliteAttachedDbs::Name)
                            .unique(),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(DbplusSqliteAttachedDbs::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum DbplusSqliteAttachedDbs {
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
