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
                        ColumnDef::new(Connections::SshEnabled)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .add_column(ColumnDef::new(Connections::SshHost).string())
                    .add_column(ColumnDef::new(Connections::SshPort).integer())
                    .add_column(ColumnDef::new(Connections::SshUser).string())
                    .add_column(
                        ColumnDef::new(Connections::SshAuthType)
                            .string()
                            .default("password"),
                    )
                    .add_column(ColumnDef::new(Connections::SshPassword).string())
                    .add_column(ColumnDef::new(Connections::SshKeyFile).string())
                    .add_column(ColumnDef::new(Connections::SshKeyPassphrase).string())
                    .add_column(
                        ColumnDef::new(Connections::IsReadOnly)
                            .boolean()
                            .not_null()
                            .default(false),
                    )
                    .add_column(
                        ColumnDef::new(Connections::SslMode)
                            .string()
                            .default("disable"),
                    )
                    .add_column(ColumnDef::new(Connections::SslCaFile).string())
                    .add_column(ColumnDef::new(Connections::SslCertFile).string())
                    .add_column(ColumnDef::new(Connections::SslKeyFile).string())
                    .to_owned(),
            )
            .await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Connections::Table)
                    .drop_column(Connections::SshEnabled)
                    .drop_column(Connections::SshHost)
                    .drop_column(Connections::SshPort)
                    .drop_column(Connections::SshUser)
                    .drop_column(Connections::SshAuthType)
                    .drop_column(Connections::SshPassword)
                    .drop_column(Connections::SshKeyFile)
                    .drop_column(Connections::SshKeyPassphrase)
                    .drop_column(Connections::IsReadOnly)
                    .drop_column(Connections::SslMode)
                    .drop_column(Connections::SslCaFile)
                    .drop_column(Connections::SslCertFile)
                    .drop_column(Connections::SslKeyFile)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum Connections {
    Table,
    SshEnabled,
    SshHost,
    SshPort,
    SshUser,
    SshAuthType,
    SshPassword,
    SshKeyFile,
    SshKeyPassphrase,
    IsReadOnly,
    SslMode,
    SslCaFile,
    SslCertFile,
    SslKeyFile,
}
