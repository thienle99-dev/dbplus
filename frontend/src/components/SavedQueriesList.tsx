import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trash2, Plus, Search } from 'lucide-react';
import api from '../services/api';

export interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  sql: string;
  tags: string[] | null;
  metadata: Record<string, any> | null;
  updated_at: string;
}

export default function SavedQueriesList({
  onSelectQuery,
  embedded = false,
  searchTerm = ''
}: {
  onSelectQuery: (sql: string, metadata?: Record<string, any>) => void;
  embedded?: boolean;
  searchTerm?: string;
}) {
  const { connectionId } = useParams();
  const navigate = useNavigate();
  const [queries, setQueries] = useState<SavedQuery[]>([]);
  const [loading, setLoading] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  // Use either global search term (if embedded) or local search
  const activeSearch = embedded ? searchTerm : localSearch;

  useEffect(() => {
    if (connectionId) {
      fetchQueries();
    }
  }, [connectionId]);

  const fetchQueries = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/connections/${connectionId}/saved-queries`);
      setQueries(response.data);
    } catch (err: unknown) {
      console.error('Failed to fetch saved queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this saved query?')) return;

    try {
      await api.delete(`/api/connections/${connectionId}/saved-queries/${id}`);
      setQueries(queries.filter(q => q.id !== id));
    } catch (err: unknown) {
      alert('Failed to delete query');
    }
  };

  const filteredQueries = queries.filter(q =>
    q.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
    q.description?.toLowerCase().includes(activeSearch.toLowerCase()) ||
    q.tags?.some(tag => tag.toLowerCase().includes(activeSearch.toLowerCase()))
  );

  return (
    <div className={`flex flex-col h-full bg-bg-1 ${!embedded ? 'border-r border-border w-64' : ''}`}>
      {!embedded && (
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">Saved Queries</h2>
            <button
              onClick={() => navigate(`/workspace/${connectionId}/query`)}
              className="p-1 hover:bg-bg-2 rounded text-text-secondary hover:text-text-primary"
              title="New Query"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-text-secondary" />
            <input
              type="text"
              placeholder="Search queries..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full bg-bg-2 border border-border rounded pl-8 pr-3 py-1.5 text-sm text-text-primary focus:border-accent outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-text-secondary text-sm">Loading...</div>
        ) : filteredQueries.length === 0 ? (
          <div className="p-4 text-center text-text-secondary text-sm">No saved queries found</div>
        ) : (
          <div className="divide-y divide-border">
            {filteredQueries.map(query => (
              <div
                key={query.id}
                className="p-3 hover:bg-bg-2 cursor-pointer group transition-colors"
                onClick={() => onSelectQuery(query.sql, query.metadata || undefined)}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-medium text-text-primary text-sm truncate pr-2">{query.name}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDelete(query.id, e)}
                      className="p-1 hover:bg-error/10 hover:text-error rounded text-text-secondary"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {query.description && (
                  <p className="text-xs text-text-secondary line-clamp-2 mb-2">{query.description}</p>
                )}
                {query.tags && query.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {query.tags.map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 bg-bg-3 rounded text-[10px] text-text-secondary">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
