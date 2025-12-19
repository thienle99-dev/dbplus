use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(SchemaCache::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(SchemaCache::Id)
                            .integer()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(SchemaCache::ConnectionId).uuid().not_null())
                    .col(
                        ColumnDef::new(SchemaCache::DatabaseName)
                            .string()
                            .not_null(),
                    )
                    .col(ColumnDef::new(SchemaCache::SchemaName).string().not_null())
                    .col(ColumnDef::new(SchemaCache::ObjectName).string().not_null())
                    .col(ColumnDef::new(SchemaCache::ObjectType).string().not_null()) // "table", "view", "function", "column"
                    .col(ColumnDef::new(SchemaCache::ParentName).string().null()) // e.g. table_name for columns
                    .col(ColumnDef::new(SchemaCache::Metadata).json().null())
                    .col(
                        ColumnDef::new(SchemaCache::LastUpdated)
                            .date_time()
                            .not_null()
                            .extra("DEFAULT CURRENT_TIMESTAMP"),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for fast lookup
        manager
            .create_index(
                Index::create()
                    .name("idx_schema_cache_lookup")
                    .table(SchemaCache::Table)
                    .col(SchemaCache::ConnectionId)
                    .col(SchemaCache::DatabaseName)
                    .col(SchemaCache::SchemaName)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(SchemaCache::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum SchemaCache {
    Table,
    Id,
    ConnectionId,
    DatabaseName,
    SchemaName,
    ObjectName,
    ObjectType,
    ParentName,
    Metadata,
    LastUpdated,
}
