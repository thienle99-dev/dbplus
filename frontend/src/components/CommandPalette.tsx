import React, { useEffect, useState, useRef } from 'react';
import { Search, Database, ArrowRight, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { connectionApi } from '../services/connectionApi';
import { useToast } from '../context/ToastContext';
import CreateDatabaseModal from './connections/CreateDatabaseModal';
import { useQueryClient } from '@tanstack/react-query';
import { useConnectionStore } from '../store/connectionStore';
import { useWorkspaceTabsStore } from '../store/workspaceTabsStore';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { connectionId } = useParams();
    const [searchTerm, setSearchTerm] = useState('');
    const [databases, setDatabases] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [createDbOpen, setCreateDbOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const { showToast } = useToast();
    const queryClient = useQueryClient();
    const { connections, fetchConnections } = useConnectionStore();
    const { openTab, setTabLastPath } = useWorkspaceTabsStore();

    const refreshDatabases = async (id: string) => {
        setIsLoading(true);
        try {
            const dbs = await connectionApi.getDatabases(id);
            setDatabases(dbs);
            setSelectedIndex(0);
        } catch (err) {
            console.error(err);
            showToast('Failed to load databases', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch databases when opening
    useEffect(() => {
        if (isOpen && connectionId) {
            void refreshDatabases(connectionId);

            // Focus input
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, connectionId]);

    useEffect(() => {
        if (isOpen && connections.length === 0) {
            void fetchConnections();
        }
    }, [isOpen, connections.length, fetchConnections]);

    // Filter items
    const lowered = searchTerm.toLowerCase();
    const filteredConnections = connections.filter((c) =>
        `${c.name} ${c.host} ${c.database}`.toLowerCase().includes(lowered)
    );
    const filteredDatabases = databases.filter((db) => db.toLowerCase().includes(lowered));

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, filteredDatabases.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const selected = filteredDatabases[selectedIndex];
                if (selected) {
                    handleSelect(selected);
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredDatabases, selectedIndex]);

    const handleSelect = (db: string) => {
        if (!connectionId) return;
        const tabId = openTab(connectionId, db);
        setTabLastPath(tabId, `/workspace/${connectionId}/query`);
        void Promise.all([
            queryClient.invalidateQueries({ queryKey: ['schemas', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['tables', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['columns', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['tableData', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['indexes', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['constraints', connectionId] }),
            queryClient.invalidateQueries({ queryKey: ['tableStats', connectionId] }),
        ]);
        showToast(`Opened database '${db}'`, 'success');
        onClose();
    };

    const handleSelectConnection = (connectionIdToOpen: string) => {
        const conn = connections.find((c) => c.id === connectionIdToOpen);
        const tabId = openTab(connectionIdToOpen, conn?.database);
        setTabLastPath(tabId, `/workspace/${connectionIdToOpen}/query`);
        navigate(`/workspace/${connectionIdToOpen}/query`);
        onClose();
    };

    const handleOpenCreateDatabase = () => {
        if (!connectionId) return;
        setCreateDbOpen(true);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
            <div
                className="w-[600px] bg-bg-1 border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Search Input */}
                <div className="flex items-center px-4 py-3 border-b border-border bg-bg-2">
                    <Search className="text-text-secondary w-5 h-5 mr-3" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="flex-1 bg-transparent border-none outline-none text-text-primary placeholder-text-secondary text-lg"
                        placeholder="Search databases..."
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); setSelectedIndex(0); }}
                    />
                    <div className="flex items-center gap-1">
                        <kbd className="px-2 py-0.5 bg-bg-3 rounded text-[10px] text-text-secondary font-mono">ESC</kbd>
                    </div>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {isLoading ? (
                        <div className="text-center py-8 text-text-secondary">Loading databases...</div>
                    ) : (
                        <div className="space-y-2">
                            {filteredConnections.length > 0 && (
                                <div className="space-y-1">
                                    <div className="px-2 py-1 text-xs font-semibold text-text-secondary uppercase">Connections</div>
                                    {filteredConnections.map((c) => (
                                        <button
                                            key={c.id}
                                            onClick={() => handleSelectConnection(c.id)}
                                            className="w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors text-text-primary hover:bg-bg-2"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-1 rounded">
                                                    {c.type}
                                                </span>
                                                <span className="truncate">{c.name}</span>
                                                <span className="text-text-secondary">·</span>
                                                <span className="truncate text-text-secondary">{c.database}</span>
                                            </div>
                                            <ArrowRight size={14} className="text-text-secondary" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {connectionId && (
                                <div className="space-y-1">
                                    <div className="px-2 py-1 text-xs font-semibold text-text-secondary uppercase">Databases</div>
                                    {filteredDatabases.length > 0 ? (
                                        filteredDatabases.map((db, index) => (
                                            <button
                                                key={db}
                                                onClick={() => handleSelect(db)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded text-left transition-colors ${index === selectedIndex ? 'bg-accent text-white' : 'text-text-primary hover:bg-bg-2'
                                                    }`}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Database size={16} className={index === selectedIndex ? 'text-white' : 'text-text-secondary'} />
                                                    <span>{db}</span>
                                                </div>
                                                {index === selectedIndex && <ArrowRight size={14} />}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-center py-6 text-text-secondary">No databases found</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 bg-bg-2 border-t border-border text-xs text-text-secondary flex items-center justify-between gap-3">
                    <button
                        onClick={handleOpenCreateDatabase}
                        disabled={!connectionId}
                        className="inline-flex items-center gap-2 px-2 py-1 rounded text-text-secondary hover:text-text-primary hover:bg-bg-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Create database"
                    >
                        <Plus size={14} />
                        <span>Create database…</span>
                    </button>
                    {filteredDatabases.length > 0 ? (
                        <div className="flex items-center justify-end gap-4">
                            <span>Use <kbd className="font-mono">↑↓</kbd> to navigate</span>
                            <span><kbd className="font-mono">↵</kbd> to select</span>
                        </div>
                    ) : (
                        <span />
                    )}
                </div>
            </div>

            {connectionId && (
                <CreateDatabaseModal
                    open={createDbOpen}
                    onOpenChange={setCreateDbOpen}
                    connectionId={connectionId}
                    onCreated={async () => {
                        setSearchTerm('');
                        await refreshDatabases(connectionId);
                        showToast('Database list refreshed', 'info');
                    }}
                />
            )}
        </div>
    );
};
