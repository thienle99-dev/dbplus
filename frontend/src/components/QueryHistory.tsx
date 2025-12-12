import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import api from '../services/api';

interface HistoryEntry {
  id: string;
  sql: string;
  row_count: number | null;
  execution_time: number | null;
  success: boolean;
  error_message: string | null;
  executed_at: string;
}

export default function QueryHistory({
  onSelectQuery,
  embedded = false,
  searchTerm = ''
}: {
  onSelectQuery: (sql: string) => void;
  embedded?: boolean;
  searchTerm?: string;
}) {
  const { connectionId } = useParams();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (connectionId) {
      fetchHistory();
    }
  }, [connectionId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/connections/${connectionId}/history`);
      // Backend returns { history: [...] }
      setHistory(response.data.history || response.data);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all query history?')) return;
    try {
      await api.delete(`/api/connections/${connectionId}/history`);
      setHistory([]);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      alert('Failed to clear history');
    }
  };

  const handleDeleteEntry = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
    if (!confirm('Delete this history entry?')) return;

    try {
      await api.delete(`/api/connections/${connectionId}/history/${entryId}`);
      setHistory(prev => prev.filter(h => h.id !== entryId));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(entryId);
        return next;
      });
    } catch (err: unknown) {
      console.error('Failed to delete history entry:', err);
      // alert('Failed to delete entry');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected items?`)) return;

    try {
      await api.post(`/api/connections/${connectionId}/history/delete`, {
        ids: Array.from(selectedIds)
      });
      setHistory(prev => prev.filter(h => !selectedIds.has(h.id)));
      setSelectedIds(new Set());
    } catch (err: unknown) {
      console.error('Failed to delete history entries:', err);
      alert('Failed to delete selected items');
    }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredHistory.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredHistory.map(h => h.id)));
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const filteredHistory = history.filter(entry =>
    !searchTerm || entry.sql.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`flex flex-col h-full bg-bg-1 ${!embedded ? 'border-l border-border w-72' : ''}`}>
      {!embedded && (
        <div className="p-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} /> History
            </h2>
            {history.length > 0 && (
              <span className="text-xs text-text-secondary">
                ({selectedIds.size > 0 ? `${selectedIds.size}/` : ''}{history.length})
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {selectedIds.size > 0 ? (
              <button
                onClick={handleBulkDelete}
                className="p-1 hover:bg-bg-2 rounded text-error hover:text-error-dark"
                title="Delete Selected"
              >
                <Trash2 size={14} />
              </button>
            ) : (
              <button
                onClick={handleClear}
                disabled={history.length === 0}
                className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-error disabled:opacity-50"
                title="Clear All History"
              >
                <Trash2 size={14} />
              </button>
            )}
            {history.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className={`p-1 hover:bg-bg-2 rounded ${selectedIds.size === filteredHistory.length && filteredHistory.length > 0 ? 'text-primary' : 'text-text-secondary'}`}
                title="Select All"
              >
                <span className="text-[10px] font-bold">ALL</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">No history found</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredHistory.map(entry => (
              <div
                key={entry.id}
                className={`p-3 cursor-pointer group transition-colors relative ${selectedIds.has(entry.id) ? 'bg-primary/5' : 'hover:bg-bg-2'}`}
                onClick={() => onSelectQuery(entry.sql)}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(entry.id)}
                      onClick={(e) => toggleSelection(e, entry.id)}
                      className="opacity-0 group-hover:opacity-100 checked:opacity-100 transition-opacity cursor-pointer"
                    />
                    <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${entry.success ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {entry.success ? 'SUCCESS' : 'ERROR'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-secondary">{formatDate(entry.executed_at)}</span>
                    <button
                      onClick={(e) => handleDeleteEntry(e, entry.id)}
                      className="p-1 hover:bg-bg-3 rounded -mr-1 text-text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Entry"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <pre className="text-xs text-text-primary font-mono line-clamp-3 my-2 whitespace-pre-wrap break-all">
                  {entry.sql}
                </pre>
                <div className="flex gap-3 text-[10px] text-text-secondary">
                  {entry.execution_time !== null && (
                    <span>{entry.execution_time}ms</span>
                  )}
                  {entry.row_count !== null && (
                    <span>{entry.row_count} rows</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
