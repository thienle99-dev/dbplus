import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import {
  indentMore,
  indentLess,
  deleteLine,
  selectLine,
  toggleComment
} from '@codemirror/commands';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';

import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../context/ToastContext';
import SaveQueryModal from './SaveQueryModal';
import ConfirmationModal from './ConfirmationModal';
import VisualQueryBuilder from './VisualQueryBuilder';
import ExecutionPlanView from './ExecutionPlanView';
import { useExplainQuery, useUpdateSavedQuery } from '../hooks/useQuery';
import {
  QueryToolbar,
  QueryResults,
  QueryStatusBar,
  useQueryCompletion,
  useQueryExecution,
  SnippetLibrary
} from './query-editor';
import { QueryResult } from '../types';
import { computeResultDiff, DiffResult } from '../utils/resultDiff';
import { ResultComparison } from './query-editor/ResultComparison';

interface QueryEditorProps {
  initialSql?: string;
  initialMetadata?: Record<string, any>;
  isActive?: boolean;
  isDraft?: boolean;
  savedQueryId?: string;
  queryName?: string;
  splitMode?: 'none' | 'vertical' | 'horizontal';
  onQueryChange?: (sql: string, metadata?: Record<string, any>) => void;
  onSaveSuccess?: () => void;
  onSavedQueryCreated?: (savedQueryId: string, name: string) => void;
}

