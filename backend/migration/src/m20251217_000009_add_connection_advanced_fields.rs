use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let columns = [
            ColumnDef::new(Connections::SshEnabled)
                .boolean()
                .not_null()
                .default(false)
                .to_owned(),
            ColumnDef::new(Connections::SshHost).string().to_owned(),
            ColumnDef::new(Connections::SshPort).integer().to_owned(),
            ColumnDef::new(Connections::SshUser).string().to_owned(),
            ColumnDef::new(Connections::SshAuthType)
                .string()
                .default("password")
                .to_owned(),
            ColumnDef::new(Connections::SshPassword).string().to_owned(),
            ColumnDef::new(Connections::SshKeyFile).string().to_owned(),
            ColumnDef::new(Connections::SshKeyPassphrase)
                .string()
                .to_owned(),
            ColumnDef::new(Connections::IsReadOnly)
                .boolean()
                .not_null()
                .default(false)
                .to_owned(),
            ColumnDef::new(Connections::SslMode)
                .string()
                .default("disable")
                .to_owned(),
            ColumnDef::new(Connections::SslCaFile).string().to_owned(),
            ColumnDef::new(Connections::SslCertFile).string().to_owned(),
            ColumnDef::new(Connections::SslKeyFile).string().to_owned(),
        ];

        for mut col in columns {
            manager
                .alter_table(
                    Table::alter()
                        .table(Connections::Table)
                        .add_column(&mut col)
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let columns = [
            Connections::SshEnabled,
            Connections::SshHost,
            Connections::SshPort,
            Connections::SshUser,
            Connections::SshAuthType,
            Connections::SshPassword,
            Connections::SshKeyFile,
            Connections::SshKeyPassphrase,
            Connections::IsReadOnly,
            Connections::SslMode,
            Connections::SslCaFile,
            Connections::SslCertFile,
            Connections::SslKeyFile,
        ];

        for col in columns {
            manager
                .alter_table(
                    Table::alter()
                        .table(Connections::Table)
                        .drop_column(col)
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
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
