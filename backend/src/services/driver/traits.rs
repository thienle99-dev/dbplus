use anyhow::Result;
use async_trait::async_trait;

#[allow(dead_code)]
pub trait DriverMetadata {
    fn driver_name(&self) -> &'static str;
    fn driver_version(&self) -> &'static str;
    fn database_type(&self) -> &'static str;
    fn supports_transactions(&self) -> bool;
    fn supports_prepared_statements(&self) -> bool;
}

#[allow(dead_code)]
#[async_trait]
pub trait ConnectionPoolDriver: Send + Sync {
    async fn get_pool_size(&self) -> Result<usize>;
    async fn get_active_connections(&self) -> Result<usize>;
    async fn get_idle_connections(&self) -> Result<usize>;
}

#[allow(dead_code)]
#[async_trait]
pub trait HealthCheckDriver: Send + Sync {
    async fn health_check(&self) -> Result<DriverHealth>;
}

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct DriverHealth {
    pub status: HealthStatus,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum HealthStatus {
    Healthy,
    Degraded,
    Unhealthy,
}
