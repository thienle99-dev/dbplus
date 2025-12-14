use crate::services::db_driver::{ColumnMetadata, QueryResult};
use crate::services::driver::{ConnectionDriver, QueryDriver};
use anyhow::Result;
use async_trait::async_trait;
use chrono::{DateTime, Local, NaiveDate, NaiveDateTime, NaiveTime, Utc};
use deadpool_postgres::Pool;
use postgres_types::{FromSql, Kind, Type as PgType};
use rust_decimal::Decimal;
use serde_json::Value;
use std::collections::HashMap;
use std::net::IpAddr;
use uuid::Uuid;

#[derive(Debug)]
struct PgMoney(Decimal);

impl<'a> FromSql<'a> for PgMoney {
    fn from_sql(_: &PgType, raw: &'a [u8]) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        if raw.len() != 8 {
            return Err("invalid money length".into());
        }
        let amount = i64::from_be_bytes(raw[0..8].try_into().unwrap());
        Ok(PgMoney(Decimal::new(amount, 2)))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::MONEY
    }
}

#[derive(Debug)]
struct PgTimeTz(String);

impl<'a> FromSql<'a> for PgTimeTz {
    fn from_sql(
        _: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        if raw.len() != 12 {
            return Err("invalid timetz length".into());
        }
        let micros = i64::from_be_bytes(raw[0..8].try_into().unwrap());
        let tz_offset_seconds = i32::from_be_bytes(raw[8..12].try_into().unwrap());
        Ok(PgTimeTz(format!(
            "{}{}",
            format_time_of_day(micros),
            format_tz_offset(tz_offset_seconds)
        )))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::TIMETZ
    }
}

#[derive(Debug)]
struct PgInterval(String);

impl<'a> FromSql<'a> for PgInterval {
    fn from_sql(
        _: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        if raw.len() != 16 {
            return Err("invalid interval length".into());
        }
        let microseconds = i64::from_be_bytes(raw[0..8].try_into().unwrap());
        let days = i32::from_be_bytes(raw[8..12].try_into().unwrap());
        let months = i32::from_be_bytes(raw[12..16].try_into().unwrap());
        Ok(PgInterval(format_interval(months, days, microseconds)))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::INTERVAL
    }
}

#[derive(Debug)]
struct PgMacAddr(String);

impl<'a> FromSql<'a> for PgMacAddr {
    fn from_sql(
        _: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        if raw.len() != 6 {
            return Err("invalid macaddr length".into());
        }
        Ok(PgMacAddr(format_mac_bytes(raw)))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::MACADDR
    }
}

#[derive(Debug)]
struct PgMacAddr8(String);

impl<'a> FromSql<'a> for PgMacAddr8 {
    fn from_sql(
        _: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        if raw.len() != 8 {
            return Err("invalid macaddr8 length".into());
        }
        Ok(PgMacAddr8(format_mac_bytes(raw)))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::MACADDR8
    }
}

#[derive(Debug)]
struct PgBitString(String);

impl<'a> FromSql<'a> for PgBitString {
    fn from_sql(
        _: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        let varbit = postgres_protocol::types::varbit_from_sql(raw)?;
        let len = varbit.len();
        let bytes = varbit.bytes();

        let mut s = String::with_capacity(len);
        for bit_index in 0..len {
            let byte = bytes[bit_index / 8];
            let mask = 1 << (7 - (bit_index % 8));
            if (byte & mask) != 0 {
                s.push('1');
            } else {
                s.push('0');
            }
        }

        Ok(PgBitString(s))
    }

    fn accepts(ty: &PgType) -> bool {
        *ty == PgType::BIT || *ty == PgType::VARBIT
    }
}

#[derive(Debug)]
struct PgRangeString(String);

impl<'a> FromSql<'a> for PgRangeString {
    fn from_sql(
        ty: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        let Kind::Range(inner) = ty.kind() else {
            return Err("not a range type".into());
        };
        let range = postgres_protocol::types::range_from_sql(raw)?;
        Ok(PgRangeString(format_range(&range, inner)))
    }

