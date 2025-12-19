# Column Autocomplete Optimization

## Problem

Column autocomplete was not working when tables were referenced without explicit aliases in FROM/JOIN clauses.

For example:

```sql
SELECT * FROM users WHERE
```

Would not suggest columns from the `users` table.

## Root Cause

The parser was only extracting table aliases when an explicit alias was provided:

- `FROM users u` ✅ Would work (alias: u → users)
- `FROM users` ❌ Would NOT work (no entry in aliases map)

## Solution

### 1. Parser Fix (parser.rs)

Modified the `analyze_structure` function to automatically use the table name as an alias when no explicit alias is provided:

```rust
// If no alias found, use the table name itself as the alias
let final_alias = if let Some(a) = alias {
    a
} else {
    // Extract just the table name (without schema) for the alias
    if table_ref.contains('.') {
        table_ref.split('.').last().unwrap_or(&table_ref).to_string()
    } else {
        table_ref.clone()
    }
};

if !table_ref.is_empty() {
    aliases.insert(final_alias, table_ref);
}
```

### 2. Debug Logging (engine.rs)

Added comprehensive debug logging to help troubleshoot autocomplete issues:

- Logs all extracted aliases
- Logs each table being queried for columns
- Logs the number of columns found
- Warns when column fetching fails

## Examples

### Before Fix

```sql
SELECT * FROM users WHERE u  -- ❌ No suggestions
SELECT * FROM public.posts   -- ❌ No suggestions
```

### After Fix

```sql
SELECT * FROM users WHERE u  -- ✅ Suggests: users.id, users.name, users.email, etc.
SELECT * FROM public.posts   -- ✅ Suggests: posts.id, posts.title, posts.content, etc.
SELECT * FROM users u WHERE  -- ✅ Still works with explicit alias
```

## Testing

To verify the fix:

1. Open a SQL editor
2. Type: `SELECT * FROM <table_name> WHERE `
3. Start typing a column name
4. Autocomplete should now show columns from the table

## Additional Improvements

- Column suggestions show as `table.column` in the label for clarity
- Insert text is just the column name (without table prefix)
- Columns from FROM/JOIN tables have high priority (score: 800)
- Qualified columns (e.g., `u.id`) have highest priority (score: 1000)
