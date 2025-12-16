/**
 * Placeholder syntax: {{variable_name}}
 */
export const PLACEHOLDER_REGEX = /\{\{(\w+)\}\}/g;

/**
 * Extract placeholder names from SQL query
 */
export function extractPlaceholders(sql: string): string[] {
    const matches = sql.matchAll(PLACEHOLDER_REGEX);
    const placeholders = new Set<string>();
    
    for (const match of matches) {
        placeholders.add(match[1]);
    }
    
    return Array.from(placeholders);
}

/**
 * Replace placeholders with actual values
 */
export function replacePlaceholders(
    sql: string,
    values: Record<string, any>
): string {
    return sql.replace(PLACEHOLDER_REGEX, (_match, varName) => {
        const value = values[varName];
        
        if (value === undefined || value === null) {
            return 'NULL';
        }
        
        // Handle different types
        if (typeof value === 'string') {
            // Escape single quotes
            return `'${value.replace(/'/g, "''")}'`;
        }
        
        if (typeof value === 'boolean') {
            return value ? 'TRUE' : 'FALSE';
        }
        
        if (typeof value === 'number') {
            return String(value);
        }
        
        // Date or other types - convert to string
        return `'${String(value).replace(/'/g, "''")}'`;
    });
}

/**
 * Check if SQL contains any placeholders
 */
export function hasPlaceholders(sql: string): boolean {
    return PLACEHOLDER_REGEX.test(sql);
}
