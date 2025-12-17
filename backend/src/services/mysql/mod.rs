pub mod column;
pub mod connection;
pub mod function;
pub mod query;
pub mod schema;
pub mod table;
pub mod view;

use crate::models::entities::connection as connection_entity;
use anyhow::Result;
use mysql_async::{OptsBuilder, Pool};

#[derive(Clone)]
pub struct MySqlDriver {
    pub pool: Pool,
}

impl MySqlDriver {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
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
            opts = opts.tcp_port(3306);
        }

        opts = opts.user(Some(&conn.username));
        opts = opts.pass(Some(password));
        opts = opts.db_name(Some(&conn.database));

        let pool = Pool::new(opts);
        Ok(Self::new(pool))
    }
}
