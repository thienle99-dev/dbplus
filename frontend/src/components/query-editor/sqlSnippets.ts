import { snippetCompletion } from '@codemirror/autocomplete';

// Enhanced SQL Snippets with all JOIN types and common patterns
export const sqlSnippets = [
  // SELECT snippets
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
  snippetCompletion("SELECT DISTINCT ${column} FROM ${table}", {
    label: "seld",
    detail: "SELECT DISTINCT ...",
    type: "keyword",
  }),
  
  // INSERT/UPDATE/DELETE snippets
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
  
  // JOIN snippets - all types
  snippetCompletion("JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "join",
    detail: "JOIN ... ON ...",
    type: "keyword",
  }),
  snippetCompletion("INNER JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "ijoin",
    detail: "INNER JOIN ...",
    type: "keyword",
  }),
  snippetCompletion("LEFT JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "ljoin",
    detail: "LEFT JOIN ...",
    type: "keyword",
  }),
  snippetCompletion(
    "LEFT OUTER JOIN ${table} ON ${t1}.${col} = ${table}.${col}",
    {
      label: "lojoin",
      detail: "LEFT OUTER JOIN ...",
      type: "keyword",
    }
  ),
  snippetCompletion("RIGHT JOIN ${table} ON ${t1}.${col} = ${table}.${col}", {
    label: "rjoin",
    detail: "RIGHT JOIN ...",
    type: "keyword",
  }),
  snippetCompletion(
    "RIGHT OUTER JOIN ${table} ON ${t1}.${col} = ${table}.${col}",
    {
      label: "rojoin",
      detail: "RIGHT OUTER JOIN ...",
      type: "keyword",
    }
  ),
  snippetCompletion(
    "FULL OUTER JOIN ${table} ON ${t1}.${col} = ${table}.${col}",
    {
      label: "fojoin",
      detail: "FULL OUTER JOIN ...",
      type: "keyword",
    }
  ),
  
  // WHERE/HAVING snippets
  snippetCompletion("WHERE ${condition}", {
    label: "wh",
    detail: "WHERE ...",
    type: "keyword",
  }),
  snippetCompletion("HAVING ${condition}", {
    label: "hav",
    detail: "HAVING ...",
    type: "keyword",
  }),
  
  // Aggregate functions
  snippetCompletion("COUNT(*)", {
    label: "count",
    detail: "COUNT(*)",
    type: "function",
  }),
  snippetCompletion("SUM(${column})", {
    label: "sum",
    detail: "SUM(column)",
    type: "function",
  }),
  snippetCompletion("AVG(${column})", {
    label: "avg",
    detail: "AVG(column)",
    type: "function",
  }),
  snippetCompletion("MIN(${column})", {
    label: "min",
    detail: "MIN(column)",
    type: "function",
  }),
  snippetCompletion("MAX(${column})", {
    label: "max",
    detail: "MAX(column)",
    type: "function",
  }),
  
  // ORDER BY/GROUP BY snippets
  snippetCompletion("ORDER BY ${col} DESC", {
    label: "ord",
    detail: "ORDER BY ...",
    type: "keyword",
  }),
  snippetCompletion("ORDER BY ${col} ASC", {
    label: "orda",
    detail: "ORDER BY ... ASC",
    type: "keyword",
  }),
  snippetCompletion("GROUP BY ${col}", {
    label: "grp",
    detail: "GROUP BY ...",
    type: "keyword",
  }),
  
  // LIMIT/OFFSET snippets
  snippetCompletion("LIMIT ${count}", {
    label: "lim",
    detail: "LIMIT ...",
    type: "keyword",
  }),
  snippetCompletion("LIMIT ${count} OFFSET ${offset}", {
    label: "limoff",
    detail: "LIMIT ... OFFSET ...",
    type: "keyword",
  }),
];
