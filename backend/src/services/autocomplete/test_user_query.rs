use crate::services::autocomplete::parser::{AutocompleteParser, CursorContext};

#[test]
fn test_user_referrals_query() {
    let sql = "select id,  from account.user_referrals;";

    // Test 1: Cursor after "select id, " (which is position 11 if there are 2 spaces)
    let cursor_pos = 11;
    let result = AutocompleteParser::parse(sql, cursor_pos);

    println!("\n=== TEST: User Referrals Query ===");
    println!("SQL: '{}'", sql);
    println!("Cursor: {} (after 'select id, ')", cursor_pos);
    println!("Context: {:?}", result.context);
    println!("Aliases: {:?}", result.aliases);
    println!("Current token: {:?}", result.current_token);
    println!("===================================\n");

    // Assertions
    assert_eq!(
        result.context,
        CursorContext::Select,
        "Should be Select context"
    );
    assert!(!result.aliases.is_empty(), "Should have aliases");
    assert!(
        result.aliases.contains_key("user_referrals"),
        "Should have user_referrals alias"
    );

    let table_ref = result.aliases.get("user_referrals").unwrap();
    assert_eq!(
        table_ref, "account.user_referrals",
        "Should have full schema.table"
    );
}

#[test]
fn test_cursor_after_comma() {
    let sql = "select id, from account.user_referrals;";
    let cursor_pos = 11; // After "select id, "

    let result = AutocompleteParser::parse(sql, cursor_pos);

    println!("\n=== TEST: Cursor After Comma ===");
    println!("SQL: '{}'", sql);
    println!("Cursor: {} (after comma)", cursor_pos);
    println!("Context: {:?}", result.context);
    println!("Aliases: {:?}", result.aliases);
    println!("================================\n");

    assert_eq!(result.context, CursorContext::Select);
    assert!(result.aliases.contains_key("user_referrals"));
}
