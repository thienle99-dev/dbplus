import { useState, useCallback, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
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

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  affected_rows: number;
}

interface QueryEditorProps {
  initialSql?: string;
  initialMetadata?: Record<string, any>;
  isActive?: boolean;
}

export default function QueryEditor({ initialSql, initialMetadata, isActive }: QueryEditorProps) {
  const { connectionId } = useParams();
  const [query, setQuery] = useState(initialSql || '');
  const [mode, setMode] = useState<'sql' | 'visual'>('sql');
  const [visualState, setVisualState] = useState<any>(initialMetadata || null);
  const { showToast } = useToast();

  // Update query when initialSql changes (e.g. loading from sidebar)
  useEffect(() => {
    if (initialSql) setQuery(initialSql);
    if (initialMetadata) {
      setVisualState(initialMetadata);
      setMode('visual');
    }
  }, [initialSql, initialMetadata]);

  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);

  const isDangerousQuery = useCallback((sql: string) => {
    const dangerousKeywords = /\b(DROP|DELETE|TRUNCATE|UPDATE|ALTER)\b/i;
    return dangerousKeywords.test(sql);
  }, []);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await api.post(`/api/connections/${connectionId}/execute`, { query });
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
    if (!query.trim()) return;

    if (isDangerousQuery(query)) {
      setIsConfirmationOpen(true);
      return;
    }

    execute();
  }, [query, isDangerousQuery, execute]);

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
        if (val === null) return <span className="text-text-secondary italic">null</span>;
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
        onConfirm={execute}
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
            className="flex items-center gap-1 bg-accent hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={16} />
            Run
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

      <div className="h-[300px] border-b border-border overflow-hidden flex">
        {mode === 'sql' ? (
          <CodeMirror
            value={query}
            height="300px"
            extensions={[sql()]}
            onChange={useCallback((val: string) => setQuery(val), [])}
            theme="dark"
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
        {error && <div className="p-4 text-red-500 font-mono text-sm whitespace-pre-wrap">{error}</div>}

        {result && (
          <div className="flex flex-col h-full">
            <div className="p-2 bg-bg-2 text-xs text-text-secondary border-b border-border">
              {result.affected_rows > 0
                ? `Affected rows: ${result.affected_rows}`
                : `${result.rows.length} rows returned`}
            </div>

            {result.columns.length > 0 && (
              <div className="flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-bg-1 sticky top-0 z-10">
                    {tableInstance.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="border-b border-r border-border px-4 py-2 text-left font-medium text-text-secondary min-w-[100px]"
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
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