    fn accepts(ty: &PgType) -> bool {
        matches!(ty.kind(), Kind::Range(_))
    }
}

#[derive(Debug)]
struct PgMultirangeString(String);

impl<'a> FromSql<'a> for PgMultirangeString {
    fn from_sql(
        ty: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        let Kind::Multirange(inner) = ty.kind() else {
            return Err("not a multirange type".into());
        };
        Ok(PgMultirangeString(format_multirange(raw, inner)?))
    }

    fn accepts(ty: &PgType) -> bool {
        matches!(ty.kind(), Kind::Multirange(_))
    }
}

#[derive(Debug)]
struct PgUserDefinedValue(Value);

impl<'a> FromSql<'a> for PgUserDefinedValue {
    fn from_sql(
        ty: &PgType,
        raw: &'a [u8],
    ) -> Result<Self, Box<dyn std::error::Error + Sync + Send>> {
        match ty.kind() {
            Kind::Enum(_) => Ok(PgUserDefinedValue(Value::String(
                postgres_protocol::types::text_from_sql(raw)?.to_string(),
            ))),
            Kind::Domain(inner) => Ok(PgUserDefinedValue(decode_domain_value(inner, raw)?)),
            _ => Err("not an enum/domain type".into()),
        }
    }

    fn accepts(ty: &PgType) -> bool {
        matches!(ty.kind(), Kind::Enum(_) | Kind::Domain(_))
    }
}

fn format_mac_bytes(bytes: &[u8]) -> String {
    bytes
        .iter()
        .map(|b| format!("{:02x}", b))
        .collect::<Vec<_>>()
        .join(":")
}

fn format_time_of_day(micros_since_midnight: i64) -> String {
    let micros_per_day = 86_400_i64 * 1_000_000;
    let mut micros = micros_since_midnight % micros_per_day;
    if micros < 0 {
        micros += micros_per_day;
    }

    let hours = micros / 3_600_000_000;
    micros -= hours * 3_600_000_000;
    let minutes = micros / 60_000_000;
    micros -= minutes * 60_000_000;
    let seconds = micros / 1_000_000;
    micros -= seconds * 1_000_000;

    if micros == 0 {
        format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
    } else {
        format!("{:02}:{:02}:{:02}.{:06}", hours, minutes, seconds, micros)
    }
}

fn format_tz_offset(offset_seconds: i32) -> String {
    let sign = if offset_seconds >= 0 { '+' } else { '-' };
    let total = offset_seconds.unsigned_abs();
    let hours = total / 3600;
    let minutes = (total % 3600) / 60;
    format!("{}{:02}:{:02}", sign, hours, minutes)
}

fn format_interval(months: i32, days: i32, microseconds: i64) -> String {
    // Postgres interval binary: (microseconds, days, months).
    // Return a stable, human-readable string without locale-specific formatting.
    let mut parts: Vec<String> = Vec::new();
    if months != 0 {
        parts.push(format!("{} mons", months));
    }
    if days != 0 {
        parts.push(format!("{} days", days));
    }

    let sign = if microseconds < 0 { "-" } else { "" };
    let mut us = microseconds.abs();
    let hours = us / 3_600_000_000;
    us -= hours * 3_600_000_000;
    let minutes = us / 60_000_000;
    us -= minutes * 60_000_000;
    let seconds = us / 1_000_000;
    us -= seconds * 1_000_000;

    if microseconds != 0 || parts.is_empty() {
        if us == 0 {
            parts.push(format!("{}{:02}:{:02}:{:02}", sign, hours, minutes, seconds));
        } else {
            parts.push(format!(
                "{}{:02}:{:02}:{:02}.{:06}",
                sign, hours, minutes, seconds, us
            ));
        }
    }

    parts.join(" ")
}

