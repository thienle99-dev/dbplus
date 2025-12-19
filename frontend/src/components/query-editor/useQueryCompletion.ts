import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CompletionContext,
  completeFromList,
  snippetCompletion,
  completionKeymap,
  autocompletion,
} from "@codemirror/autocomplete";
import { sql } from "@codemirror/lang-sql";
import { EditorState } from "@codemirror/state";
import { keymap, EditorView, lineNumbers } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentUnit } from "@codemirror/language";
import { connectionApi } from "../../services/connectionApi";
import { ForeignKey } from "../../types";
import {
  transparentTheme,
  autocompleteTheme,
} from "../../themes/codemirror-dynamic";
import { light as lightTheme } from "../../themes/codemirror-light";
import { useSettingsStore } from "../../store/settingsStore";

// Define SQL Snippets (moved from QueryEditor.tsx)
const sqlSnippets = [
  snippetCompletion("SELECT * FROM ${}", {
    label: "sfw",
    detail: "SELECT * FROM table",
    type: "keyword",
  }),
  snippetCompletion("SELECT ${column} FROM ${table}", {
    label: "sel",
    detail: "SELECT col FROM table",
    type: "keyword",
  }),
  snippetCompletion("INSERT INTO ${table} (${columns}) VALUES (${values});", {
    label: "ins",
    detail: "INSERT INTO ...",
    type: "keyword",
  }),
  snippetCompletion("UPDATE ${table} SET ${col} = ${val} WHERE ${condition};", {
    label: "upd",
    detail: "UPDATE ...",
    type: "keyword",
  }),
  snippetCompletion("DELETE FROM ${table} WHERE ${condition};", {
    label: "del",
    detail: "DELETE ...",
    type: "keyword",
  }),
  snippetCompletion("JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "join",
    detail: "JOIN ... ON ...",
    type: "keyword",
  }),
  snippetCompletion("LEFT JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "ljoin",
    detail: "LEFT JOIN ...",
    type: "keyword",
  }),
  snippetCompletion("COUNT(*)", {
    label: "count",
    detail: "COUNT(*)",
    type: "function",
  }),
  snippetCompletion("ORDER BY ${col} DESC", {
    label: "ord",
    detail: "ORDER BY ...",
    type: "keyword",
  }),
  snippetCompletion("GROUP BY ${col}", {
    label: "grp",
    detail: "GROUP BY ...",
    type: "keyword",
  }),
];

interface UseQueryCompletionProps {
  connectionId?: string;
  theme?: string; // Expect a theme name string now
}

