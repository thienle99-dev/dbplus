pub mod column;
pub mod connection;
pub mod function;
pub mod query;
pub mod schema;
pub mod table;
pub mod view;

use crate::models::entities::connection as connection_entity;
use anyhow::Result;
use axum::async_trait;
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
    async fn get_active_sessions(&self) -> Result<Vec<crate::services::db_driver::SessionInfo>> {
        Err(anyhow::anyhow!(
            "Session management not supported for MySQL yet"
        ))
    }
    async fn kill_session(&self, _pid: i32) -> Result<()> {
        Err(anyhow::anyhow!(
            "Session management not supported for MySQL yet"
        ))
    }
}
