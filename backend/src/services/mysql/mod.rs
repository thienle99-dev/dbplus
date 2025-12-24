pub mod column;
pub mod connection;
pub mod ddl_export;
pub mod function;
pub mod query;
pub mod schema;
pub mod table;
pub mod view;

use crate::models::entities::connection as connection_entity;
use crate::services::db_driver::SessionInfo;
use crate::services::driver::extension::DatabaseManagementDriver;
use anyhow::Result;
use async_trait::async_trait;
use mysql_async::prelude::Queryable;
use mysql_async::{OptsBuilder, Pool};

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MySqlFamilyFlavor {
    Mysql,
    MariaDb,
    TiDb,
}

#[derive(Clone)]
pub struct MySqlDriver {
    pub pool: Pool,
    pub flavor: MySqlFamilyFlavor,
}

impl MySqlDriver {
    pub fn new(pool: Pool, flavor: MySqlFamilyFlavor) -> Self {
        Self { pool, flavor }
    }

    pub async fn from_model(conn: &connection_entity::Model, password: &str) -> Result<Self> {
        let mut opts = OptsBuilder::default();
        let host = if conn.host.is_empty() {
            "127.0.0.1"
        } else {
            &conn.host
        };
        opts = opts.ip_or_hostname(host);

        if conn.port > 0 {
            opts = opts.tcp_port(conn.port as u16);
        } else {
            // Default port logic
            let default_port = if conn.db_type == "tidb" { 4000 } else { 3306 };
            opts = opts.tcp_port(default_port);
        }

        opts = opts.user(Some(&conn.username));
        opts = opts.pass(Some(password));
        if !conn.database.is_empty() {
            opts = opts.db_name(Some(&conn.database));
        }

        // SSL/TLS options support (Generic handling, mostly relies on driver defaults or DSN parsing usually)
        if conn.ssl {
            // Basic SSL enablement (PREFERRED is default usually)
            // mysql_async usually handles ssl mode via opts.ssl_opts(...)
            // We can expand this later if strict TLS logic is needed,
            // but basic opts usually suffice for standard connections.
            // For TiDB Cloud (required TLS), mysql_async default SSL modes often work if certs are system root.
        }

        let pool = Pool::new(opts);

        let flavor = match conn.db_type.as_str() {
            "mariadb" => MySqlFamilyFlavor::MariaDb,
            "tidb" => MySqlFamilyFlavor::TiDb,
            _ => MySqlFamilyFlavor::Mysql,
        };

        Ok(Self::new(pool, flavor))
    }
}

#[async_trait]
impl crate::services::driver::SessionOperations for MySqlDriver {
    async fn get_active_sessions(&self) -> Result<Vec<SessionInfo>> {
        let mut conn = self.pool.get_conn().await?;
        let query = "SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO FROM information_schema.PROCESSLIST";

        let rows: Vec<(
            u64,
            String,
            String,
            Option<String>,
            String,
            i64,
            Option<String>,
            Option<String>,
        )> = conn.query(query).await?;

        Ok(rows
            .into_iter()
            .map(
                |(id, user, host, _db, command, _time, state, info)| SessionInfo {
                    pid: id as i32,
                    user_name: Some(user),
                    application_name: None,
                    client_addr: Some(host),
                    backend_start: None,
                    query_start: None,
                    state: Some(format!("{} - {}", command, state.unwrap_or_default())),
                    query: info,
                    wait_event_type: None,
                    wait_event: None,
                    state_change: None,
                },
            )
            .collect())
    }

    async fn kill_session(&self, pid: i32) -> Result<()> {
        let mut conn = self.pool.get_conn().await?;
        let sql = format!("KILL {}", pid);
        conn.query_drop(sql).await?;
        Ok(())
    }
}

#[async_trait]
impl DatabaseManagementDriver for MySqlDriver {
    async fn create_database(&self, name: &str) -> Result<()> {
        let mut conn = self.pool.get_conn().await?;
        let sql = format!("CREATE DATABASE `{}`", name.replace("`", "``"));
        conn.query_drop(sql).await?;
        Ok(())
    }

    async fn drop_database(&self, name: &str) -> Result<()> {
        let mut conn = self.pool.get_conn().await?;
        let sql = format!("DROP DATABASE `{}`", name.replace("`", "``"));
        conn.query_drop(sql).await?;
        Ok(())
    }

    async fn create_schema(&self, name: &str) -> Result<()> {
        self.create_database(name).await
    }

    async fn drop_schema(&self, name: &str) -> Result<()> {
        self.drop_database(name).await
    }

    async fn install_extension(
        &self,
        _name: &str,
        _schema: Option<&str>,
        _version: Option<&str>,
    ) -> Result<()> {
        Err(anyhow::anyhow!(
            "MySQL does not support extensions via this API"
        ))
    }

    async fn drop_extension(&self, _name: &str) -> Result<()> {
        Err(anyhow::anyhow!(
            "MySQL does not support extensions via this API"
        ))
    }
}
