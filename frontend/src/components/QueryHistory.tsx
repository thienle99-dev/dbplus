import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Trash2, Search, CheckCircle2, XCircle, Copy, Filter } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

interface HistoryEntry {
  id: string;
  sql: string;
  row_count: number | null;
  execution_time: number | null;
  success: boolean;
  error_message: string | null;
  executed_at: string;
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
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
  const { showToast } = useToast();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'error'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (connectionId) {
      fetchHistory();
    }
  }, [connectionId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/connections/${connectionId}/history`);
      setHistory(response.data.history || response.data);
      setSelectedIds(new Set());
    } catch (err: unknown) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Clear all query history?')) return;
    try {
      await api.delete(`/api/connections/${connectionId}/history`);
      setHistory([]);
      setSelectedIds(new Set());
      showToast('History cleared', 'success');
    } catch (err: unknown) {
      showToast('Failed to clear history', 'error');
    }
  };

  const handleDeleteEntry = async (e: React.MouseEvent, entryId: string) => {
    e.stopPropagation();
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
    }
  };

  const handleCopySql = async (e: React.MouseEvent, sql: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(sql);
      showToast('SQL copied to clipboard', 'success');
    } catch (err) {
      showToast('Failed to copy SQL', 'error');
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
      showToast('Selected items deleted', 'success');
    } catch (err: unknown) {
      console.error('Failed to delete history entries:', err);
      showToast('Failed to delete selected items', 'error');
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

  const activeSearch = embedded ? searchTerm : localSearch;
  const lowered = activeSearch.toLowerCase();
  const filteredHistory = history.filter((entry) => {
    if (statusFilter === 'success' && !entry.success) return false;
    if (statusFilter === 'error' && entry.success) return false;

    if (!lowered) return true;
    const sqlMatch = entry.sql.toLowerCase().includes(lowered);
    const errMatch = (entry.error_message || '').toLowerCase().includes(lowered);
    return sqlMatch || errMatch;
  });

  return (
    <div className={`flex flex-col h-full bg-bg-1 ${!embedded ? 'border-l border-border w-80' : ''}`}>
      {/* Header */}
      <div className={`flex-shrink-0 border-b border-border/40 bg-bg-1/50 backdrop-blur-sm ${embedded ? 'p-2' : 'p-4'}`}>
        <div className="flex items-center justify-between mb-3">
          {!embedded ? (
            <h2 className="text-xs font-bold text-text-secondary uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} /> History
            </h2>
          ) : (
            <div className="text-[10px] text-text-tertiary font-medium px-1">
              {filteredHistory.length} ENTRIES
            </div>
          )}

          <div className="flex items-center gap-1">
            {selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                className="p-1.5 hover:bg-error/10 text-error rounded-md transition-colors"
                title="Delete Selected"
              >
                <Trash2 size={14} />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-md transition-colors ${showFilters || statusFilter !== 'all' ? 'bg-accent/10 text-accent' : 'hover:bg-bg-2 text-text-secondary'}`}
              title="Filter"
            >
              <Filter size={14} />
            </button>
            <button
              onClick={handleClearAll}
              disabled={history.length === 0}
              className="p-1.5 hover:bg-bg-2 text-text-secondary hover:text-error rounded-md transition-colors disabled:opacity-30"
              title="Clear All History"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-2">
          {!embedded && (
            <div className="relative group">
              <Search size={13} className="absolute left-2.5 top-2 text-text-tertiary group-focus-within:text-accent transition-colors" />
              <input
                type="text"
                placeholder="Search history..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-bg-2/50 border border-border/40 rounded-lg pl-8 pr-3 py-1.5 text-xs text-text-primary focus:border-accent/50 focus:bg-bg-0 focus:outline-none transition-all"
              />
            </div>
          )}

          {(showFilters || (!embedded && statusFilter !== 'all')) && (
            <div className="flex bg-bg-2/50 p-0.5 rounded-lg border border-border/40">
              {(['all', 'success', 'error'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`flex-1 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide transition-all ${statusFilter === filter
                    ? 'bg-bg-0 text-text-primary shadow-sm ring-1 ring-black/5'
                    : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-2/50'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="p-8 text-center text-text-tertiary text-xs">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-text-tertiary gap-2">
            <Clock size={24} className="opacity-20" />
            <span className="text-xs">No history found</span>
          </div>
        ) : (
          <div className="divide-y divide-border/30">
            {filteredHistory.map((entry) => {
              const isSelected = selectedIds.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className={`group relative flex items-start gap-3 p-3 hover:bg-bg-2/50 cursor-pointer transition-all ${isSelected ? 'bg-accent/5 hover:bg-accent/10' : ''
                    }`}
                  onClick={() => onSelectQuery(entry.sql)}
                >
                  {/* Selection Checkbox (Visible on hover or selected) */}
                  <div className={`absolute left-2 top-3 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    <div
                      role="checkbox"
                      aria-checked={isSelected}
                      onClick={(e) => toggleSelection(e, entry.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
                        ? 'bg-accent border-accent text-white'
                        : 'bg-bg-0 border-border hover:border-accent'
                        }`}
                    >
                      {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                    </div>
                  </div>

                  {/* Status Icon */}
                  <div className={`mt-0.5 flex-shrink-0 ${isSelected ? 'opacity-0' : 'group-hover:opacity-0'} transition-opacity`}>
                    {entry.success ? (
                      <CheckCircle2 size={16} className="text-success" />
                    ) : (
                      <XCircle size={16} className="text-error" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <pre className="text-xs font-mono text-text-primary truncate font-medium">
                      {entry.sql.replace(/\s+/g, ' ').trim()}
                    </pre>
                    <div className="flex items-center gap-2 text-[10px] text-text-tertiary">
                      <span className={entry.success ? 'text-text-secondary' : 'text-error'}>
                        {entry.success ? timeAgo(entry.executed_at) : 'Error'}
                      </span>
                      {entry.execution_time !== null && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/50" />
                          <span>{entry.execution_time}ms</span>
                        </>
                      )}
                      {entry.row_count !== null && (
                        <>
                          <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/50" />
                          <span>{entry.row_count} rows</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleCopySql(e, entry.sql)}
                      className="p-1.5 hover:bg-bg-3 text-text-secondary hover:text-text-primary rounded-md transition-colors"
                      title="Copy SQL"
                    >
                      <Copy size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteEntry(e, entry.id)}
                      className="p-1.5 hover:bg-error/10 text-text-secondary hover:text-error rounded-md transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