export default function QueryEditor({
  initialSql,
  initialMetadata,
  isActive,
  isDraft,
  savedQueryId,
  queryName,
  splitMode = 'none',
  onQueryChange,
  onSaveSuccess,
  onSavedQueryCreated
}: QueryEditorProps) {
  const { connectionId } = useParams();
  const { showToast } = useToast();
  const { theme } = useSettingsStore();

  // State
  const [query, setQuery] = useState(initialSql || '');
  const [mode, setMode] = useState<'sql' | 'visual'>('sql');
  const [visualState, setVisualState] = useState<any>(initialMetadata || null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [hasSelection, setHasSelection] = useState(false);

  // Modals state
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isSnippetLibraryOpen, setIsSnippetLibraryOpen] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // Custom Hooks
  const { extensions, schemaCompletion } = useQueryCompletion({ connectionId, theme });
  const { execute, fetchPage, handleFormat, result, loading, error, errorDetails, lastSql } = useQueryExecution(query, setQuery);
  const explainQuery = useExplainQuery(connectionId);
  const updateSavedQuery = useUpdateSavedQuery(connectionId);

  // Update query when initialSql changes
  useEffect(() => {
    if (initialSql !== undefined) setQuery(initialSql);
    if (initialMetadata) {
      setVisualState(initialMetadata);
      setMode('visual');
    } else if (initialSql !== undefined) {
      setMode('sql');
    }
  }, [initialSql, initialMetadata]);

  // Debounced auto-save
  useEffect(() => {
    if ((!isDraft && !savedQueryId) || !onQueryChange) return;
    const timeoutId = setTimeout(() => {
      onQueryChange(query, visualState);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [query, visualState, isDraft, savedQueryId, onQueryChange]);

  // Explain State
  const [executionPlan, setExecutionPlan] = useState<any>(null);
  const [baselinePlan, setBaselinePlan] = useState<any>(null);
  const [analyzeEnabled, setAnalyzeEnabled] = useState(false);
  const [bottomTab, setBottomTab] = useState<'results' | 'plan' | 'comparison'>('results');

  // Comparison State
  const [snapshot, setSnapshot] = useState<QueryResult | null>(null);
  const [resultDiff, setResultDiff] = useState<DiffResult | null>(null);

  // Resize State
  const [editorHeight, setEditorHeight] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startY: number, startHeight: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (dragStartRef.current) {
        const delta = e.clientY - dragStartRef.current.startY;
        setEditorHeight(Math.max(100, dragStartRef.current.startHeight + delta));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const handleEditorChange = useCallback((val: string) => setQuery(val), []);

  const handleCreateEditor = useCallback((view: EditorView) => {
    setEditorView(view);
    view.dom.addEventListener('mouseup', () => {
      const selection = view.state.selection.main;
      setHasSelection(!selection.empty);
    });
    view.dom.addEventListener('keyup', () => {
      const selection = view.state.selection.main;
      setHasSelection(!selection.empty);
    });
  }, []);

  const handleExplain = useCallback(async (analyzeHeader: boolean = false) => {
    const shouldUseAnalyze = analyzeHeader || analyzeEnabled;
    let sqlToRun = query;
    if (editorView) {
      const selection = editorView.state.selection.main;
      if (!selection.empty) {
        sqlToRun = editorView.state.sliceDoc(selection.from, selection.to);
      }
    }

    if (!sqlToRun.trim() || !connectionId) return;

    // setExplaining(true); // Handled by mutation status
    // setExplainError(null);
    setExecutionPlan(null);
    setBottomTab('plan'); // Switch to plan tab

    try {
      const data = await explainQuery.mutateAsync({
        query: sqlToRun,
        analyze: shouldUseAnalyze
      });
      setExecutionPlan(data.plan);
    } catch (err: any) {
      console.error('Explain error:', err);
      // setExplainError handled by mutation
    }
  }, [query, editorView, connectionId, analyzeEnabled, explainQuery]);

  const handleSnapshot = useCallback((res: QueryResult) => {
    setSnapshot(res);
    showToast('Snapshot captured for comparison', 'success');
  }, [showToast]);



  const handleClearSnapshot = useCallback(() => {
    setSnapshot(null);
    setResultDiff(null);
    if (bottomTab === 'comparison') setBottomTab('results');
  }, [bottomTab]);

  const isDangerousQuery = useCallback((sql: string) => {
    const dangerousKeywords = /\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER)\b/i;
    return dangerousKeywords.test(sql);
  }, []);

  const handleExecuteRequest = useCallback(async () => {
    let sqlToRun = query;
    let isSelection = false;

    if (editorView) {
      const selection = editorView.state.selection.main;
      if (!selection.empty) {
        sqlToRun = editorView.state.sliceDoc(selection.from, selection.to);
        isSelection = true;
      } else {
        sqlToRun = editorView.state.doc.toString();
      }
    }

    if (!sqlToRun.trim()) return;

    if (isSelection) {
      showToast('Executing selected query...', 'info');
    }

    if (isDangerousQuery(sqlToRun)) {
      setPendingQuery(sqlToRun);
      setIsConfirmationOpen(true);
      return;
    }

    setBottomTab('results'); // Switch to results on execute
    execute(sqlToRun);
  }, [query, isDangerousQuery, execute, editorView, showToast]);

  const handleExecuteSelection = useCallback(() => {
    if (!editorView) return false;

    const selection = editorView.state.selection.main;
    if (selection.empty) {
      showToast('No text selected', 'info');
      return false;
    }

    const sqlToRun = editorView.state.sliceDoc(selection.from, selection.to);
    if (sqlToRun.trim()) {
      if (isDangerousQuery(sqlToRun)) {
        setPendingQuery(sqlToRun);
        setIsConfirmationOpen(true);
      } else {
        setBottomTab('results'); // Switch to results on execute
        execute(sqlToRun);
      }
      return true;
    }
    return false;
  }, [editorView, execute, showToast, isDangerousQuery]);

  const handleQuickSave = async () => {
    if (!savedQueryId || !connectionId) return;

    try {
      await updateSavedQuery.mutateAsync({
        id: savedQueryId,
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

  const handleInsertSnippet = (sql: string) => {
    setQuery(sql);
    setIsSnippetLibraryOpen(false);
    showToast('Snippet inserted', 'success');
  };

  // Handle "Expand Star"
  const handleExpandStar = useCallback(() => {
    if (!editorView || !schemaCompletion) return;
    const state = editorView.state;
    const doc = state.doc.toString();
    const selection = state.selection.main;
    const cursor = selection.head;

    const range = 50;
    const start = Math.max(0, cursor - range);
    const end = Math.min(doc.length, cursor + range);
    const textAround = doc.slice(start, end);

    if (!textAround.includes('*')) {
      showToast("Cursor must be near a '*' to expand", "info");
      return;
    }

    const fromMatch = doc.match(/from\s+([a-zA-Z0-9_.]+)/i);
    if (fromMatch && fromMatch[1]) {
      const tableName = fromMatch[1];
      const columns = schemaCompletion[tableName];

      if (columns && columns.length > 0) {
        const starIndexRelative = textAround.indexOf('*');
        if (starIndexRelative !== -1) {
          const starPos = start + starIndexRelative;
          const columnString = columns.join(', ');
          editorView.dispatch({
            changes: { from: starPos, to: starPos + 1, insert: columnString }
          });
          showToast(`Expanded * for table '${tableName}'`, "success");
        }
      } else {
        showToast(`Could not find columns for table '${tableName}'`, "error");
      }
    } else {
      showToast("Could not detect table name in FROM clause", "error");
    }
  }, [editorView, schemaCompletion, showToast]);

  const allExtensions = useMemo(() => [
    ...extensions,
    Prec.highest(keymap.of([
      // Execute query
      {
        key: "Mod-Enter",
        run: () => {
          handleExecuteRequest();
          return true;
        },
        preventDefault: true
      },
      // Explain query
      {
        key: "Mod-e",
        run: () => {
          handleExplain(false);
          return true;
        },
        preventDefault: true
      },
      // Expand star
      {
        key: "Mod-i",
        run: () => {
          handleExpandStar();
          return true;
        },
        preventDefault: true
      },
      // NEW: Comment/uncomment
      {
        key: "Mod-/",
        run: toggleComment,
        preventDefault: true
      },
      // NEW: Duplicate line
      {
        key: "Mod-d",
        run: (view) => {
          const { state } = view;
          const line = state.doc.lineAt(state.selection.main.head);
          const lineText = line.text;
          view.dispatch({
            changes: { from: line.to, insert: '\n' + lineText },
            selection: { anchor: line.to + 1 }
          });
          return true;
        },
        preventDefault: true
      },
      // Explain Analyze
      {
        key: "Mod-Shift-e",
        run: () => {
          handleExplain(true);
          return true;
        },
        preventDefault: true
      },
      // NEW: Select line
      {
        key: "Mod-l",
        run: selectLine,
        preventDefault: true
      },
      // NEW: Delete line
      {
        key: "Mod-Shift-k",
        run: deleteLine,
        preventDefault: true
      },
      // NEW: Indent
      {
        key: "Mod-]",
        run: indentMore,
        preventDefault: true
      },
      // NEW: Outdent
      {
        key: "Mod-[",
        run: indentLess,
        preventDefault: true
      }
    ]))
  ], [extensions, handleExecuteRequest, handleExpandStar, handleExecuteSelection, handleExplain]);

  const handleCompareSnapshot = useCallback(() => {
    if (!snapshot || !result) return;
    // result.columns is typically string[] for now based on types, map to object for compat
    const columns = result.columns ? result.columns.map(c => ({ name: c })) : [];
    const diff = computeResultDiff(snapshot.rows, result.rows, columns);
    setResultDiff(diff);
    setBottomTab('comparison');
  }, [snapshot, result]);

  // Shortcuts
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keep window listeners as fallback/global shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!editorView?.hasFocus) {
          e.preventDefault();
          handleExecuteRequest();
        }
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        if (!editorView?.hasFocus) {
          e.preventDefault();
          handleExpandStar();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleExecuteRequest, query, savedQueryId, handleFormat, handleExpandStar, editorView]);

  return (
    <div className="flex flex-col h-full">
      {isSaveModalOpen && (
        <SaveQueryModal
          isOpen={true}
          onClose={() => setIsSaveModalOpen(false)}
          sql={query}
          initial={{ name: queryName, metadata: visualState || undefined }}
          mode="create"
          onSaved={({ id, name }) => {
            if (onSavedQueryCreated) onSavedQueryCreated(id, name);
          }}
        />
      )}
      <ConfirmationModal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
        onConfirm={() => {
          if (pendingQuery) execute(pendingQuery);
          setIsConfirmationOpen(false);
        }}
        title="Dangerous Query Detected"
        message="This query contains keywords that may modify or delete data. Are you sure?"
        confirmText="Execute"
        isDangerous={true}
      />

      <SnippetLibrary
        isOpen={isSnippetLibraryOpen}
        onClose={() => setIsSnippetLibraryOpen(false)}
        onInsert={handleInsertSnippet}
      />

      <QueryToolbar
        onExecute={handleExecuteRequest}
        onExplain={() => handleExplain(false)}
        onExplainAnalyze={() => handleExplain(true)}
        analyzeEnabled={analyzeEnabled}
        onToggleAnalyze={() => setAnalyzeEnabled(!analyzeEnabled)}
        onSave={() => {
          if (savedQueryId) {
            handleQuickSave();
          } else {
            setIsSaveModalOpen(true);
          }
        }}
        onClear={() => setQuery('')}
        onFormat={handleFormat}
        onOpenSnippets={() => setIsSnippetLibraryOpen(true)}
        loading={loading || explainQuery.isPending}
        queryTrimmed={query.trim()}
        hasSelection={hasSelection}
        savedQueryId={savedQueryId}
        queryName={queryName}
        isDraft={isDraft}
      />

      {/* Split View Container */}
      <div className={`flex-1 flex ${splitMode === 'vertical' ? 'flex-row' : 'flex-col'} min-h-0`}>
        {/* Editor Section */}
        <div
          style={{
            height: splitMode === 'vertical' ? '100%' : `${editorHeight}px`,
            width: splitMode === 'vertical' ? '50%' : '100%'
          }}
          className={`border-${splitMode === 'vertical' ? 'r' : 'b'} border-border flex flex-col shrink-0`}
        >
          <div className="flex-1 overflow-hidden flex relative">
            {mode === 'sql' ? (
              <CodeMirror
                value={query}
                height="100%"
                extensions={allExtensions}
                onChange={handleEditorChange}
                onCreateEditor={handleCreateEditor}
                className="text-base w-full h-full"
              />
            ) : (
              <VisualQueryBuilder
                onSqlChange={setQuery}
                initialState={visualState}
              />
            )}
          </div>

          <QueryStatusBar
            mode={mode}
            setMode={setMode}
            onFormat={handleFormat}
            queryTrimmed={query.trim()}
          />
        </div>

        {/* Resize Handle (Horizontal Split Only) */}
        {splitMode !== 'vertical' && (
          <div
            className="h-1 -mt-0.5 cursor-row-resize hover:bg-accent/50 z-50 transition-colors w-full flex-shrink-0"
            onMouseDown={(e) => {
              e.preventDefault();
              dragStartRef.current = { startY: e.clientY, startHeight: editorHeight };
              setIsResizing(true);
            }}
            title="Drag to resize"
          />
        )}

        {/* Results Section */}
        <div className="flex-1 flex flex-col min-h-0 bg-bg-1/20">
          <div className="flex items-center justify-between border-b border-border/40 bg-bg-1 p-2">
            <div className="flex p-0.5 bg-bg-2/50 rounded-xl border border-border/40">
              <button
                onClick={() => setBottomTab('results')}
                className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${bottomTab === 'results'
                  ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
                  }`}
              >
                Results
              </button>
              <button
                onClick={() => setBottomTab('plan')}
                className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${bottomTab === 'plan'
                  ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
                  }`}
              >
                Execution Plan
              </button>
              {snapshot && (
                <button
                  onClick={() => setBottomTab('comparison')}
                  className={`px-4 py-1.5 text-xs font-medium flex items-center gap-2 transition-all rounded-lg ${bottomTab === 'comparison'
                    ? 'text-text-primary bg-bg-0 shadow-sm ring-1 ring-black/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-2/50'
                    }`}
                >
                  Diff Comparison
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
            <div className={`absolute inset-0 flex flex-col ${bottomTab === 'results' ? 'z-10' : 'z-0 invisible'}`}>
              <QueryResults
                result={result}
                loading={loading}
                error={error}
                errorDetails={errorDetails}
                onRefresh={() => {
                  if (!lastSql) return;
                  const limit = typeof result?.limit === 'number' ? result.limit : undefined;
                  const offset = typeof result?.offset === 'number' ? result.offset : undefined;
                  fetchPage(limit || 1000, offset || 0);
                }}
                onPaginate={(limit, offset) => fetchPage(limit, offset)}
                connectionId={connectionId || ''}
                // Snapshot props
                hasSnapshot={!!snapshot}
                onSnapshot={handleSnapshot}
                onCompareSnapshot={handleCompareSnapshot}
                onClearSnapshot={handleClearSnapshot}
              />
            </div>
            <div className={`absolute inset-0 flex flex-col ${bottomTab === 'plan' ? 'z-10' : 'z-0 invisible'}`}>
              <ExecutionPlanView
                plan={executionPlan}
                baselinePlan={baselinePlan}
                loading={explainQuery.isPending}
                error={explainQuery.error ? explainQuery.error.message : null}
                onSaveBaseline={(p) => setBaselinePlan(p)}
                onClearBaseline={() => setBaselinePlan(null)}
              />
            </div>
            <div className={`absolute inset-0 flex flex-col ${bottomTab === 'comparison' ? 'z-10' : 'z-0 invisible'}`}>
              {resultDiff && snapshot && (
                <ResultComparison
                  diff={resultDiff}
                  columns={result?.columns?.map(c => ({ name: c })) || []}
                  onClose={() => setBottomTab('results')}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