export function useQueryCompletion({
  connectionId,
  theme,
}: UseQueryCompletionProps) {
  const [schemaCompletion, setSchemaCompletion] = useState<
    Record<string, any> | undefined
  >(undefined);
  const [foreignKeys, setForeignKeys] = useState<Record<string, ForeignKey[]>>(
    {}
  );
  const [loadingConstraints, setLoadingConstraints] = useState<Set<string>>(
    new Set()
  );

  // Lazy load constraints for a specific table
  const loadConstraintsForTable = useCallback(
    async (schema: string, table: string) => {
      if (!connectionId) return;

      const key = `${schema}.${table}`;

      // Skip if already loaded or loading
      if (foreignKeys[key] || foreignKeys[table] || loadingConstraints.has(key)) {
        return;
      }

      // Mark as loading
      setLoadingConstraints((prev) => new Set(prev).add(key));

      try {
        const constraints = await connectionApi.getTableConstraints(
          connectionId,
          schema,
          table
        );

        if (constraints.foreign_keys && constraints.foreign_keys.length > 0) {
          setForeignKeys((prev) => ({
            ...prev,
            [table]: constraints.foreign_keys,
            [key]: constraints.foreign_keys,
          }));
        }
      } catch (e) {
        console.warn(`Failed to load constraints for ${schema}.${table}`, e);
      } finally {
        setLoadingConstraints((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [connectionId, foreignKeys, loadingConstraints]
  );

  // Fetch schema metadata for autocomplete
  useEffect(() => {
    if (!connectionId) return;

    let isCancelled = false;

    const fetchMeta = async () => {
      let schemas: string[] = [];
      try {
        schemas = await connectionApi.getSchemas(connectionId);
      } catch (e) {
        console.warn("Failed to fetch schemas, falling back to defaults", e);
      }

      if (isCancelled) return;

      if (schemas.length === 0) {
        schemas = ["public", "main"];
      }

      const schemaConfig: Record<string, any> = {};

      await Promise.all(
        schemas.map(async (schemaName) => {
          try {
            const meta = await connectionApi.getSchemaMetadata(
              connectionId,
              schemaName
            );

            if (isCancelled) return;

            if (meta && meta.length > 0) {
              meta.forEach((m) => {
                // 1. Unqualified match (users -> [cols])
                if (!schemaConfig[m.table_name]) {
                  schemaConfig[m.table_name] = m.columns;
                }
                // 2. Qualified match (public.users -> [cols])
                schemaConfig[`${schemaName}.${m.table_name}`] = m.columns;
              });
            }
          } catch (e) {
            // Ignore failures for individual schemas
          }
        })
      );

      if (!isCancelled) {
        setSchemaCompletion(schemaConfig);
      }
    };

    fetchMeta();

    return () => {
      isCancelled = true;
    };
  }, [connectionId]);

  const getTablesInQuery = useCallback((doc: string, currentPos: number) => {
    const tables: { name: string; alias?: string }[] = [];
    const tableRegex =
      /\b(?:FROM|JOIN)\s+([a-zA-Z0-9_.]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    let match;
    while ((match = tableRegex.exec(doc)) !== null) {
      if (match.index < currentPos) {
        tables.push({ name: match[1], alias: match[2] });
      }
    }
    return tables;
  }, []);

  const fromCompletionSource = useCallback((context: CompletionContext) => {
      // Match FROM pattern
      const fromPattern = context.matchBefore(/\bFROM\s+\w*/i);
      const afterFromSpace = context.matchBefore(/\bFROM\s+/i);

      if (!fromPattern && !afterFromSpace) return null;

      if (!schemaCompletion) return null;

      const options: any[] = [];
      const seen = new Set<string>();

      // Build a map of unqualified -> qualified names
      const qualifiedMap = new Map<string, string>();
      Object.keys(schemaCompletion).forEach((key) => {
        if (key.includes(".")) {
          const tableName = key.split(".")[1];
          if (!qualifiedMap.has(tableName)) {
            qualifiedMap.set(tableName, key);
          }
        }
      });

      // Get all table entries from schemaCompletion
      Object.keys(schemaCompletion).forEach((key) => {
        if (key.includes(".")) {
          // Qualified name (e.g., "public.users")
          const [schema] = key.split(".");
          
          if (!seen.has(key)) {
            seen.add(key);
            options.push({
              label: key,
              detail: `Table in ${schema}`,
              apply: key,
              type: "class",
              boost: 6, // Higher priority for qualified names
            });
          }
        } else {
          // Unqualified name (e.g., "users")
          // Find the qualified version and use it for apply
          const qualifiedName = qualifiedMap.get(key) || key;
          const schema = qualifiedName.includes(".") ? qualifiedName.split(".")[0] : null;
          
          if (!seen.has(key)) {
            seen.add(key);
            options.push({
              label: key,
              detail: schema ? `Table (→ ${qualifiedName})` : "Table",
              apply: qualifiedName, // Apply qualified name
              type: "class",
              boost: 5,
            });
          }
        }
      });



      const wordText = fromPattern ? fromPattern.text : "";
      const fromKeywordMatch = wordText.match(/\bFROM\s+/i);

      return {
        from: fromPattern
          ? fromPattern.from + (fromKeywordMatch?.[0].length || 0)
          : context.pos,
        options,
      };
    },
    [schemaCompletion]
  );

  const joinCompletionSource = useCallback(
    (context: CompletionContext) => {
      // Match various JOIN patterns
      const joinPattern = context.matchBefore(
        /(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\s+\w*/i
      );
      const afterJoinSpace = context.matchBefore(
        /(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\s+/i
      );

      if (!joinPattern && !afterJoinSpace) return null;

      const wordText = joinPattern ? joinPattern.text : "";

      const doc = context.state.doc.toString();
      const tablesInQuery = getTablesInQuery(doc, context.pos);

      if (!schemaCompletion) return null;

      const allTables = Object.keys(schemaCompletion).filter(
        (key) => !key.includes(".")
      );

      // Lazy load constraints for tables in query
      tablesInQuery.forEach(({ name }) => {
        // Try to infer schema from qualified name or use 'public' as default
        const schema = name.includes(".") ? name.split(".")[0] : "public";
        const tableName = name.includes(".") ? name.split(".")[1] : name;
        loadConstraintsForTable(schema, tableName);
      });

      // If no tables in query yet, suggest all available tables
      if (tablesInQuery.length === 0) {
        const options = allTables.map((table) => ({
          label: table,
          detail: "Table",
          apply: table,
          type: "class",
          boost: 0,
        }));

        return {
          from: joinPattern
            ? joinPattern.from +
            (wordText.match(
              /(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\s+/i
            )?.[0].length || 0)
            : context.pos,
          options,
        };
      }

      const options: any[] = [];
      const seen = new Set<string>();

      // Add FK-aware suggestions
      tablesInQuery.forEach(({ name: sourceTable, alias: sourceAlias }) => {
        // Outgoing FKs (this table references others)
        const outgoing = foreignKeys[sourceTable] || [];
        outgoing.forEach((fk) => {
          const targetTable = fk.foreign_table;
          const label = targetTable;
          const sourceRef = sourceAlias || sourceTable;
          const apply = `${targetTable} ON ${sourceRef}.${fk.column_name} = ${targetTable}.${fk.foreign_column}`;

          if (!seen.has(apply)) {
            seen.add(apply);
            options.push({
              label: label,
              detail: `→ ON ${sourceRef}.${fk.column_name} = ${fk.foreign_column}`,
              apply: apply,
              type: "class",
              boost: 10, // High priority for FK relationships
            });
          }
        });

        // Incoming FKs (other tables reference this table)
        Object.entries(foreignKeys).forEach(([tableName, fks]) => {
          fks.forEach((fk) => {
            if (fk.foreign_table === sourceTable) {
              const targetTable = tableName;
              const sourceRef = sourceAlias || sourceTable;
              const apply = `${targetTable} ON ${targetTable}.${fk.column_name} = ${sourceRef}.${fk.foreign_column}`;
              if (!seen.has(apply)) {
                seen.add(apply);
                options.push({
                  label: targetTable,
                  detail: `← ON ${fk.column_name} = ${sourceRef}.${fk.foreign_column}`,
                  apply: apply,
                  type: "class",
                  boost: 9, // Slightly lower priority than outgoing
                });
              }
            }
          });
        });
      });

      // Add all other tables as fallback (without FK relationships)
      const tablesInQueryNames = new Set(tablesInQuery.map((t) => t.name));
      allTables
        .filter((table) => !tablesInQueryNames.has(table))
        .forEach((table) => {
          const label = table;
          const apply = table;
          if (!seen.has(apply)) {
            seen.add(apply);
            options.push({
              label: label,
              detail: options.length > 0 ? "Table (no FK)" : "Table",
              apply: apply,
              type: "class",
              boost: 0, // Lower priority
            });
          }
        });

      return {
        from: joinPattern
          ? joinPattern.from +
          (wordText.match(
            /(INNER\s+JOIN|LEFT\s+(?:OUTER\s+)?JOIN|RIGHT\s+(?:OUTER\s+)?JOIN|FULL\s+(?:OUTER\s+)?JOIN|JOIN)\s+/i
          )?.[0].length || 0)
          : context.pos,
        options,
      };
    },
    [getTablesInQuery, schemaCompletion, foreignKeys, loadConstraintsForTable]
  );

  const aliasCompletionSource = useCallback(
    (context: CompletionContext) => {
      const word = context.matchBefore(/([a-zA-Z0-9_]+)\.\w*/);
      if (!word) return null;

      const match = word.text.match(/^([a-zA-Z0-9_]+)\./);
      if (!match) return null;

      const alias = match[1];

      const doc = context.state.doc.toString();
      const tables = getTablesInQuery(doc, context.pos);

      const tableInfo = tables.find(
        (t) => t.alias === alias || t.name === alias
      );

      if (!tableInfo) return null;

      const columns = schemaCompletion?.[tableInfo.name];
      if (!columns) return null;

      const options = columns.map((col: string) => ({
        label: col,
        type: "property",
      }));

      return {
        from: word.from + alias.length + 1,
        options,
      };
    },
    [schemaCompletion, getTablesInQuery]
  );

  const columnCompletionSource = useCallback(
    (context: CompletionContext) => {
      // Trigger only if we are matched a word (not dot)
      // and NOT after a dot (which is handled by aliasCompletionSource)
      const word = context.matchBefore(/\w*/);
      if (
        !word ||
        (word.from > 0 &&
          context.state.sliceDoc(word.from - 1, word.from) === ".")
      ) {
        return null;
      }

      const doc = context.state.doc.toString();
      const tables = getTablesInQuery(doc, context.pos);

      if (tables.length === 0) return null;

      // Detect context (SELECT, WHERE, ORDER BY, GROUP BY, etc.)
      const beforeCursor = doc.substring(0, context.pos);
      const isInSelect = /SELECT\s+(?:DISTINCT\s+)?[^FROM]*$/i.test(beforeCursor);
      const isInWhere = /WHERE\s+[^ORDER\s+BY|GROUP\s+BY|LIMIT]*$/i.test(beforeCursor);
      const isInOrderBy = /ORDER\s+BY\s+[^LIMIT]*$/i.test(beforeCursor);
      const isInGroupBy = /GROUP\s+BY\s+[^HAVING|ORDER\s+BY|LIMIT]*$/i.test(beforeCursor);

      const options: any[] = [];
      const seen = new Set<string>();

      // Collect columns from all tables in the query
      tables.forEach((t) => {
        const cols = schemaCompletion?.[t.name] || [];
        const tableDisplay = t.alias || t.name;

        cols.forEach((col: string) => {
          const uniqueKey = `${t.name}.${col}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);

            // Calculate boost based on context
            let boost = 1;
            if (isInSelect) boost = 5; // Higher priority in SELECT
            if (isInWhere && (col.includes("id") || col.includes("_id")))
              boost = 8; // ID columns in WHERE
            if (isInOrderBy) boost = 3;
            if (isInGroupBy) boost = 4; // GROUP BY context

            options.push({
              label: col,
              type: "property",
              detail: `from ${tableDisplay}`, // Show source table
              info: `Table: ${t.name}${t.alias ? ` (${t.alias})` : ""}`, // Additional info
              boost: boost,
            });
          }
        });
      });

      // Add aggregate functions if in SELECT
      if (isInSelect) {
        const aggregates = [
          {
            label: "COUNT(*)",
            type: "function",
            detail: "Aggregate",
            boost: 2,
          },
          { label: "SUM()", type: "function", detail: "Aggregate", boost: 2 },
          { label: "AVG()", type: "function", detail: "Aggregate", boost: 2 },
          { label: "MIN()", type: "function", detail: "Aggregate", boost: 2 },
          { label: "MAX()", type: "function", detail: "Aggregate", boost: 2 },
        ];
        options.push(...aggregates);
      }

      if (options.length === 0) return null;

      return {
        from: word.from,
        options,
      };
    },
    [schemaCompletion, getTablesInQuery]
  );

  const codeMirrorTheme = useMemo(() => {
    let effectiveTheme = theme;
    if (theme === "system") {
      effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const isDarkTheme =
      effectiveTheme === "dark" ||
      effectiveTheme === "midnight" ||
      effectiveTheme === "soft-pink" ||
      effectiveTheme === "macos-dark" ||
      effectiveTheme?.startsWith("wibu") ||
      effectiveTheme?.startsWith("gruvbox-dark");

    return isDarkTheme ? oneDark : lightTheme;
  }, [theme]);

  // Get settings from store
  const {
    editorFontSize,
    tabSize,
    wordWrap,
    lineNumbers: showLineNumbers,
    autoComplete,
  } = useSettingsStore();

  // Create editor settings theme
  const editorSettingsTheme = useMemo(
    () =>
      EditorView.theme({
        "&": {
          fontSize: `${editorFontSize}px`,
        },
        ".cm-scroller": {
          fontFamily: "var(--font-mono, monospace)",
        },
      }),
    [editorFontSize]
  );

  const extensions = useMemo(
    () => [
      sql({ schema: schemaCompletion }),
      ...(codeMirrorTheme ? [codeMirrorTheme] : []),
      transparentTheme,
      autocompleteTheme,
      editorSettingsTheme,
      keymap.of(completionKeymap),
      // Tab size configuration
      indentUnit.of(" ".repeat(tabSize)),
      // Word wrap
      ...(wordWrap ? [EditorView.lineWrapping] : []),
      // Line numbers
      ...(showLineNumbers ? [lineNumbers()] : []),
      // Auto complete
      ...(autoComplete
        ? [
          autocompletion({
            activateOnTyping: true,
            override: [
              completeFromList(sqlSnippets),
              fromCompletionSource,
              joinCompletionSource,
              aliasCompletionSource,
              columnCompletionSource,
            ],
          }),
        ]
        : []),
      // Language data for autocomplete (only if autoComplete is disabled, we still want schema)
      ...(!autoComplete
        ? [
          EditorState.languageData.of(() => [
            {
              autocomplete: completeFromList(sqlSnippets),
            },
            {
              autocomplete: joinCompletionSource,
            },
            {
              autocomplete: aliasCompletionSource,
            },
            {
              autocomplete: columnCompletionSource,
            },
          ]),
        ]
        : []),
    ],
    [
      codeMirrorTheme,
      schemaCompletion,
      editorSettingsTheme,
      tabSize,
      wordWrap,
      showLineNumbers,
      autoComplete,
      joinCompletionSource,
      aliasCompletionSource,
      columnCompletionSource,
    ]
  );

  return {
    extensions,
    schemaCompletion,
  };
}
