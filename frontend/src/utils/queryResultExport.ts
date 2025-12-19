export type DelimitedTextOptions = {
  delimiter: string;
  quote: string;
  includeHeader: boolean;
  nullValue: string;
  includeBom: boolean;
};

export const DEFAULT_CSV_OPTIONS: DelimitedTextOptions = {
  delimiter: ',',
  quote: '"',
  includeHeader: true,
  nullValue: '',
  includeBom: false,
};

export const EXCEL_CSV_OPTIONS: DelimitedTextOptions = {
  ...DEFAULT_CSV_OPTIONS,
  includeBom: true,
};

function sanitizeFilenamePart(input: string) {
  return input
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function buildExportFilename(parts: string[], ext: string) {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const safeParts = [...parts, timestamp].filter(Boolean).map(sanitizeFilenamePart).filter(Boolean);
  const base = safeParts.length ? safeParts.join('_') : `query_results_${timestamp}`;
  const safeExt = ext.startsWith('.') ? ext : `.${ext}`;
  return `${base}${safeExt}`;
}

function escapeForDelimited(value: string, delimiter: string, quote: string) {
  const needsQuotes = value.includes(delimiter) || value.includes(quote) || value.includes('\n') || value.includes('\r');
  const escaped = value.split(quote).join(quote + quote);
  return needsQuotes ? `${quote}${escaped}${quote}` : value;
}

export function toDelimitedText(columns: string[], rows: any[][], opts: DelimitedTextOptions) {
  const header = opts.includeHeader
    ? `${columns.map((c) => escapeForDelimited(String(c ?? ''), opts.delimiter, opts.quote)).join(opts.delimiter)}\n`
    : '';

  const body = rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return opts.nullValue;
          return escapeForDelimited(String(cell), opts.delimiter, opts.quote);
        })
        .join(opts.delimiter)
    )
    .join('\n');

  const content = header + body;
  return opts.includeBom ? `\ufeff${content}` : content;
}

export function toJsonObjects(columns: string[], rows: any[][], pretty = true) {
  const data = rows.map((row) => {
    const obj: Record<string, any> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
  return JSON.stringify(data, null, pretty ? 2 : 0);
}

export function toJsonRows(columns: string[], rows: any[][], pretty = true) {
  return JSON.stringify({ columns, rows }, null, pretty ? 2 : 0);
}


function sqlLiteral(value: any): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : `'${String(value).replace(/'/g, "''")}'`;
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return `'${value.toISOString().replace(/'/g, "''")}'`;
  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function toInsertStatements(params: {
  schema?: string | null;
  table: string;
  columns: string[];
  rows: any[][];
  isCouchbase?: boolean;
}) {
  const quote = (s: string) => params.isCouchbase ? `\`${s.replace(/`/g, '``')}\`` : `"${s.replace(/"/g, '""')}"`;
  const schemaPrefix = params.schema ? `${quote(params.schema)}.` : '';
  const tableRef = `${schemaPrefix}${quote(params.table)}`;
  const cols = params.columns.map(quote).join(', ');

  return params.rows
    .map((row) => {
      const values = row.map(sqlLiteral).join(', ');
      return `INSERT INTO ${tableRef} (${cols}) VALUES (${values});`;
    })
    .join('\n');
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function toExcelHtmlTable(columns: string[], rows: any[][], sheetName = 'Results') {
  const headerRow = `<tr>${columns.map((c) => `<th>${escapeHtml(String(c ?? ''))}</th>`).join('')}</tr>`;
  const bodyRows = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ''))}</td>`).join('')}</tr>`)
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="generator" content="dbplus" />
    <title>${escapeHtml(sheetName)}</title>
    <style>
      table { border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 4px 6px; }
      th { background: #f5f5f5; font-weight: 600; }
    </style>
  </head>
  <body>
    <table>
      <thead>${headerRow}</thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </body>
</html>`;
}

export function downloadTextFile(text: string, filename: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
