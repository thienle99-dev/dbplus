use crate::services::driver::capabilities::{DriverCapabilities, DriverCapability};

use super::connection::CouchbaseDriver;

impl DriverCapabilities for CouchbaseDriver {
    fn supported_capabilities(&self) -> Vec<DriverCapability> {
        vec![
            DriverCapability::Schemas,
            DriverCapability::Indexes,
            // Add others as implemented
        ]
    }
}
