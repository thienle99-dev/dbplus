use anyhow::Result;
use fake::faker::address::en::*;
use fake::faker::company::en::*;
use fake::faker::internet::en::*;
use fake::faker::lorem::en::*;
use fake::faker::name::en::*;
use fake::faker::phone_number::en::*;
use fake::Fake;
use rand::Rng;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MockDataType {
    Auto, // Infer based on column name/type
    Email,
    Name,
    FirstName,
    LastName,
    Address,
    City,
    Country,
    Phone,
    Company,
    Date,
    Integer {
        min: i64,
        max: i64,
    },
    Decimal {
        min: f64,
        max: f64,
        precision: u32,
    },
    Boolean,
    UUID,
    Text {
        min_len: usize,
        max_len: usize,
    },
    Custom {
        values: Vec<String>,
    },
    ForeignKey {
        referenced_table: String,
        referenced_column: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnRule {
    pub column_name: String,
    pub data_type: MockDataType,
    pub is_unique: bool,
    pub is_nullable: bool,
    pub null_probability: f64, // 0.0 to 1.0
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerationConfig {
    pub table_name: String,
    pub count: usize,
    pub rules: Vec<ColumnRule>,
}

pub struct MockDataGenerator;

impl MockDataGenerator {
    pub fn new() -> Self {
        Self
    }

    pub fn generate_data(&self, config: &GenerationConfig) -> Result<Vec<HashMap<String, Value>>> {
        let mut data = Vec::with_capacity(config.count);
        let mut unique_registry: HashMap<String, HashSet<String>> = HashMap::new();

        for _ in 0..config.count {
            let mut row = HashMap::new();

            for rule in &config.rules {
                let value = self.generate_value(rule, &mut unique_registry)?;
                row.insert(rule.column_name.clone(), value);
            }

            data.push(row);
        }

        Ok(data)
    }

    fn generate_value(
        &self,
        rule: &ColumnRule,
        unique_registry: &mut HashMap<String, HashSet<String>>,
    ) -> Result<Value> {
        let mut rng = rand::rng();

        // Handle Nuallable
        if rule.is_nullable && rng.random_bool(rule.null_probability) {
            return Ok(Value::Null);
        }

        // Retry loop for unique constraint
        let max_retries = 10;
        let mut attempts = 0;

        loop {
            let val = match &rule.data_type {
                MockDataType::Auto => self.infer_and_generate(&rule.column_name),
                MockDataType::Email => Value::String(SafeEmail().fake()),
                MockDataType::Name => Value::String(Name().fake()),
                MockDataType::FirstName => Value::String(FirstName().fake()),
                MockDataType::LastName => Value::String(LastName().fake()),
                MockDataType::Address => Value::String(StreetName().fake()),
                MockDataType::City => Value::String(CityName().fake()),
                MockDataType::Country => Value::String(CountryName().fake()),
                MockDataType::Phone => Value::String(PhoneNumber().fake()),
                MockDataType::Company => Value::String(CompanyName().fake()),
                MockDataType::Date => {
                    // Simple random date in recent past
                    // In real app, might want specific range
                    Value::String(chrono::Utc::now().to_rfc3339())
                }
                MockDataType::Integer { min, max } => {
                    Value::Number(serde_json::Number::from(rng.random_range(*min..=*max)))
                }
                MockDataType::Decimal {
                    min,
                    max,
                    precision: _,
                } => {
                    let v: f64 = rng.random_range(*min..=*max);
                    // TODO: Handle precision rounding
                    Value::from(v)
                }
                MockDataType::Boolean => Value::Bool(rng.random()),
                MockDataType::UUID => Value::String(uuid::Uuid::new_v4().to_string()),
                MockDataType::Text {
                    min_len,
                    max_len: _,
                } => Value::String(Sentence(*min_len..*min_len + 5).fake()),
                MockDataType::Custom { values } => {
                    if values.is_empty() {
                        Value::Null
                    } else {
                        let idx = rng.random_range(0..values.len());
                        Value::String(values[idx].clone())
                    }
                }
                MockDataType::ForeignKey { .. } => {
                    // Placeholder: This requires DB lookup which we'll handle in service layer
                    // For now return purely random placeholder
                    Value::Null
                }
            };

            if rule.is_unique {
                let val_str = val.to_string();
                let set = unique_registry.entry(rule.column_name.clone()).or_default();
                if !set.contains(&val_str) {
                    set.insert(val_str);
                    return Ok(val);
                }
                attempts += 1;
                if attempts >= max_retries {
                    // Fallback or error? For now, return what we have to avoid infinite loop
                    // In strict mode, we should error.
                    return Ok(val);
                }
            } else {
                return Ok(val);
            }
        }
    }

    fn infer_and_generate(&self, column_name: &str) -> Value {
        let name_lower = column_name.to_lowercase();
        if name_lower.contains("email") {
            Value::String(SafeEmail().fake())
        } else if name_lower.contains("first_name") || name_lower.contains("firstname") {
            Value::String(FirstName().fake())
        } else if name_lower.contains("last_name") || name_lower.contains("lastname") {
            Value::String(LastName().fake())
        } else if name_lower.contains("name") {
            Value::String(Name().fake())
        } else if name_lower.contains("phone") {
            Value::String(PhoneNumber().fake())
        } else if name_lower.contains("addr") {
            Value::String(StreetName().fake())
        } else if name_lower.contains("city") {
            Value::String(CityName().fake())
        } else if name_lower.contains("country") {
            Value::String(CountryName().fake())
        } else if name_lower.contains("company") {
            Value::String(CompanyName().fake())
        } else if name_lower.contains("uuid") || name_lower.contains("guid") {
            Value::String(uuid::Uuid::new_v4().to_string())
        } else {
            Value::String(Word().fake())
        }
    }
}
