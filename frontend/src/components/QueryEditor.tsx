import { useState, useCallback, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { light as lightTheme } from '../themes/codemirror-light';
import { EditorView } from '@codemirror/view';
import { Play, Save, Eraser, Code, LayoutTemplate } from 'lucide-react';
import api from '../services/api';
import { useParams } from 'react-router-dom';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import SaveQueryModal from './SaveQueryModal';
import ConfirmationModal from './ConfirmationModal';
import VisualQueryBuilder from './VisualQueryBuilder';
import { useToast } from '../context/ToastContext';
import { useSettingsStore } from '../store/settingsStore';
import { QueryResult } from '../types';

interface QueryEditorProps {
  initialSql?: string;
  initialMetadata?: Record<string, any>;
  isActive?: boolean;
  isDraft?: boolean;
  onQueryChange?: (sql: string, metadata?: Record<string, any>) => void;
}

export default function QueryEditor({ initialSql, initialMetadata, isActive, isDraft, onQueryChange }: QueryEditorProps) {
  const { connectionId } = useParams();
  const [query, setQuery] = useState(initialSql || '');
  const [mode, setMode] = useState<'sql' | 'visual'>('sql');
  const [visualState, setVisualState] = useState<any>(initialMetadata || null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const { showToast } = useToast();
  const { theme } = useSettingsStore();

  const codeMirrorTheme = useMemo(() => {
    let effectiveTheme = theme;
    if (theme === 'system') {
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    // Use custom themes for better contrast
    const isDarkTheme = effectiveTheme === 'dark' ||
      effectiveTheme === 'midnight' ||
      effectiveTheme === 'soft-pink' ||
      effectiveTheme?.startsWith('wibu') ||
      effectiveTheme?.startsWith('gruvbox-dark');

    return isDarkTheme ? oneDark : lightTheme;
  }, [theme]);

  // Update query when initialSql changes (e.g. loading from sidebar)
  useEffect(() => {
    if (initialSql) setQuery(initialSql);
    if (initialMetadata) {
      setVisualState(initialMetadata);
      setMode('visual');
    }
  }, [initialSql, initialMetadata]);

  // Debounced auto-save for drafts
  useEffect(() => {
    if (!isDraft || !onQueryChange) return;

    const timeoutId = setTimeout(() => {
      onQueryChange(query, visualState);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, visualState, isDraft, onQueryChange]);

  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  const isDangerousQuery = useCallback((sql: string) => {
    const dangerousKeywords = /\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER)\b/i;
    return dangerousKeywords.test(sql);
  }, []);

  const execute = useCallback(async (queryOverride?: string) => {
    const sqlToExecute = queryOverride !== undefined ? queryOverride : query;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.post(`/api/connections/${connectionId}/execute`, { query: sqlToExecute });
      setResult(response.data);
      if (response.data.affected_rows > 0) {
        showToast(`Query executed successfully. ${response.data.affected_rows} rows affected.`, 'success');
      }
    } catch (err: unknown) {
      const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to execute query';
      setError(errorMessage);
      showToast('Query execution failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [connectionId, query, showToast]);

  const handleExecute = useCallback(async () => {
    let sqlToRun = query;
    let isSelection = false;

    if (editorView) {
      const selection = editorView.state.selection.main;
      if (!selection.empty) {
        sqlToRun = editorView.state.sliceDoc(selection.from, selection.to);
        isSelection = true;
      }
    }

    if (!sqlToRun.trim()) return;

    // Show toast for selection execution
    if (isSelection) {
      showToast('Executing selected query...', 'info');
    }

    if (isDangerousQuery(sqlToRun)) {
      setPendingQuery(sqlToRun);
      setIsConfirmationOpen(true);
      return;
    }

    execute(sqlToRun);
  }, [query, isDangerousQuery, execute, editorView, showToast]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (query.trim()) setIsSaveModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleExecute, query]);

  const columns = result?.columns.map((col, index) => {
    const helper = createColumnHelper<unknown[]>();
    return helper.accessor((row) => row[index], {
      id: col,
      header: col,
      cell: (info) => {
        const val = info.getValue();
        if (val === null) return (
          <span className="italic font-semibold" style={{ color: 'var(--color-text-muted)', opacity: 0.8 }}>
            null
          </span>
        );
        if (typeof val === 'boolean') return val ? 'true' : 'false';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }
    });
  }) || [];

  const tableInstance = useReactTable({
    data: result?.rows || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      <SaveQueryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        sql={query}
        onSave={() => { }}
      />
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          if (pendingQuery) execute(pendingQuery);
          setIsConfirmationOpen(false);
        }}
        title="Dangerous Query Detected"
        message="This query contains keywords that may modify or delete data (DROP, DELETE, TRUNCATE, UPDATE, ALTER). Are you sure you want to execute it?"
        confirmText="Execute"
        isDangerous={true}
      />
      <div className="p-2 border-b border-border bg-bg-1 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={loading || !query.trim()}
            className="flex items-center gap-1 bg-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={hasSelection ? "Run selected query (Cmd/Ctrl+Enter)" : "Run entire query (Cmd/Ctrl+Enter)"}
          >
            <Play size={16} className={loading ? 'animate-pulse' : ''} />
            {loading ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={!query.trim()}
            className="flex items-center gap-1 hover:bg-bg-2 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50"
          >
            <Save size={16} />
            Save
          </button>
          <button
            onClick={() => setQuery('')}
            className="flex items-center gap-1 hover:bg-bg-2 text-text-secondary hover:text-text-primary px-3 py-1.5 rounded text-sm font-medium"
          >
            <Eraser size={16} />
            Clear
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isDraft && (
            <span className="text-xs text-yellow-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
              Draft - Auto-saved
            </span>
          )}

          <div className="flex bg-bg-2 rounded p-0.5">
            <button
              onClick={() => setMode('sql')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${mode === 'sql' ? 'bg-bg-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <Code size={14} /> SQL
            </button>
            <button
              onClick={() => setMode('visual')}
              className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1 ${mode === 'visual' ? 'bg-bg-0 text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <LayoutTemplate size={14} /> Visual
            </button>
          </div>
        </div>
      </div>

      <div className="h-[300px] border-b border-border overflow-hidden flex">
        {mode === 'sql' ? (
          <CodeMirror
            value={query}
            height="300px"
            extensions={[sql(), ...(codeMirrorTheme ? [codeMirrorTheme] : [])]}
            onChange={useCallback((val: string) => setQuery(val), [])}
            onCreateEditor={useCallback((view: EditorView) => {
              setEditorView(view);
              // Track selection changes
              view.dom.addEventListener('mouseup', () => {
                const selection = view.state.selection.main;
                setHasSelection(!selection.empty);
              });
              view.dom.addEventListener('keyup', () => {
                const selection = view.state.selection.main;
                setHasSelection(!selection.empty);
              });
            }, [])}
            className="text-base w-full"
          />
        ) : (
          <VisualQueryBuilder
            onSqlChange={setQuery}
            initialState={visualState}
          />
        )}
      </div>

      <div className="flex-1 overflow-auto bg-bg-0">
        {loading && <div className="p-4 text-text-secondary">Executing query...</div>}
        {error && <div className="p-4 text-error font-mono text-sm whitespace-pre-wrap">{error}</div>}

        {result && (
          <div className="flex flex-col h-full">
            <div className="p-2 bg-bg-2 text-xs border-b border-border flex items-center justify-between">
              <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {result.affected_rows > 0
                  ? `Affected rows: ${result.affected_rows}`
                  : `${result.rows.length} rows returned`}
              </span>
              {result.rows.length > 0 && (
                <span className="bg-accent/20 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ color: 'var(--color-primary-default)' }}>
                  {result.rows.length} {result.rows.length === 1 ? 'row' : 'rows'}
                </span>
              )}
            </div>

            {result.columns.length > 0 && (
              <div className="flex-1 overflow-auto">
                {result.rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                    <div className="text-4xl mb-2">📊</div>
                    <div className="text-sm">Query executed successfully</div>
                    <div className="text-xs mt-1">No rows returned</div>
                  </div>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-bg-1 sticky top-0 z-10">
                      {tableInstance.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th
                              key={header.id}
                              className="border-b border-r border-border px-4 py-2 text-left min-w-[100px]"
                              style={{
                                color: 'var(--color-text-primary)',
                                fontWeight: '600',
                                fontSize: '0.75rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {tableInstance.getRowModel().rows.map((row) => (
                        <tr key={row.id} className="hover:bg-bg-1/50">
                          {row.getVisibleCells().map((cell) => (
                            <td
                              key={cell.id}
                              className="border-b border-r border-border px-4 py-1.5 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]"
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div >
  );
}
