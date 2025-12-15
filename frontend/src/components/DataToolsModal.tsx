import { useMemo, useRef, useState } from 'react';
import { Download, Upload, X } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import type { Connection } from '../types';
import { parseCsv } from '../utils/csv';
import { buildExportFilename, downloadTextFile, toDelimitedText, toInsertStatements, toJsonObjects } from '../utils/queryResultExport';
import { extractApiErrorDetails } from '../utils/apiError';

type Mode = 'export' | 'import' | 'backup' | 'restore';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  initialMode: Mode;
  initialExportFormat?: 'csv' | 'json' | 'sql';
  initialImportFormat?: 'csv' | 'json' | 'sql';

  connectionId?: string;
  schema?: string;
  table?: string;

  connections?: Connection[];
};

function quoteIdent(s: string) {
  return `"${s.replace(/"/g, '""')}"`;
}

function tableRef(schema: string | undefined, table: string | undefined) {
  if (!table) return '';
  if (!schema || schema === 'main') return quoteIdent(table);
  return `${quoteIdent(schema)}.${quoteIdent(table)}`;
}

export default function DataToolsModal({
  isOpen,
  onClose,
  initialMode,
  initialExportFormat,
  initialImportFormat,
  connectionId: fixedConnectionId,
  schema: fixedSchema,
  table: fixedTable,
  connections,
}: Props) {
  const { showToast } = useToast();
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);

  const [selectedConnectionId, setSelectedConnectionId] = useState<string>(fixedConnectionId || connections?.[0]?.id || '');
  const connectionId = fixedConnectionId || selectedConnectionId;

  const [schema, setSchema] = useState(fixedSchema || 'public');
  const [table, setTable] = useState(fixedTable || '');
  const [databaseOverride, setDatabaseOverride] = useState<string>('');

  const [exportFormat, setExportFormat] = useState<'csv' | 'json' | 'sql'>(initialExportFormat ?? 'csv');
  const [exportLimit, setExportLimit] = useState<number>(10000);

  const [importFormat, setImportFormat] = useState<'csv' | 'json' | 'sql'>(initialImportFormat ?? 'csv');
  const [truncateFirst, setTruncateFirst] = useState(false);
  const [importFileName, setImportFileName] = useState<string>('');
  const [importPreview, setImportPreview] = useState<{ columns: string[]; rows: any[][] } | null>(null);
  const [importScript, setImportScript] = useState<string>('');

  const canUseTableTools = !!connectionId && !!table;

  const title = useMemo(() => {
    const base = 'Data Tools';
    const t = fixedTable ? ` — ${fixedSchema}.${fixedTable}` : '';
    return base + t;
  }, [fixedSchema, fixedTable]);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!canUseTableTools) return;
    setLoading(true);
    try {
      const sql = `SELECT * FROM ${tableRef(schema, table)}`;
      const { data } = await api.post<any>(`/api/connections/${connectionId}/execute`, {
        query: sql,
        limit: exportLimit,
        offset: 0,
        include_total_count: false,
      });
      const columns: string[] = data.columns || [];
      const rows: any[][] = data.rows || [];
      if (!columns.length) {
        showToast('No rows to export', 'info');
        return;
      }

      if (exportFormat === 'csv') {
        const content = toDelimitedText(columns, rows, {
          delimiter: ',',
          quote: '"',
          includeHeader: true,
          nullValue: '',
          includeBom: false,
        });
        downloadTextFile(content, buildExportFilename([schema, table, 'export'], 'csv'), 'text/csv;charset=utf-8');
        showToast('Exported CSV', 'success');
      } else if (exportFormat === 'json') {
        const content = toJsonObjects(columns, rows, true);
        downloadTextFile(content, buildExportFilename([schema, table, 'export'], 'json'), 'application/json;charset=utf-8');
        showToast('Exported JSON', 'success');
      } else {
        const content = toInsertStatements({ schema, table, columns, rows });
        downloadTextFile(content, buildExportFilename([schema, table, 'export'], 'sql'), 'text/plain;charset=utf-8');
        showToast('Exported SQL (INSERT)', 'success');
      }
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'Export failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const buildImportInsertScript = (columns: string[], rows: any[][]) => {
    const inserts = toInsertStatements({ schema, table, columns, rows });
    const prefix = truncateFirst
      ? schema === 'main'
        ? `DELETE FROM ${tableRef(schema, table)};\n`
        : `TRUNCATE TABLE ${tableRef(schema, table)};\n`
      : '';
    return `${prefix}BEGIN;\n${inserts}\nCOMMIT;\n`;
  };

  const handleChooseImportFile = () => importFileInputRef.current?.click();
  const handleChooseRestoreFile = () => restoreFileInputRef.current?.click();

  const handleFile = async (file: File) => {
    setImportFileName(file.name);
    const text = await file.text();

    if (importFormat === 'sql') {
      setImportPreview(null);
      setImportScript(text);
      return;
    }

    if (importFormat === 'csv') {
      const parsed = parseCsv(text, { hasHeader: true });
      const rows = parsed.rows.map((r) => r.map((v) => (v === '' ? null : v)));
      setImportPreview({ columns: parsed.columns, rows });
      setImportScript(buildImportInsertScript(parsed.columns, rows));
      return;
    }

    // json
    const parsedJson = JSON.parse(text);
    if (Array.isArray(parsedJson)) {
      const keys = Array.from(
        new Set(parsedJson.flatMap((o) => (o && typeof o === 'object' ? Object.keys(o) : [])))
      );
      const rows = parsedJson.map((o) => keys.map((k) => (o && typeof o === 'object' ? (o as any)[k] ?? null : null)));
      setImportPreview({ columns: keys, rows });
      setImportScript(buildImportInsertScript(keys, rows));
      return;
    }

    if (parsedJson && typeof parsedJson === 'object' && Array.isArray((parsedJson as any).columns) && Array.isArray((parsedJson as any).rows)) {
      const columns = (parsedJson as any).columns.map((c: any) => String(c));
      const rows = (parsedJson as any).rows as any[][];
      setImportPreview({ columns, rows });
      setImportScript(buildImportInsertScript(columns, rows));
      return;
    }

    throw new Error('Unsupported JSON shape. Expected array of objects or {columns, rows}.');
  };

  const handleImportRun = async () => {
    if (!canUseTableTools) return;
    if (!importScript.trim()) {
      showToast('No import script to run', 'error');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(
        `/api/connections/${connectionId}/execute-script`,
        { script: importScript },
        databaseOverride ? { headers: { 'x-dbplus-database': databaseOverride } } : undefined
      );
      showToast(`Import completed (${data?.statements_executed ?? 'ok'})`, 'success');
      onClose();
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDownload = async () => {
    if (!connectionId) return;
    setLoading(true);
    try {
      const database = databaseOverride.trim() ? databaseOverride.trim() : undefined;
      const resp = await api.get(`/api/connections/${connectionId}/backup/sql`, {
        params: database ? { database } : undefined,
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = buildExportFilename(['backup', connectionId], 'sql');
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast('Backup downloaded', 'success');
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'Backup failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreSql = async () => {
    if (!connectionId) return;
    if (!importScript.trim()) {
      showToast('Choose a SQL file first', 'error');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post(
        `/api/connections/${connectionId}/execute-script`,
        { script: importScript },
        databaseOverride ? { headers: { 'x-dbplus-database': databaseOverride } } : undefined
      );
      showToast(`Restore completed (${data?.statements_executed ?? 'ok'})`, 'success');
      onClose();
    } catch (err: any) {
      showToast(extractApiErrorDetails(err).message || 'Restore failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-1 rounded-lg shadow-xl w-[720px] max-w-[95vw] max-h-[85vh] border border-border flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-auto">
          {!fixedConnectionId && connections && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-text-secondary w-28">Connection</div>
              <select
                value={selectedConnectionId}
                onChange={(e) => setSelectedConnectionId(e.target.value)}
                className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
              >
                {connections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!fixedConnectionId && (mode === 'backup' || mode === 'restore') && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-text-secondary w-28">Database</div>
              <input
                value={databaseOverride}
                onChange={(e) => setDatabaseOverride(e.target.value)}
                placeholder="(optional) override database"
                className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
              />
            </div>
          )}

          {fixedTable && (
            <div className="flex items-center gap-2">
              <div className="text-xs text-text-secondary w-28">Target table</div>
              <div className="flex-1 text-xs font-mono text-text-primary break-all">
                {fixedSchema}.{fixedTable}
              </div>
            </div>
          )}

          {!fixedTable && (mode === 'export' || mode === 'import') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-secondary w-28">Schema</div>
                <input
                  value={schema}
                  onChange={(e) => setSchema(e.target.value)}
                  className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-secondary w-28">Table</div>
                <input
                  value={table}
                  onChange={(e) => setTable(e.target.value)}
                  className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 border border-border rounded bg-bg-0 p-2">
            {(['export', 'import', 'backup', 'restore'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                  mode === m
                    ? 'bg-bg-2 border-accent text-text-primary'
                    : 'bg-bg-0 border-border text-text-secondary hover:text-text-primary hover:bg-bg-2'
                }`}
              >
                {m === 'export' ? 'Export' : m === 'import' ? 'Import' : m === 'backup' ? 'Backup' : 'Restore'}
              </button>
            ))}
          </div>

          {mode === 'export' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-secondary w-28">Format</div>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as any)}
                  className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL (INSERT)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-secondary w-28">Row limit</div>
                <input
                  type="number"
                  min={1}
                  value={exportLimit}
                  onChange={(e) => setExportLimit(Number(e.target.value))}
                  className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                />
              </div>
              <div className="flex justify-end">
                <button
                  disabled={loading || !canUseTableTools}
                  onClick={() => void handleExport()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-accent hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  <Download size={14} />
                  Export
                </button>
              </div>
            </div>
          )}

          {mode === 'import' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="text-xs text-text-secondary w-28">Format</div>
                <select
                  value={importFormat}
                  onChange={(e) => {
                    setImportFormat(e.target.value as any);
                    setImportFileName('');
                    setImportPreview(null);
                    setImportScript('');
                  }}
                  className="flex-1 bg-bg-0 border border-border rounded px-2 py-1.5 text-xs text-text-primary"
                >
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="sql">SQL Script</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={truncateFirst}
                  onChange={(e) => setTruncateFirst(e.target.checked)}
                />
                Clear table before import (TRUNCATE/DELETE)
              </label>

              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-secondary truncate">
                  {importFileName ? `File: ${importFileName}` : 'Choose a file to import'}
                </div>
                <button
                  type="button"
                  disabled={loading || !canUseTableTools}
                  onClick={handleChooseImportFile}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
                >
                  <Upload size={14} />
                  Choose file
                </button>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept={importFormat === 'sql' ? '.sql,text/plain' : importFormat === 'json' ? 'application/json,.json' : '.csv,text/csv'}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await handleFile(file);
                      showToast('File loaded', 'success');
                    } catch (err: any) {
                      showToast(err?.message || 'Failed to load file', 'error');
                    } finally {
                      e.target.value = '';
                    }
                  }}
                />
              </div>

              {importPreview && (
                <div className="text-xs text-text-secondary">
                  Loaded: {importPreview.rows.length} rows, {importPreview.columns.length} columns
                </div>
              )}

              <div className="flex justify-end">
                <button
                  disabled={loading || !canUseTableTools || !importScript.trim()}
                  onClick={() => void handleImportRun()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-accent hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  Run import
                </button>
              </div>
            </div>
          )}

          {mode === 'backup' && (
            <div className="space-y-2">
              <div className="text-xs text-text-secondary">
                Postgres only. Uses local <span className="font-mono">pg_dump</span> with <span className="font-mono">--column-inserts</span>.
              </div>
              <div className="flex justify-end">
                <button
                  disabled={loading || !connectionId}
                  onClick={() => void handleBackupDownload()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-accent hover:bg-blue-600 text-white rounded disabled:opacity-50"
                >
                  <Download size={14} />
                  Download SQL backup
                </button>
              </div>
            </div>
          )}

          {mode === 'restore' && (
            <div className="space-y-2">
              <div className="text-xs text-text-secondary">
                Restore runs the SQL script via <span className="font-mono">/execute-script</span>. Prefer INSERT-based dumps.
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-text-secondary truncate">
                  {importFileName ? `File: ${importFileName}` : 'Choose a .sql file to restore'}
                </div>
                <button
                  type="button"
                  disabled={loading || !connectionId}
                  onClick={handleChooseRestoreFile}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-bg-2 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded border border-border disabled:opacity-50"
                >
                  <Upload size={14} />
                  Choose file
                </button>
              </div>
              <input
                ref={restoreFileInputRef}
                type="file"
                accept=".sql,text/plain"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setImportFormat('sql');
                    await handleFile(file);
                    showToast('SQL loaded', 'success');
                  } catch (err: any) {
                    showToast(err?.message || 'Failed to load SQL', 'error');
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
              <div className="flex justify-end">
                <button
                  disabled={loading || !connectionId || !importScript.trim()}
                  onClick={() => void handleRestoreSql()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
                >
                  Restore
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
