import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Database, Code, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useConnectionStore } from '../store/connectionStore';
import { SavedQuery } from '../types';
import api from '../services/api';

interface ConnectionQueries {
    connectionId: string;
    connectionName: string;
    queries: SavedQuery[];
}

export const GlobalQueriesView: React.FC = () => {
    const navigate = useNavigate();
    const { connections } = useConnectionStore();
    const [allQueries, setAllQueries] = useState<ConnectionQueries[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedConnIds, setExpandedConnIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        const fetchAllQueries = async () => {
            setLoading(true);
            const results: ConnectionQueries[] = [];

            // Parallel fetch for all connections
            // Note: In a real prod app with many connections, we'd want to batch this or use a proper backend endpoint
            await Promise.all(connections.map(async (conn) => {
                try {
                    const { data } = await api.get<SavedQuery[]>(`/api/connections/${conn.id}/saved-queries`);
                    if (data && data.length > 0) {
                        results.push({
                            connectionId: conn.id,
                            connectionName: conn.name,
                            queries: data
                        });
                    }
                } catch (err) {
                    console.warn(`Failed to fetch queries for ${conn.name}`, err);
                }
            }));

            setAllQueries(results);
            setExpandedConnIds(new Set(results.map(r => r.connectionId))); // Expand all by default
            setLoading(false);
        };

        if (connections.length > 0) {
            fetchAllQueries();
        } else {
            setLoading(false);
        }
    }, [connections]);

    const filteredGroups = allQueries.map(group => {
        const filtered = group.queries.filter(q =>
            q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            q.sql.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return { ...group, queries: filtered };
    }).filter(group => group.queries.length > 0);

    const toggleGroup = (id: string) => {
        setExpandedConnIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <header className="mb-6 px-2">
                <h2 className="text-2xl font-black text-text-primary tracking-tight mb-4">Saved Queries</h2>

                <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="Search all queries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-bg-1 border border-border-light rounded-xl pl-10 pr-4 py-2.5 text-sm foocus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-2 pb-10">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-secondary">
                        <Loader2 size={24} className="animate-spin mb-2" />
                        <p className="text-xs uppercase tracking-wider font-bold">Loading Queries...</p>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="text-center py-20 border border-border-dashed rounded-2xl bg-bg-1">
                        <p className="text-text-secondary font-medium">No saved queries found.</p>
                        {searchTerm && <p className="text-xs text-text-disabled mt-1">Try a different search term.</p>}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredGroups.map(group => {
                            const isExpanded = expandedConnIds.has(group.connectionId);
                            return (
                                <div key={group.connectionId} className="bg-bg-1 border border-border-light rounded-2xl overflow-hidden shadow-sm">
                                    <div
                                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-bg-2 transition-colors border-b border-border-light/50"
                                        onClick={() => toggleGroup(group.connectionId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                                                <Database size={16} />
                                            </div>
                                            <h3 className="font-bold text-text-primary">{group.connectionName}</h3>
                                            <span className="px-2 py-0.5 rounded-full bg-bg-3 text-[10px] font-bold text-text-secondary">
                                                {group.queries.length}
                                            </span>
                                        </div>
                                        {isExpanded ? <ChevronDown size={16} className="text-text-secondary" /> : <ChevronRight size={16} className="text-text-secondary" />}
                                    </div>

                                    {isExpanded && (
                                        <div className="divide-y divide-border-light/50">
                                            {group.queries.map(q => (
                                                <div
                                                    key={q.id}
                                                    onClick={() => navigate(`/workspace/${group.connectionId}/query?savedQueryId=${q.id}`)}
                                                    className="p-4 hover:bg-bg-2 cursor-pointer group transition-colors flex items-start gap-3"
                                                >
                                                    <div className="mt-1 text-text-secondary group-hover:text-accent transition-colors">
                                                        <Code size={16} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <h4 className="font-semibold text-text-primary truncate pr-2 group-hover:text-accent transition-colors">
                                                                {q.name}
                                                            </h4>
                                                            {q.tags && q.tags.length > 0 && (
                                                                <div className="flex gap-1">
                                                                    {q.tags.slice(0, 2).map(tag => (
                                                                        <span key={tag} className="text-[10px] bg-bg-3 px-1.5 py-0.5 rounded text-text-secondary">
                                                                            {tag}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <p className="text-xs text-text-secondary line-clamp-2 font-mono bg-bg-0/50 p-1.5 rounded border border-border-light/50 group-hover:border-accent/20 transition-colors">
                                                            {q.sql}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
