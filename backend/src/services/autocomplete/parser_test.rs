// Test case for schema.table autocomplete
// SQL: "select id, from payment.invoice_items;"
// Cursor at position after comma and space

use crate::services::autocomplete::parser::AutocompleteParser;

#[test]
fn test_schema_table_alias_extraction() {
    let sql = "select id, from payment.invoice_items;";
    let cursor_pos = 11; // After "select id, "

    let result = AutocompleteParser::parse(sql, cursor_pos);

    println!("Context: {:?}", result.context);
    println!("Aliases: {:?}", result.aliases);
    println!("Current token: {:?}", result.current_token);

    // Should extract: invoice_items -> payment.invoice_items
    assert!(result.aliases.contains_key("invoice_items"));
    assert_eq!(
        result.aliases.get("invoice_items"),
        Some(&"payment.invoice_items".to_string())
    );
}

#[test]
fn test_simple_table_alias_extraction() {
    let sql = "select id, from users;";
    let cursor_pos = 11; // After "select id, "

    let result = AutocompleteParser::parse(sql, cursor_pos);

    println!("Context: {:?}", result.context);
    println!("Aliases: {:?}", result.aliases);

    // Should extract: users -> users
    assert!(result.aliases.contains_key("users"));
    assert_eq!(result.aliases.get("users"), Some(&"users".to_string()));
}

#[test]
fn test_explicit_alias() {
    let sql = "select id, from payment.invoice_items ii;";
    let cursor_pos = 11; // After "select id, "

    let result = AutocompleteParser::parse(sql, cursor_pos);

    println!("Context: {:?}", result.context);
    println!("Aliases: {:?}", result.aliases);

    // Should extract: ii -> payment.invoice_items
    assert!(result.aliases.contains_key("ii"));
    assert_eq!(
        result.aliases.get("ii"),
        Some(&"payment.invoice_items".to_string())
    );
}
