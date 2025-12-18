import { CompletionContext } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";

export const N1QL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY',
    'LIMIT', 'OFFSET', 'LET', 'LETTING', 'UNNEST',
    'INSERT', 'UPDATE', 'DELETE', 'UPSERT',
    'CREATE INDEX', 'DROP INDEX', 'EXPLAIN',
    'USE KEYS', 'USE INDEX', 'NEST', 'ARRAY',
    'JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN',
    'ON', 'AS', 'VALUES', 'RETURNING',
    'PRIMARY KEY', 'KEY',
    'CREATE SCOPE', 'DROP SCOPE', 'CREATE COLLECTION', 'DROP COLLECTION'
];

export const N1QL_FUNCTIONS = [
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
    'ARRAY_LENGTH', 'ARRAY_CONTAINS', 'ARRAY_AGG', 'ARRAY_APPEND', 'ARRAY_PREPEND',
    'META', 'UUID', 'NOW', 'STR_TO_MILLIS', 'MILLIS_TO_STR',
    'DATE_ADD', 'DATE_DIFF', 'DATE_PART', 'DATE_TRUNC',
    'LOWER', 'UPPER', 'LENGTH', 'SUBSTR', 'REPLACE', 'TRIM',
    'TO_NUMBER', 'TO_STRING', 'TO_BOOLEAN',
    'IS_NUMBER', 'IS_STRING', 'IS_BOOLEAN', 'IS_ARRAY', 'IS_OBJECT',
    'MISSING', 'NULL'
];

export async function getN1QLCompletions(
    connectionId: string,
    context: CompletionContext
) {
    const word = context.matchBefore(/\w*/);
    if (!word || (word.from === word.to && !context.explicit)) return null;

    return {
        from: word.from,
        options: [
            ...N1QL_KEYWORDS.map(label => ({ label, type: "keyword" })),
            ...N1QL_FUNCTIONS.map(label => ({ label, type: "function" }))
        ]
    };
}
