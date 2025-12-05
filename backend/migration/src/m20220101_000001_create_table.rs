use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create Connections Table
        manager
            .create_table(
                Table::create()
                    .table(Connections::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(Connections::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(Connections::Name).string().not_null())
                    .col(ColumnDef::new(Connections::DbType).string().not_null())
                    .col(ColumnDef::new(Connections::Host).string().not_null())
                    .col(ColumnDef::new(Connections::Port).integer().not_null())
                    .col(ColumnDef::new(Connections::Database).string().not_null())
                    .col(ColumnDef::new(Connections::Username).string().not_null())
                    .col(ColumnDef::new(Connections::Password).string().not_null())
                    .col(ColumnDef::new(Connections::Ssl).boolean().not_null().default(false))
                    .col(ColumnDef::new(Connections::SslCert).string())
                    .col(ColumnDef::new(Connections::LastUsed).timestamp_with_time_zone())
                    .col(ColumnDef::new(Connections::CreatedAt).timestamp_with_time_zone().not_null())
                    .col(ColumnDef::new(Connections::UpdatedAt).timestamp_with_time_zone().not_null())
                    .to_owned(),
            )
            .await?;

        // Create SavedQueries Table
        manager
            .create_table(
                Table::create()
                    .table(SavedQueries::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(SavedQueries::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(SavedQueries::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(SavedQueries::Name).string().not_null())
                    .col(ColumnDef::new(SavedQueries::Description).string())
                    .col(ColumnDef::new(SavedQueries::Sql).text().not_null())
                    .col(ColumnDef::new(SavedQueries::Tags).json())
                    .col(ColumnDef::new(SavedQueries::CreatedAt).timestamp_with_time_zone().not_null())
                    .col(ColumnDef::new(SavedQueries::UpdatedAt).timestamp_with_time_zone().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-saved_queries-connection_id")
                            .from(SavedQueries::Table, SavedQueries::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create QueryHistory Table
        manager
            .create_table(
                Table::create()
                    .table(QueryHistory::Table)
                    .if_not_exists()
                    .col(ColumnDef::new(QueryHistory::Id).uuid().not_null().primary_key())
                    .col(ColumnDef::new(QueryHistory::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(QueryHistory::Sql).text().not_null())
                    .col(ColumnDef::new(QueryHistory::RowCount).integer())
                    .col(ColumnDef::new(QueryHistory::ExecutionTime).integer())
                    .col(ColumnDef::new(QueryHistory::Success).boolean().not_null())
                    .col(ColumnDef::new(QueryHistory::ErrorMessage).text())
                    .col(ColumnDef::new(QueryHistory::ExecutedAt).timestamp_with_time_zone().not_null())
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-query_history-connection_id")
                            .from(QueryHistory::Table, QueryHistory::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(QueryHistory::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(SavedQueries::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Connections::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Connections {
    Table,
    Id,
    Name,
    DbType,
    Host,
    Port,
    Database,
    Username,
    Password,
    Ssl,
    SslCert,
    LastUsed,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum SavedQueries {
    Table,
    Id,
    ConnectionId,
    Name,
    Description,
    Sql,
    Tags,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum QueryHistory {
    Table,
    Id,
    ConnectionId,
    Sql,
    RowCount,
    ExecutionTime,
    Success,
    ErrorMessage,
    ExecutedAt,
}
