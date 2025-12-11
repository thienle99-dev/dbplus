import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';

import { useSettingsStore } from '../store/settingsStore';
import { useToast } from '../context/ToastContext';
import SaveQueryModal from './SaveQueryModal';
import ConfirmationModal from './ConfirmationModal';
import VisualQueryBuilder from './VisualQueryBuilder';
import api from '../services/api';
import {
  QueryToolbar,
  QueryResults,
  QueryStatusBar,
  useQueryCompletion,
  useQueryExecution
} from './query-editor';

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

export default function QueryEditor({
  initialSql,
  initialMetadata,
  isActive,
  isDraft,
  savedQueryId,
  queryName,
  onQueryChange,
  onSaveSuccess
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
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  // Custom Hooks
  const { extensions, schemaCompletion } = useQueryCompletion({ connectionId, theme });
  const { execute, handleFormat, result, loading, error, setResult } = useQueryExecution(query, setQuery);

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
      {
        key: "Mod-Enter",
        run: () => {
          handleExecuteRequest();
          return true;
        },
        preventDefault: true
      },
      {
        key: "Mod-i",
        run: () => {
          handleExpandStar();
          return true;
        },
        preventDefault: true
      }
    ]))
  ], [extensions, handleExecuteRequest, handleExpandStar]);

  // Shortcuts
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      // Keep window listeners as fallback/global shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        // Only trigger if we are NOT in the editor (CodeMirror handles it via keymap)
        // But verifying if CodeMirror is focused is hard here without ref check on activeElement
        // Actually, if CM handles it with preventDefault, this might not fire if bubble is stopped
        // Let's safe guard:
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


  // Quick Save Implementation (Inline for now to match logic)
  // I need to add `api` import to make this work.
  // I'll assume users will add it or I'll add it in this replacement.

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
        message="This query contains keywords that may modify or delete data. Are you sure?"
        confirmText="Execute"
        isDangerous={true}
      />

      <QueryToolbar
        onExecute={handleExecuteRequest}
        onSave={() => {
          if (savedQueryId) {
            handleQuickSave();
          } else {
            setIsSaveModalOpen(true);
          }
        }}
        onClear={() => setQuery('')}
        loading={loading}
        queryTrimmed={query.trim()}
        hasSelection={hasSelection}
        savedQueryId={savedQueryId}
        queryName={queryName}
        isDraft={isDraft}
      />

      <div className="h-[300px] border-b border-border flex flex-col">
        <div className="flex-1 overflow-hidden flex relative">
          {mode === 'sql' ? (
            <CodeMirror
              value={query}
              height="100%"
              extensions={allExtensions}
              onChange={useCallback((val: string) => setQuery(val), [])}
              onCreateEditor={useCallback((view: EditorView) => {
                setEditorView(view);
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

        <QueryStatusBar
          mode={mode}
          setMode={setMode}
          onFormat={handleFormat}
          queryTrimmed={query.trim()}
        />
      </div>

      <QueryResults
        result={result}
        loading={loading}
        error={error}
      />
    </div>
  );
}
