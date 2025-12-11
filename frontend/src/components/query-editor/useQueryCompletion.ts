import { useState, useEffect, useCallback, useMemo } from 'react';
import { CompletionContext, completeFromList, snippetCompletion } from '@codemirror/autocomplete';
import { sql } from '@codemirror/lang-sql';
import { EditorState } from '@codemirror/state';
import { oneDark } from '@codemirror/theme-one-dark';
import { connectionApi } from '../../services/connectionApi';
import { ForeignKey } from '../../types';
import { transparentTheme, autocompleteTheme } from '../../themes/codemirror-dynamic';
import { light as lightTheme } from '../../themes/codemirror-light';

// Define SQL Snippets (moved from QueryEditor.tsx)
const sqlSnippets = [
    snippetCompletion("SELECT * FROM ${}", {
        label: "sfw",
        detail: "SELECT * FROM table",
        type: "keyword"
    }),
    snippetCompletion("SELECT ${column} FROM ${table}", {
        label: "sel",
        detail: "SELECT col FROM table",
        type: "keyword"
    }),
    snippetCompletion("INSERT INTO ${table} (${columns}) VALUES (${values});", {
        label: "ins",
        detail: "INSERT INTO ...",
        type: "keyword"
    }),
    snippetCompletion("UPDATE ${table} SET ${col} = ${val} WHERE ${condition};", {
        label: "upd",
        detail: "UPDATE ...",
        type: "keyword"
    }),
    snippetCompletion("DELETE FROM ${table} WHERE ${condition};", {
        label: "del",
        detail: "DELETE ...",
        type: "keyword"
    }),
    snippetCompletion("JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
        label: "join",
        detail: "JOIN ... ON ...",
        type: "keyword"
    }),
    snippetCompletion("LEFT JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
        label: "ljoin",
        detail: "LEFT JOIN ...",
        type: "keyword"
    }),
    snippetCompletion("COUNT(*)", {
        label: "count",
        detail: "COUNT(*)",
        type: "function"
    }),
    snippetCompletion("ORDER BY ${col} DESC", {
        label: "ord",
        detail: "ORDER BY ...",
        type: "keyword"
    }),
    snippetCompletion("GROUP BY ${col}", {
        label: "grp",
        detail: "GROUP BY ...",
        type: "keyword"
    }),
];

interface UseQueryCompletionProps {
    connectionId?: string;
    theme?: string; // Expect a theme name string now
}

