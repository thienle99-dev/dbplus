// Quick test to verify parser extracts aliases correctly

#[cfg(test)]
mod quick_test {
    use super::*;

    #[test]
    fn test_current_issue() {
        let sql = "select id, from account.user_referrals;";
        let cursor_pos = 11; // After "select id, "

        let result = AutocompleteParser::parse(sql, cursor_pos);

        println!("\n=== PARSER TEST RESULTS ===");
        println!("SQL: '{}'", sql);
        println!("Cursor position: {}", cursor_pos);
        println!("Context: {:?}", result.context);
        println!("Aliases: {:?}", result.aliases);
        println!("Current token: {:?}", result.current_token);
        println!("Is safe: {}", result.is_safe_location);
        println!("===========================\n");

        // Assertions
        assert_eq!(
            result.context,
            CursorContext::Select,
            "Context should be Select"
        );
        assert!(
            !result.aliases.is_empty(),
            "Should have extracted table alias"
        );
        assert!(
            result.aliases.contains_key("user_referrals"),
            "Should have user_referrals as alias"
        );

        let table_ref = result.aliases.get("user_referrals").unwrap();
        assert_eq!(
            table_ref, "account.user_referrals",
            "Table ref should include schema"
        );
    }
}
