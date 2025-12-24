pub mod connection;
pub mod management;
pub mod query;
pub mod schema;

pub use connection::MongoDriver;

use mongodb::bson::{Bson, Document};
use serde_json::Value;
use std::collections::HashMap;

pub fn bson_to_json(bson: &Bson) -> Value {
    match bson {
        Bson::Double(d) => Value::from(*d),
        Bson::String(s) => Value::String(s.clone()),
        Bson::Array(arr) => Value::Array(arr.iter().map(bson_to_json).collect()),
        Bson::Document(doc) => {
            let mut map = serde_json::Map::new();
            for (k, v) in doc {
                map.insert(k.clone(), bson_to_json(v));
            }
            Value::Object(map)
        }
        Bson::Boolean(b) => Value::Bool(*b),
        Bson::Null => Value::Null,
        Bson::Int32(i) => Value::from(*i),
        Bson::Int64(i) => Value::from(*i),
        Bson::ObjectId(oid) => Value::String(oid.to_hex()),
        Bson::DateTime(dt) => Value::String(
            dt.try_to_rfc3339_string()
                .unwrap_or_else(|_| dt.to_string()),
        ),
        _ => Value::String(format!("{:?}", bson)),
    }
}

pub fn json_value_to_bson(v: &Value) -> Bson {
    match v {
        Value::Null => Bson::Null,
        Value::Bool(b) => Bson::Boolean(*b),
        Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Bson::Int64(i)
            } else if let Some(f) = n.as_f64() {
                Bson::Double(f)
            } else {
                Bson::Null
            }
        }
        Value::String(s) => {
            // Heuristic: if it looks like an ObjectId, maybe wrap it?
            // But safely we should probably only do this for _id in filters
            Bson::String(s.clone())
        }
        Value::Array(arr) => Bson::Array(arr.iter().map(json_value_to_bson).collect()),
        Value::Object(obj) => {
            let mut doc = Document::new();
            for (k, val) in obj {
                doc.insert(k, json_value_to_bson(val));
            }
            Bson::Document(doc)
        }
    }
}

pub fn json_to_bson_doc(map: &HashMap<String, Value>) -> Document {
    let mut doc = Document::new();
    for (k, v) in map {
        doc.insert(k, json_value_to_bson(v));
    }
    doc
}

pub fn json_to_bson_filter(map: &HashMap<String, Value>) -> Document {
    let mut filter = Document::new();
    for (k, v) in map {
        if k == "_id" || k == "id" {
            if let Some(s) = v.as_str() {
                if let Ok(oid) = mongodb::bson::oid::ObjectId::parse_str(s) {
                    filter.insert("_id", oid);
                    continue;
                }
            }
        }
        filter.insert(k, json_value_to_bson(v));
    }
    filter
}