export function useQueryCompletion({ connectionId, theme }: UseQueryCompletionProps) {
    const [schemaCompletion, setSchemaCompletion] = useState<Record<string, any> | undefined>(undefined);
    const [foreignKeys, setForeignKeys] = useState<Record<string, ForeignKey[]>>({});

    // Fetch schema metadata for autocomplete
    useEffect(() => {
        if (!connectionId) return;
        const fetchMeta = async () => {
            let schemas: string[] = [];
            try {
                schemas = await connectionApi.getSchemas(connectionId);
            } catch (e) {
                console.warn('Failed to fetch schemas, falling back to defaults', e);
            }

            if (schemas.length === 0) {
                schemas = ['public', 'main'];
            }

            const schemaConfig: Record<string, any> = {};
            const fkMap: Record<string, ForeignKey[]> = {};

            await Promise.all(schemas.map(async (schemaName) => {
                try {
                    const meta = await connectionApi.getSchemaMetadata(connectionId, schemaName);
                    if (meta && meta.length > 0) {
                        meta.forEach(m => {
                            // 1. Unqualified match (users -> [cols])
                            if (!schemaConfig[m.table_name]) {
                                schemaConfig[m.table_name] = m.columns;
                            }
                            // 2. Qualified match (public.users -> [cols])
                            schemaConfig[`${schemaName}.${m.table_name}`] = m.columns;
                        });

                        // Fetch constraints for tables
                        await Promise.all(meta.map(async (m) => {
                            try {
                                const constraints = await connectionApi.getTableConstraints(connectionId, schemaName, m.table_name);
                                if (constraints.foreign_keys && constraints.foreign_keys.length > 0) {
                                    const fks = constraints.foreign_keys;
                                    if (!fkMap[m.table_name]) {
                                        fkMap[m.table_name] = fks;
                                    }
                                    fkMap[`${schemaName}.${m.table_name}`] = fks;
                                }
                            } catch (e) {
                                // Ignore failure for specific table
                            }
                        }));
                    }
                } catch (e) {
                    // Ignore failures for individual schemas
                }
            }));

            setForeignKeys(fkMap);
            setSchemaCompletion(schemaConfig);
        };
        fetchMeta();
    }, [connectionId]);

    const getTablesInQuery = useCallback((doc: string, currentPos: number) => {
        const tables: { name: string; alias?: string }[] = [];
        const tableRegex = /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_.]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
        let match;
        while ((match = tableRegex.exec(doc)) !== null) {
            if (match.index < currentPos) {
                tables.push({ name: match[1], alias: match[2] });
            }
        }
        return tables;
    }, []);

    const joinCompletionSource = useCallback((context: CompletionContext) => {
        const word = context.matchBefore(/JOIN\s+\w*/i);
        const afterJoinSpace = context.matchBefore(/JOIN\s+/i);

        if (!word && !afterJoinSpace) return null;

        const wordText = word ? word.text : '';

        const doc = context.state.doc.toString();
        const tablesInQuery = getTablesInQuery(doc, context.pos);

        if (tablesInQuery.length === 0) return null;

        const options: any[] = [];
        const seen = new Set<string>();

        tablesInQuery.forEach(({ name: sourceTable, alias: sourceAlias }) => {
            // Outgoing FKs
            const outgoing = foreignKeys[sourceTable] || [];
            outgoing.forEach(fk => {
                const targetTable = fk.foreign_table;
                const label = targetTable;
                const sourceRef = sourceAlias || sourceTable;
                const apply = `${targetTable} ON ${sourceRef}.${fk.column_name} = ${targetTable}.${fk.foreign_column}`;

                if (!seen.has(apply)) {
                    seen.add(apply);
                    options.push({
                        label: label,
                        detail: `ON ${sourceRef}.${fk.column_name} = ${fk.foreign_column}`,
                        apply: apply,
                        type: 'class'
                    });
                }
            });

            // Incoming FKs
            Object.entries(foreignKeys).forEach(([tableName, fks]) => {
                fks.forEach(fk => {
                    if (fk.foreign_table === sourceTable) {
                        const targetTable = tableName;
                        const sourceRef = sourceAlias || sourceTable;
                        const apply = `${targetTable} ON ${targetTable}.${fk.column_name} = ${sourceRef}.${fk.foreign_column}`;
                        if (!seen.has(apply)) {
                            seen.add(apply);
                            options.push({
                                label: targetTable,
                                detail: `(<-) ON ... = ${sourceRef}.${fk.foreign_column}`,
                                apply: apply,
                                type: 'class'
                            });
                        }
                    }
                });
            });
        });

        return {
            from: word ? word.from + (wordText.match(/JOIN\s+/i)?.[0].length || 0) : context.pos,
            options
        };

    }, [foreignKeys, getTablesInQuery]);

    const aliasCompletionSource = useCallback((context: CompletionContext) => {
        const word = context.matchBefore(/([a-zA-Z0-9_]+)\.\w*/);
        if (!word) return null;

        const match = word.text.match(/^([a-zA-Z0-9_]+)\./);
        if (!match) return null;

        const alias = match[1];

        const doc = context.state.doc.toString();
        const tables = getTablesInQuery(doc, context.pos);

        const tableInfo = tables.find(t => t.alias === alias || t.name === alias);

        if (!tableInfo) return null;

        const columns = schemaCompletion?.[tableInfo.name];
        if (!columns) return null;

        const options = columns.map((col: string) => ({
            label: col,
            type: 'property'
        }));

        return {
            from: word.from + alias.length + 1,
            options
        };
    }, [schemaCompletion, getTablesInQuery]);

    const columnCompletionSource = useCallback((context: CompletionContext) => {
        // Trigger only if we are matched a word (not dot)
        // and NOT after a dot (which is handled by aliasCompletionSource)
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from > 0 && context.state.sliceDoc(word.from - 1, word.from) === '.')) {
            return null;
        }

        const doc = context.state.doc.toString();
        const tables = getTablesInQuery(doc, context.pos);

        if (tables.length === 0) return null;

        const options: any[] = [];
        const seen = new Set<string>();

        // Collect columns from all tables in the query
        tables.forEach(t => {
            const cols = schemaCompletion?.[t.name] || [];
            cols.forEach((col: string) => {
                if (!seen.has(col)) {
                    seen.add(col);
                    options.push({
                        label: col,
                        type: 'property',
                        detail: t.alias || t.name, // Show source table
                        boost: 1 // Boost rank
                    });
                }
            });
        });

        if (options.length === 0) return null;

        return {
            from: word.from,
            options
        };
    }, [schemaCompletion, getTablesInQuery]);

    const codeMirrorTheme = useMemo(() => {
        let effectiveTheme = theme;
        if (theme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }

        const isDarkTheme = effectiveTheme === 'dark' ||
            effectiveTheme === 'midnight' ||
            effectiveTheme === 'soft-pink' ||
            effectiveTheme?.startsWith('wibu') ||
            effectiveTheme?.startsWith('gruvbox-dark');

        return isDarkTheme ? oneDark : lightTheme;
    }, [theme]);

    const extensions = useMemo(() => [
        sql({ schema: schemaCompletion }),
        ...(codeMirrorTheme ? [codeMirrorTheme] : []),
        transparentTheme,
        autocompleteTheme,
        EditorState.languageData.of(() => [{
            autocomplete: completeFromList(sqlSnippets)
        }, {
            autocomplete: joinCompletionSource
        }, {
            autocomplete: aliasCompletionSource
        }, {
            autocomplete: columnCompletionSource
        }])
    ], [codeMirrorTheme, schemaCompletion, joinCompletionSource, aliasCompletionSource, columnCompletionSource]);

    return {
        extensions,
        schemaCompletion
    };
}
