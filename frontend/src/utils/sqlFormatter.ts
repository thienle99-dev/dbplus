import { format } from 'sql-formatter';
import type { AppSettings } from '../store/settingsStore';

export interface FormatOptions {
    dialect?: 'postgresql' | 'mysql' | 'sqlite' | 'sql';
    keywordCase?: 'upper' | 'lower' | 'preserve';
    indentStyle?: 'spaces' | 'tabs';
    indentSize?: number;
}

/**
 * Format SQL query using sql-formatter library
 */
export function formatSQL(sql: string, options?: FormatOptions): string {
    if (!sql || !sql.trim()) {
        return sql;
    }

    try {
        const formatted = format(sql, {
            language: options?.dialect || 'postgresql',
            keywordCase: options?.keywordCase || 'upper',
            indentStyle: 'standard',
            tabWidth: options?.indentSize || 2,
            useTabs: options?.indentStyle === 'tabs',
            linesBetweenQueries: 2,
        });

        return formatted;
    } catch (error) {
        console.error('SQL formatting error:', error);
        // Return original SQL if formatting fails
        return sql;
    }
}

/**
 * Format SQL using settings from store
 */
export function formatSQLWithSettings(sql: string, settings: AppSettings): string {
    return formatSQL(sql, {
        dialect: settings.formatDialect,
        keywordCase: settings.formatKeywordCase,
        indentStyle: settings.formatIndentStyle,
        indentSize: settings.formatIndentSize,
    });
}

/**
 * Check if SQL is already formatted
 */
export function isFormatted(sql: string, options?: FormatOptions): boolean {
    if (!sql || !sql.trim()) {
        return true;
    }

    try {
        const formatted = formatSQL(sql, options);
        return sql.trim() === formatted.trim();
    } catch {
        return false;
    }
}
