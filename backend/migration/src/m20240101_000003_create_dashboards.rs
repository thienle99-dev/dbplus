use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create dashboards table
        manager
            .create_table(
                Table::create()
                    .table(Dashboards::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(Dashboards::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(Dashboards::ConnectionId).uuid().not_null())
                    .col(ColumnDef::new(Dashboards::Name).string().not_null())
                    .col(ColumnDef::new(Dashboards::Description).string())
                    .col(
                        ColumnDef::new(Dashboards::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(Dashboards::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-dashboards-connection_id")
                            .from(Dashboards::Table, Dashboards::ConnectionId)
                            .to(Connections::Table, Connections::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        // Create dashboard_charts table
        manager
            .create_table(
                Table::create()
                    .table(DashboardCharts::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(DashboardCharts::Id)
                            .uuid()
                            .not_null()
                            .primary_key(),
                    )
                    .col(ColumnDef::new(DashboardCharts::DashboardId).uuid().not_null())
                    .col(ColumnDef::new(DashboardCharts::SavedQueryId).uuid().not_null())
                    .col(ColumnDef::new(DashboardCharts::Name).string().not_null())
                    .col(ColumnDef::new(DashboardCharts::Type).string().not_null())
                    .col(ColumnDef::new(DashboardCharts::Config).json().not_null())
                    .col(ColumnDef::new(DashboardCharts::Layout).json().not_null())
                    .col(
                        ColumnDef::new(DashboardCharts::CreatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(DashboardCharts::UpdatedAt)
                            .timestamp_with_time_zone()
                            .not_null(),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-dashboard_charts-dashboard_id")
                            .from(DashboardCharts::Table, DashboardCharts::DashboardId)
                            .to(Dashboards::Table, Dashboards::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-dashboard_charts-saved_query_id")
                            .from(DashboardCharts::Table, DashboardCharts::SavedQueryId)
                            .to(SavedQueries::Table, SavedQueries::Id)
                            .on_delete(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(DashboardCharts::Table).to_owned())
            .await?;
        manager
            .drop_table(Table::drop().table(Dashboards::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum Dashboards {
    Table,
    Id,
    ConnectionId,
    Name,
    Description,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum DashboardCharts {
    Table,
    Id,
    DashboardId,
    SavedQueryId,
    Name,
    Type,
    Config,
    Layout,
    CreatedAt,
    UpdatedAt,
}

#[derive(Iden)]
enum Connections {
    Table,
    Id,
}

#[derive(Iden)]
enum SavedQueries {
    Table,
    Id,
}
