import React, { useState, useMemo } from 'react';
import { Connection } from '../../types';
// import { SearchBar } from './SearchBar'; // Removed in favor of inline premium search
import { ConnectionItem } from './ConnectionItem';
import { useConnectionStore } from '../../store/connectionStore';
import { Database, Plus, Search } from 'lucide-react';

interface ConnectionListProps {
    connections: Connection[];
    onAdd: () => void;
    onOpen: (id: string) => void;
    onEdit: (connection: Connection) => void;
}

export const ConnectionList: React.FC<ConnectionListProps> = ({ connections, onAdd, onOpen, onEdit }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const { sortOption } = useConnectionStore();

    const filteredConnections = useMemo(() => {
        let result = connections;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = connections.filter(conn =>
                conn.name.toLowerCase().includes(query) ||
                conn.host.toLowerCase().includes(query) ||
                conn.database.toLowerCase().includes(query) ||
                conn.type.toLowerCase().includes(query)
            );
        }

        return [...result].sort((a, b) => {
            const fieldA = String(a[sortOption.field] || '').toLowerCase();
            const fieldB = String(b[sortOption.field] || '').toLowerCase();

            if (fieldA < fieldB) return sortOption.direction === 'asc' ? -1 : 1;
            if (fieldA > fieldB) return sortOption.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [connections, searchQuery, sortOption]);

    return (
        <div className="flex flex-col h-full">
            {/* Header Section */}
            <div className="flex flex-col gap-6 px-8 pt-8 pb-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-black tracking-tighter text-text-primary">Connections</h1>
                    <button
                        onClick={onAdd}
                        className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-accent/20 hover:shadow-accent/40 active:scale-95 transition-all duration-300 flex items-center gap-2 group"
                    >
                        <Plus size={16} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-300" />
                        New Connection
                    </button>
                </div>

                {/* Search Input */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                        <Search className="text-text-muted group-focus-within:text-accent transition-colors duration-300" size={20} />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search connections... (⌘F)"
                        className="w-full bg-bg-sunken hover:bg-bg-elevated focus:bg-bg-elevated border border-border-default focus:border-accent rounded-2xl py-4 pl-12 pr-4 text-[15px] font-medium text-text-primary placeholder:text-text-muted/70 outline-none transition-all shadow-sm focus:shadow-md focus:ring-1 focus:ring-accent/20"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {filteredConnections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-text-muted px-8">
                        <div className="w-20 h-20 rounded-full bg-bg-2 flex items-center justify-center mb-6">
                            <Database size={32} className="text-text-secondary opacity-50" />
                        </div>
                        <p className="text-lg font-bold text-text-primary mb-2">
                            {searchQuery ? 'No connections found' : 'No connections yet'}
                        </p>
                        <p className="text-sm text-text-secondary max-w-xs text-center leading-relaxed">
                            {searchQuery
                                ? "Try different keywords or filters to find what you're looking for."
                                : "Get started by creating your first database connection."}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onAdd}
                                className="mt-8 px-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-accent/20 hover:scale-105 transition-all duration-300 flex items-center gap-2"
                            >
                                <Plus size={14} strokeWidth={3} />
                                New Connection
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6 pt-2">
                        {filteredConnections.map((connection, index) => (
                            <ConnectionItem
                                key={connection.id}
                                connection={connection}
                                onOpen={onOpen}
                                onEdit={onEdit}
                                index={index}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
