export type CsvParseOptions = {
  delimiter?: string;
  quote?: string;
  hasHeader?: boolean;
};

export function parseCsv(text: string, opts: CsvParseOptions = {}) {
  const delimiter = opts.delimiter ?? ',';
  const quote = opts.quote ?? '"';
  const hasHeader = opts.hasHeader ?? true;

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const pushRow = () => {
    // ignore trailing empty line
    if (row.length === 1 && row[0] === '' && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = i + 1 < text.length ? text[i + 1] : '';

    if (inQuotes) {
      if (ch === quote && next === quote) {
        field += quote;
        i++;
        continue;
      }
      if (ch === quote) {
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }

    if (ch === quote) {
      inQuotes = true;
      continue;
    }

    if (ch === delimiter) {
      pushField();
      continue;
    }

    if (ch === '\n') {
      pushField();
      pushRow();
      continue;
    }

    if (ch === '\r') {
      // handle CRLF
      if (next === '\n') continue;
      pushField();
      pushRow();
      continue;
    }

    field += ch;
  }

  pushField();
  if (row.length > 1 || row[0] !== '') pushRow();

  if (!hasHeader) {
    return { columns: rows[0]?.map((_, i) => `column_${i}`) ?? [], rows };
  }

  const header = rows.shift() ?? [];
  const columns = header.map((h, idx) => (h && h.trim() ? h.trim() : `column_${idx}`));
  return { columns, rows };
}

