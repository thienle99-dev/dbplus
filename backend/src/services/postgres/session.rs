use crate::services::db_driver::SessionInfo;
use crate::services::driver::base::QueryDriver;
use crate::services::driver::SessionOperations;
use crate::services::postgres::PostgresDriver;
use anyhow::{Context, Result};
use async_trait::async_trait;

#[async_trait]
impl SessionOperations for PostgresDriver {
    async fn get_active_sessions(&self) -> Result<Vec<SessionInfo>> {
        let sql = r#"
            SELECT
                pid,
                usename as user_name,
                application_name,
                client_addr::text,
                backend_start::text,
                query_start::text,
                state,
                query,
                wait_event_type,
                wait_event,
                state_change::text
            FROM pg_stat_activity
            where datname = current_database()
            ORDER BY backend_start DESC
        "#;

        let rows = <Self as QueryDriver>::query(self, sql).await?;

        let sessions = rows
            .rows
            .into_iter()
            .map(|row| {
                // helper closure to get string or none
                // The row items are Values.
                let get_str = |idx: usize| -> Option<String> {
                    match &row.get(idx) {
                        Some(serde_json::Value::String(s)) => Some(s.clone()),
                        Some(serde_json::Value::Null) => None,
                        // handle other types if necessary, though query cast to text
                        _ => None,
                    }
                };

                let get_i32 = |idx: usize| -> i32 {
                    match &row.get(idx) {
                        Some(serde_json::Value::Number(n)) => n.as_i64().unwrap_or(0) as i32,
                        _ => 0,
                    }
                };

                // This is hacky because query() returns QueryResult with Vec<Vec<Value>>.
                // We need to map by index based on SELECT order.
                // Indexes:
                // 0: pid (int)
                // 1: user_name
                // 2: application_name
                // 3: client_addr
                // 4: backend_start
                // 5: query_start
                // 6: state
                // 7: query
                // 8: wait_event_type
                // 9: wait_event
                // 10: state_change

                SessionInfo {
                    pid: get_i32(0),
                    user_name: get_str(1),
                    application_name: get_str(2),
                    client_addr: get_str(3),
                    backend_start: get_str(4),
                    query_start: get_str(5),
                    state: get_str(6),
                    query: get_str(7),
                    wait_event_type: get_str(8),
                    wait_event: get_str(9),
                    state_change: get_str(10),
                }
            })
            .collect();

        Ok(sessions)
    }

    async fn kill_session(&self, pid: i32) -> Result<()> {
        // pg_terminate_backend(pid) returns true if successful.
        let sql = format!("SELECT pg_terminate_backend({})", pid);
        <Self as QueryDriver>::execute(self, &sql)
            .await
            .context("Failed to kill session")?;
        Ok(())
    }
}
