import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { light as lightTheme } from '../themes/codemirror-light';
import { transparentTheme } from '../themes/codemirror-dynamic';
import { foldGutter } from '@codemirror/language';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { Play, Save, Eraser, Code, LayoutTemplate, AlignLeft } from 'lucide-react';
import { format as formatSql } from 'sql-formatter';
import api from '../services/api';
import { historyApi } from '../services/historyApi';
import { connectionApi } from '../services/connectionApi';
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
  savedQueryId?: string;
  queryName?: string;
  onQueryChange?: (sql: string, metadata?: Record<string, any>) => void;
  onSaveSuccess?: () => void;
}

export default function QueryEditor({ initialSql, initialMetadata, isActive, isDraft, savedQueryId, queryName, onQueryChange, onSaveSuccess }: QueryEditorProps) {
  const { connectionId } = useParams();
  const [query, setQuery] = useState(initialSql || '');
  const [mode, setMode] = useState<'sql' | 'visual'>('sql');
  const [visualState, setVisualState] = useState<any>(initialMetadata || null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const { showToast } = useToast();
  const { theme, formatKeywordCase } = useSettingsStore();
  const lastHistorySave = useRef<{ sql: string; timestamp: number } | null>(null);
  const [schemaCompletion, setSchemaCompletion] = useState<Record<string, any> | undefined>(undefined);

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

      await Promise.all(schemas.map(async (schemaName) => {
        try {
          const meta = await connectionApi.getSchemaMetadata(connectionId, schemaName);
          if (meta && meta.length > 0) {
            const tableMap: Record<string, string[]> = {};

            meta.forEach(m => {
              tableMap[m.table_name] = m.columns;
              // Also add to top-level for convenience (matches if user types just table name)
              // Only add if not present to avoid overwriting (though order is roughly random with Promise.all)
              if (!schemaConfig[m.table_name]) {
                schemaConfig[m.table_name] = m.columns;
              }
            });

            // Add schema-scoped completion
            schemaConfig[schemaName] = tableMap;
          }
        } catch (e) {
          // Ignore failures for individual schemas
        }
      }));

      setSchemaCompletion(schemaConfig);
    };
    fetchMeta();
  }, [connectionId]);

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
    if (initialSql !== undefined) setQuery(initialSql);
    if (initialMetadata) {
      setVisualState(initialMetadata);
      setMode('visual');
    } else if (initialSql !== undefined) {
      // If no metadata, switch to SQL mode
      setMode('sql');
    }
  }, [initialSql, initialMetadata]);

  // Debounced auto-save for drafts and saved queries
  useEffect(() => {
    if ((!isDraft && !savedQueryId) || !onQueryChange) return;

    const timeoutId = setTimeout(() => {
      onQueryChange(query, visualState);
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, visualState, isDraft, savedQueryId, onQueryChange]);

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
    const startTime = Date.now();

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post(`/api/connections/${connectionId}/execute`, { query: sqlToExecute });
      const executionTime = Date.now() - startTime;

      setResult(response.data);

      // Save to history (success) - prevent duplicates
      if (connectionId) {
        const now = Date.now();
        const lastSave = lastHistorySave.current;

        // Only save if this is a different query or more than 2 seconds have passed
        if (!lastSave || lastSave.sql !== sqlToExecute || (now - lastSave.timestamp) > 2000) {
          lastHistorySave.current = { sql: sqlToExecute, timestamp: now };

          historyApi.addHistory(connectionId, {
            sql: sqlToExecute,
            row_count: response.data.rows?.length || response.data.affected_rows || 0,
            execution_time: executionTime,
            success: true,
            error_message: null,
          }).catch(err => console.error('Failed to save history:', err));
        }
      }

      if (response.data.affected_rows > 0) {
        showToast(`Query executed successfully. ${response.data.affected_rows} rows affected.`, 'success');
      }
    } catch (err: unknown) {
      const executionTime = Date.now() - startTime;
      const errorMessage = (err as any).response?.data || (err as Error).message || 'Failed to execute query';

      setError(errorMessage);
      showToast('Query execution failed', 'error');

      // Save to history (error) - prevent duplicates
      if (connectionId) {
        const now = Date.now();
        const lastSave = lastHistorySave.current;

        // Only save if this is a different query or more than 2 seconds have passed
        if (!lastSave || lastSave.sql !== sqlToExecute || (now - lastSave.timestamp) > 2000) {
          lastHistorySave.current = { sql: sqlToExecute, timestamp: now };

          historyApi.addHistory(connectionId, {
            sql: sqlToExecute,
            row_count: null,
            execution_time: executionTime,
            success: false,
            error_message: errorMessage,
          }).catch(err => console.error('Failed to save history:', err));
        }
      }
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
      } else {
        // Always get the latest content from the editor view directly
        // This ensures shortcuts work even if 'query' state is stale in closure
        sqlToRun = editorView.state.doc.toString();
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

  const handleQuickSave = async () => {
    if (!savedQueryId || !connectionId) return;

    try {
      await api.put(`/api/connections/${connectionId}/saved-queries/${savedQueryId}`, {
        sql: query,
        metadata: visualState
      });
      showToast('Query saved successfully', 'success');
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: unknown) {
      console.error('Failed to save query:', err);
      showToast('Failed to save query', 'error');
    }
  };

  const handleFormat = useCallback(() => {
    if (!query.trim()) return;
    try {
      const formatted = formatSql(query, { language: 'postgresql', keywordCase: formatKeywordCase });
      setQuery(formatted);
      showToast('Query formatted', 'info');
    } catch (err) {
      console.error('Formatting failed:', err);
      showToast('Formatting failed', 'error');
    }
  }, [query, showToast, formatKeywordCase]);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleExecute();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (query.trim()) {
          if (savedQueryId) {
            handleQuickSave();
          } else {
            setIsSaveModalOpen(true);
          }
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleFormat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleExecute, query, savedQueryId, handleFormat]);



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

  // Create a ref for handleExecute to keep the keymap extension stable
  const handleExecuteRef = useRef(handleExecute);
  useEffect(() => {
    handleExecuteRef.current = handleExecute;
  }, [handleExecute]);

  // Memoize extensions to prevent reconfiguration on every render
  const extensions = useMemo(() => [
    sql({ schema: schemaCompletion }),
    foldGutter(),
    ...(codeMirrorTheme ? [codeMirrorTheme] : []),
    transparentTheme, // Apply dynamic background override
    Prec.highest(keymap.of([
      {
        key: "Mod-Enter",
        run: () => {
          console.log('[QueryEditor] Shortcut detected: Mod-Enter');
          handleExecuteRef.current();
          return true;
        },
        preventDefault: true
      }
    ]))
  ], [codeMirrorTheme, schemaCompletion]);

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
      <div className="h-10 px-3 border-b border-border bg-bg-0/50 backdrop-blur-md flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExecute}
            disabled={loading || !query.trim()}
            className="group relative flex items-center gap-1.5 bg-gradient-to-b from-pink-500 to-pink-600 hover:from-pink-400 hover:to-pink-500 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-md shadow-pink-500/20 hover:shadow-pink-500/40 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition-all duration-200 active:scale-95"
            title={hasSelection ? "Run selected query (Cmd/Ctrl+Enter)" : "Run entire query (Cmd/Ctrl+Enter)"}
          >
            <Play size={13} className={`fill-current ${loading ? 'animate-pulse' : ''}`} />
            <span>{loading ? 'Running...' : hasSelection ? 'Run Selection' : 'Run'}</span>
            <div className="absolute inset-0 rounded-md bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          <div className="w-px h-4 bg-border mx-1" />

          <button
            onClick={() => {
              if (savedQueryId) {
                handleQuickSave();
              } else {
                setIsSaveModalOpen(true);
              }
            }}
            disabled={!query.trim()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-2 disabled:opacity-50 transition-all duration-200"
            title={savedQueryId ? `Save changes to "${queryName}" (Cmd/Ctrl+S)` : "Save as new query (Cmd/Ctrl+S)"}
          >
            <Save size={14} />
            <span>{savedQueryId ? 'Save' : 'Save As'}</span>
          </button>

          <button
            onClick={() => setQuery('')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-error hover:bg-error/10 transition-all duration-200"
          >
            <Eraser size={14} />
            <span>Clear</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {isDraft && (
            <span className="text-[10px] uppercase tracking-wider text-yellow-500 flex items-center gap-1 font-bold px-1.5 py-0.5 bg-yellow-500/10 rounded-sm select-none" title="Query is auto-saved locally">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
              Draft
            </span>
          )}
        </div>
      </div>

      <div className="h-[300px] border-b border-border flex flex-col">
        <div className="flex-1 overflow-hidden flex relative">
          {mode === 'sql' ? (
            <CodeMirror
              value={query}
              height="100%"
              extensions={extensions}
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
              className="text-base w-full h-full"
            />
          ) : (
            <VisualQueryBuilder
              onSqlChange={setQuery}
              initialState={visualState}
            />
          )}
        </div>

        {/* Bottom Toolbar / Status Bar */}
        <div className="h-8 border-t border-border bg-bg-1 flex items-center px-3 justify-between select-none">
          <div className="flex items-center gap-2">
            <button
              onClick={handleFormat}
              disabled={!query.trim()}
              className="p-1.5 hover:bg-bg-3 rounded-md text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
              title="Format SQL (Cmd+K)"
            >
              <AlignLeft size={14} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode('sql')}
              className={`p-1.5 rounded-md transition-colors ${mode === 'sql' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-3'}`}
              title="SQL View"
            >
              <Code size={14} />
            </button>
            <button
              onClick={() => setMode('visual')}
              className={`p-1.5 rounded-md transition-colors ${mode === 'visual' ? 'text-accent bg-accent/10' : 'text-text-secondary hover:text-text-primary hover:bg-bg-3'}`}
              title="Visual Builder"
            >
              <LayoutTemplate size={14} />
            </button>
          </div>
        </div>
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