fn decode_domain_value(
    inner: &PgType,
    raw: &[u8],
) -> Result<Value, Box<dyn std::error::Error + Sync + Send>> {
    if *inner == PgType::BOOL {
        let v = <bool as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::Bool(v));
    }

    if *inner == PgType::INT2 {
        let v = <i16 as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::Number(v.into()));
    }
    if *inner == PgType::INT4 {
        let v = <i32 as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::Number(v.into()));
    }
    if *inner == PgType::INT8 {
        let v = <i64 as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::Number(v.into()));
    }

    if *inner == PgType::FLOAT4 {
        let v = <f32 as FromSql>::from_sql(inner, raw)? as f64;
        return Ok(Value::Number(
            serde_json::Number::from_f64(v).unwrap_or_else(|| serde_json::Number::from(0)),
        ));
    }
    if *inner == PgType::FLOAT8 {
        let v = <f64 as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::Number(
            serde_json::Number::from_f64(v).unwrap_or_else(|| serde_json::Number::from(0)),
        ));
    }

    if *inner == PgType::NUMERIC {
        let v = <Decimal as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }

    if *inner == PgType::UUID {
        let v = <Uuid as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }

    if *inner == PgType::DATE {
        let v = <NaiveDate as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }
    if *inner == PgType::TIME {
        let v = <NaiveTime as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }
    if *inner == PgType::TIMESTAMP {
        let v = <NaiveDateTime as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }
    if *inner == PgType::TIMESTAMPTZ {
        let v = <DateTime<Utc> as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }

    if *inner == PgType::INET {
        let v = <IpAddr as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(v.to_string()));
    }

    if *inner == PgType::BYTEA {
        let v = <Vec<u8> as FromSql>::from_sql(inner, raw)?;
        return Ok(Value::String(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &v,
        )));
    }

    // Best-effort fallback: some domain base types (like enums) use text representation.
    if let Ok(s) = postgres_protocol::types::text_from_sql(raw) {
        return Ok(Value::String(s.to_string()));
    }

    Ok(Value::Null)
}

fn decode_range_value_to_string(
    inner: &PgType,
    raw: &[u8],
) -> Result<String, Box<dyn std::error::Error + Sync + Send>> {
    if *inner == PgType::INT4 {
        let v = <i32 as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if *inner == PgType::INT8 {
        let v = <i64 as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if *inner == PgType::NUMERIC {
        let v = <Decimal as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if *inner == PgType::DATE {
        let v = <NaiveDate as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if *inner == PgType::TIMESTAMP {
        let v = <NaiveDateTime as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if *inner == PgType::TIMESTAMPTZ {
        let v = <DateTime<Utc> as FromSql>::from_sql(inner, raw)?;
        return Ok(v.to_string());
    }
    if let Ok(s) = postgres_protocol::types::text_from_sql(raw) {
        return Ok(s.to_string());
    }
    Err("unsupported range element type".into())
}

fn format_range(range: &postgres_protocol::types::Range<'_>, inner: &PgType) -> String {
    use postgres_protocol::types::{Range, RangeBound};

    let (lower_bracket, lower_value): (char, Option<&[u8]>) = match range {
        Range::Empty => return "empty".to_string(),
        Range::Nonempty(lower, _) => match lower {
            RangeBound::Inclusive(v) => ('[', *v),
            RangeBound::Exclusive(v) => ('(', *v),
            RangeBound::Unbounded => ('[', None),
        },
    };

    let (upper_bracket, upper_value): (char, Option<&[u8]>) = match range {
        Range::Empty => return "empty".to_string(),
        Range::Nonempty(_, upper) => match upper {
            RangeBound::Inclusive(v) => (']', *v),
            RangeBound::Exclusive(v) => (')', *v),
            RangeBound::Unbounded => (']', None),
        },
    };

    let lower_str = match lower_value {
        None => "".to_string(),
        Some(raw) => decode_range_value_to_string(inner, raw).unwrap_or_else(|_| "?".to_string()),
    };
    let upper_str = match upper_value {
        None => "".to_string(),
        Some(raw) => decode_range_value_to_string(inner, raw).unwrap_or_else(|_| "?".to_string()),
    };

    format!("{}{},{}{}", lower_bracket, lower_str, upper_str, upper_bracket)
}

fn format_multirange(
    raw: &[u8],
    inner: &PgType,
) -> Result<String, Box<dyn std::error::Error + Sync + Send>> {
    if raw.len() < 4 {
        return Err("invalid multirange length".into());
    }
    let mut cursor = 0usize;
    let count = i32::from_be_bytes(raw[cursor..cursor + 4].try_into().unwrap());
    cursor += 4;
    if count < 0 {
        return Err("invalid multirange count".into());
    }

    let mut ranges = Vec::with_capacity(count as usize);
    for _ in 0..(count as usize) {
        if cursor + 4 > raw.len() {
            return Err("invalid multirange buffer".into());
        }
        let len = i32::from_be_bytes(raw[cursor..cursor + 4].try_into().unwrap());
        cursor += 4;
        if len < 0 {
            return Err("invalid multirange element length".into());
        }
        let len = len as usize;
        if cursor + len > raw.len() {
            return Err("invalid multirange element buffer".into());
        }
        let range_raw = &raw[cursor..cursor + len];
        cursor += len;
        let range = postgres_protocol::types::range_from_sql(range_raw)?;
        ranges.push(format_range(&range, inner));
    }

    Ok(format!("{{{}}}", ranges.join(",")))
}

fn decode_row_value(
    row: &tokio_postgres::Row,
    idx: usize,
    col_name: &str,
    log_prefix: &str,
) -> Value {
    let col_type = row.columns()[idx].type_();

    if matches!(col_type.kind(), Kind::Enum(_) | Kind::Domain(_)) {
        match row.try_get::<_, Option<PgUserDefinedValue>>(idx) {
            Ok(Some(v)) => return v.0,
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed enum/domain decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if matches!(col_type.kind(), Kind::Range(_)) {
        match row.try_get::<_, Option<PgRangeString>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed range decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if matches!(col_type.kind(), Kind::Multirange(_)) {
        match row.try_get::<_, Option<PgMultirangeString>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed multirange decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MONEY {
        match row.try_get::<_, Option<PgMoney>>(idx) {
            Ok(Some(v)) => return Value::String(v.0.to_string()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed money decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MONEY_ARRAY {
        match row.try_get::<_, Option<Vec<PgMoney>>>(idx) {
            Ok(Some(v)) => {
                return Value::Array(v.into_iter().map(|m| Value::String(m.0.to_string())).collect())
            }
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!("{} Column '{}' failed money[] decode: {}", log_prefix, col_name, e),
        }
    }

    if *col_type == PgType::TIMETZ_ARRAY {
        match row.try_get::<_, Option<Vec<PgTimeTz>>>(idx) {
            Ok(Some(v)) => return Value::Array(v.into_iter().map(|t| Value::String(t.0)).collect()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed timetz[] decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::INTERVAL_ARRAY {
        match row.try_get::<_, Option<Vec<PgInterval>>>(idx) {
            Ok(Some(v)) => return Value::Array(v.into_iter().map(|t| Value::String(t.0)).collect()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed interval[] decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MACADDR_ARRAY {
        match row.try_get::<_, Option<Vec<PgMacAddr>>>(idx) {
            Ok(Some(v)) => return Value::Array(v.into_iter().map(|m| Value::String(m.0)).collect()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed macaddr[] decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MACADDR8_ARRAY {
        match row.try_get::<_, Option<Vec<PgMacAddr8>>>(idx) {
            Ok(Some(v)) => return Value::Array(v.into_iter().map(|m| Value::String(m.0)).collect()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed macaddr8[] decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::BIT_ARRAY || *col_type == PgType::VARBIT_ARRAY {
        match row.try_get::<_, Option<Vec<PgBitString>>>(idx) {
            Ok(Some(v)) => return Value::Array(v.into_iter().map(|b| Value::String(b.0)).collect()),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed bit/varbit[] decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::TIMETZ {
        match row.try_get::<_, Option<PgTimeTz>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed timetz decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::INTERVAL {
        match row.try_get::<_, Option<PgInterval>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed interval decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MACADDR {
        match row.try_get::<_, Option<PgMacAddr>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed macaddr decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::MACADDR8 {
        match row.try_get::<_, Option<PgMacAddr8>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed macaddr8 decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    if *col_type == PgType::BIT || *col_type == PgType::VARBIT {
        match row.try_get::<_, Option<PgBitString>>(idx) {
            Ok(Some(v)) => return Value::String(v.0),
            Ok(None) => return Value::Null,
            Err(e) => tracing::warn!(
                "{} Column '{}' failed bit/varbit decode: {}",
                log_prefix,
                col_name,
                e
            ),
        }
    }

    // Existing decoding strategy (keep order to preserve behavior).
    if col_type.name() == "numeric" || col_type.name() == "decimal" {
        return match row.try_get::<_, Option<Decimal>>(idx) {
            Ok(Some(v)) => Value::String(v.to_string()),
            Ok(None) => Value::Null,
            Err(e) => {
                tracing::warn!(
                    "{} Column '{}' failed Decimal parse: {}",
                    log_prefix,
                    col_name,
                    e
                );
                Value::Null
            }
        };
    }

    if let Ok(Some(v)) = row.try_get::<_, Option<i64>>(idx) {
        return Value::Number(v.into());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<i32>>(idx) {
        return Value::Number(v.into());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<i16>>(idx) {
        return Value::Number(v.into());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Decimal>>(idx) {
        return Value::String(v.to_string());
    }

    if col_type.name() == "numeric" || col_type.name() == "decimal" {
        if let Ok(Some(v)) = row.try_get::<_, Option<String>>(idx) {
            return Value::String(v);
        }
        return Value::Null;
    }

    if let Ok(Some(v)) = row.try_get::<_, Option<f64>>(idx) {
        return Value::Number(
            serde_json::Number::from_f64(v).unwrap_or_else(|| serde_json::Number::from(0)),
        );
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<f32>>(idx) {
        return Value::Number(
            serde_json::Number::from_f64(v as f64).unwrap_or_else(|| serde_json::Number::from(0)),
        );
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Uuid>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDateTime>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<NaiveDate>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<NaiveTime>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Utc>>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<DateTime<Local>>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<IpAddr>>(idx) {
        return Value::String(v.to_string());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<u8>>>(idx) {
        return Value::String(base64::Engine::encode(
            &base64::engine::general_purpose::STANDARD,
            &v,
        ));
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<HashMap<String, Option<String>>>>(idx) {
        let obj: serde_json::Map<String, Value> = v
            .into_iter()
            .map(|(k, v)| (k, v.map(Value::String).unwrap_or(Value::Null)))
            .collect();
        return Value::Object(obj);
    }

    // Arrays (expanded coverage).
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<String>>>(idx) {
        return Value::Array(v.into_iter().map(Value::String).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i16>>>(idx) {
        return Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i32>>>(idx) {
        return Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<i64>>>(idx) {
        return Value::Array(v.into_iter().map(|n| Value::Number(n.into())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<bool>>>(idx) {
        return Value::Array(v.into_iter().map(Value::Bool).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<f32>>>(idx) {
        return Value::Array(
            v.into_iter()
                .map(|n| {
                    Value::Number(
                        serde_json::Number::from_f64(n as f64)
                            .unwrap_or_else(|| serde_json::Number::from(0)),
                    )
                })
                .collect(),
        );
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<f64>>>(idx) {
        return Value::Array(
            v.into_iter()
                .map(|n| {
                    Value::Number(
                        serde_json::Number::from_f64(n).unwrap_or_else(|| serde_json::Number::from(0)),
                    )
                })
                .collect(),
        );
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<Decimal>>>(idx) {
        return Value::Array(v.into_iter().map(|d| Value::String(d.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<Uuid>>>(idx) {
        return Value::Array(v.into_iter().map(|u| Value::String(u.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<NaiveDate>>>(idx) {
        return Value::Array(v.into_iter().map(|d| Value::String(d.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<NaiveDateTime>>>(idx) {
        return Value::Array(v.into_iter().map(|d| Value::String(d.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<DateTime<Utc>>>>(idx) {
        return Value::Array(v.into_iter().map(|d| Value::String(d.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<IpAddr>>>(idx) {
        return Value::Array(v.into_iter().map(|ip| Value::String(ip.to_string())).collect());
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<Vec<u8>>>>(idx) {
        return Value::Array(
            v.into_iter()
                .map(|bytes| {
                    Value::String(base64::Engine::encode(
                        &base64::engine::general_purpose::STANDARD,
                        &bytes,
                    ))
                })
                .collect(),
        );
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<Value>>>(idx) {
        return Value::Array(v);
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<Vec<HashMap<String, Option<String>>>>>(idx) {
        return Value::Array(
            v.into_iter()
                .map(|m| {
                    Value::Object(
                        m.into_iter()
                            .map(|(k, v)| (k, v.map(Value::String).unwrap_or(Value::Null)))
                            .collect(),
                    )
                })
                .collect(),
        );
    }

    if let Ok(v) = row.try_get::<_, Value>(idx) {
        return v;
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<String>>(idx) {
        return Value::String(v);
    }
    if let Ok(Some(v)) = row.try_get::<_, Option<bool>>(idx) {
        return Value::Bool(v);
    }

    tracing::warn!(
        "{} Column '{}' (index {}) with type '{}' failed all type conversions",
        log_prefix,
        col_name,
        idx,
        col_type.name()
    );
    Value::Null
}

pub struct PostgresQuery {
    pool: Pool,
}

impl PostgresQuery {
    pub fn new(pool: Pool) -> Self {
        Self { pool }
    }

    async fn resolve_metadata(
        client: &deadpool_postgres::Client,
        columns: &[tokio_postgres::Column],
    ) -> Result<Option<Vec<ColumnMetadata>>> {
        let mut table_oids: Vec<u32> = columns.iter().filter_map(|c| c.table_oid()).collect();

        if table_oids.is_empty() {
            return Ok(None);
        }

        table_oids.sort();
        table_oids.dedup();

        let metadata_query = "
            SELECT 
                c.oid, 
                n.nspname, 
                c.relname,
                ARRAY(
                    SELECT a.attname 
                    FROM pg_index i
                    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                    WHERE i.indrelid = c.oid AND i.indisprimary
                ) as pk_cols
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE c.oid = ANY($1)
        ";

        let rows = client.query(metadata_query, &[&table_oids]).await?;

        let mut lookup = std::collections::HashMap::new();
        for row in rows {
            let oid: u32 = row.get("oid");
            let schema: String = row.get("nspname");
            let table: String = row.get("relname");
            let pk_cols: Vec<String> = row.get("pk_cols");
            lookup.insert(oid, (schema, table, pk_cols));
        }

        let mut metadata = Vec::new();
        for col in columns {
            if let Some(oid) = col.table_oid() {
                if let Some((schema, table, pks)) = lookup.get(&oid) {
                    let col_name = col.name().to_string();
                    let is_primary_key = pks.contains(&col_name);

                    metadata.push(ColumnMetadata {
                        table_name: Some(table.clone()),
                        column_name: col_name,
                        is_primary_key,
                        is_editable: true, // Generally valid if we have table info, refinement possible later
                        schema_name: Some(schema.clone()),
                    });
                    continue;
                }
            }

            // Fallback for expression columns or failed lookup
            metadata.push(ColumnMetadata {
                table_name: None,
                column_name: col.name().to_string(),
                is_primary_key: false,
                is_editable: false,
                schema_name: None,
            });
        }

        Ok(Some(metadata))
    }
}

#[async_trait]
impl ConnectionDriver for PostgresQuery {
    async fn test_connection(&self) -> Result<()> {
        let client = self.pool.get().await?;
        client.execute("SELECT 1", &[]).await?;
        Ok(())
    }
}

#[async_trait]
impl QueryDriver for PostgresQuery {
    async fn execute(&self, query: &str) -> Result<u64> {
        let client = self.pool.get().await?;
        let rows_affected = client.execute(query, &[]).await?;
        Ok(rows_affected)
    }

    async fn query(&self, query: &str) -> Result<QueryResult> {
        let client = self.pool.get().await?;
        let rows = client.query(query, &[]).await?;

        if rows.is_empty() {
            return Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: 0,
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            });
        }

        let columns: Vec<String> = rows[0]
            .columns()
            .iter()
            .map(|c| c.name().to_string())
            .collect();

        let mut result_rows = Vec::new();
        for row in &rows {
            let mut current_row = Vec::new();
            for (i, col) in columns.iter().enumerate() {
                let col_type = row.columns()[i].type_();

                tracing::info!(
                    "Processing column '{}' (index {}) with PostgreSQL type: '{}'",
                    col,
                    i,
                    col_type.name()
                );

                let value = decode_row_value(row, i, col, "");
                current_row.push(value);
            }
            result_rows.push(current_row);
        }

        let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
            .await
            .unwrap_or(None);

        Ok(QueryResult {
            columns,
            rows: result_rows,
            affected_rows: 0,
            column_metadata,
            total_count: None,
            limit: None,
            offset: None,
            has_more: None,
        })
    }

    async fn execute_query(&self, query: &str) -> Result<QueryResult> {
        let client = self.pool.get().await?;
        let statement = client.prepare(query).await?;

        let is_select = query.trim_start().to_uppercase().starts_with("SELECT")
            || query.trim_start().to_uppercase().starts_with("WITH");

        if is_select {
            let rows = client.query(&statement, &[]).await?;

            if rows.is_empty() {
                return Ok(QueryResult {
                    columns: vec![],
                    rows: vec![],
                    affected_rows: 0,
                    column_metadata: None,
                    total_count: None,
                    limit: None,
                    offset: None,
                    has_more: None,
                });
            }

            let columns: Vec<String> = rows[0]
                .columns()
                .iter()
                .map(|c| c.name().to_string())
                .collect();

            let mut result_rows = Vec::new();
            for row in &rows {
                let mut current_row = Vec::new();
                for (i, col) in columns.iter().enumerate() {
                    let col_type = row.columns()[i].type_();

                    tracing::info!("[execute_query] Processing column '{}' (index {}) with PostgreSQL type: '{}'", col, i, col_type.name());

                    let value = decode_row_value(row, i, col, "[execute_query]");
                    current_row.push(value);
                }
                result_rows.push(current_row);
            }

            let column_metadata = Self::resolve_metadata(&client, rows[0].columns())
                .await
                .unwrap_or(None);

            Ok(QueryResult {
                columns,
                rows: result_rows,
                affected_rows: 0,
                column_metadata,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            })
        } else {
            let affected = client.execute(&statement, &[]).await?;
            Ok(QueryResult {
                columns: vec![],
                rows: vec![],
                affected_rows: affected,
                column_metadata: None,
                total_count: None,
                limit: None,
                offset: None,
                has_more: None,
            })
        }
    }

    async fn explain(&self, query: &str, analyze: bool) -> Result<Value> {
        let client = self.pool.get().await?;
        let explain_query = if analyze {
            // BUFFERS provides IO/cache insight (helps detect seq scan / missing indexes / heavy reads)
            format!("EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {}", query)
        } else {
            format!("EXPLAIN (FORMAT JSON) {}", query)
        };
        let rows = client.query(explain_query.as_str(), &[]).await?;

        if !rows.is_empty() {
            let plan_json: Value = rows[0].get(0);
            Ok(plan_json)
        } else {
            Ok(Value::Null)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use bytes::BytesMut;
    use postgres_protocol::types;
    use postgres_protocol::IsNull;

    #[test]
    fn pg_money_decodes_to_decimal_string() {
        let cents: i64 = 12_345;
        let raw = cents.to_be_bytes();
        let m = PgMoney::from_sql(&PgType::MONEY, &raw).unwrap();
        assert_eq!(m.0.to_string(), "123.45");
    }

    #[test]
    fn pg_timetz_decodes_to_string() {
        let micros: i64 = 3_723_000_004; // 01:02:03.000004
        let offset_seconds: i32 = 3600; // +01:00
        let mut raw = Vec::with_capacity(12);
        raw.extend_from_slice(&micros.to_be_bytes());
        raw.extend_from_slice(&offset_seconds.to_be_bytes());

        let t = PgTimeTz::from_sql(&PgType::TIMETZ, &raw).unwrap();
        assert_eq!(t.0, "01:02:03.000004+01:00");
    }

    #[test]
    fn pg_interval_decodes_to_stable_string() {
        let micros: i64 = 4_000_005; // 00:00:04.000005
        let days: i32 = 3;
        let months: i32 = 2;
        let mut raw = Vec::with_capacity(16);
        raw.extend_from_slice(&micros.to_be_bytes());
        raw.extend_from_slice(&days.to_be_bytes());
        raw.extend_from_slice(&months.to_be_bytes());

        let i = PgInterval::from_sql(&PgType::INTERVAL, &raw).unwrap();
        assert_eq!(i.0, "2 mons 3 days 00:00:04.000005");
    }

    #[test]
    fn pg_macaddr_formats_lower_hex() {
        let raw = [0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff];
        let m = PgMacAddr::from_sql(&PgType::MACADDR, &raw).unwrap();
        assert_eq!(m.0, "aa:bb:cc:dd:ee:ff");
    }

    #[test]
    fn pg_varbit_decodes_to_bit_string() {
        let mut buf = BytesMut::new();
        types::varbit_to_sql(4, [0b1010_0000].into_iter(), &mut buf).unwrap();

        let b = PgBitString::from_sql(&PgType::VARBIT, &buf).unwrap();
        assert_eq!(b.0, "1010");
    }

    #[test]
    fn pg_range_decodes_to_string() {
        let mut buf = BytesMut::new();
        types::range_to_sql(
            |w| {
                types::int4_to_sql(1, w);
                Ok(types::RangeBound::Inclusive(IsNull::No))
            },
            |w| {
                types::int4_to_sql(10, w);
                Ok(types::RangeBound::Exclusive(IsNull::No))
            },
            &mut buf,
        )
        .unwrap();

        let r = PgRangeString::from_sql(&PgType::INT4_RANGE, &buf).unwrap();
        assert_eq!(r.0, "[1,10)");
    }

    #[test]
    fn pg_multirange_decodes_to_string() {
        let mut r1 = BytesMut::new();
        types::range_to_sql(
            |w| {
                types::int4_to_sql(1, w);
                Ok(types::RangeBound::Inclusive(IsNull::No))
            },
            |w| {
                types::int4_to_sql(10, w);
                Ok(types::RangeBound::Exclusive(IsNull::No))
            },
            &mut r1,
        )
        .unwrap();

        let mut r2 = BytesMut::new();
        types::range_to_sql(
            |w| {
                types::int4_to_sql(20, w);
                Ok(types::RangeBound::Inclusive(IsNull::No))
            },
            |w| {
                types::int4_to_sql(30, w);
                Ok(types::RangeBound::Exclusive(IsNull::No))
            },
            &mut r2,
        )
        .unwrap();

        let mut raw = Vec::new();
        raw.extend_from_slice(&(2_i32).to_be_bytes());
        raw.extend_from_slice(&(r1.len() as i32).to_be_bytes());
        raw.extend_from_slice(&r1);
        raw.extend_from_slice(&(r2.len() as i32).to_be_bytes());
        raw.extend_from_slice(&r2);

        let mr = PgMultirangeString::from_sql(&PgType::INT4MULTI_RANGE, &raw).unwrap();
        assert_eq!(mr.0, "{[1,10),[20,30)}");
    }
}
