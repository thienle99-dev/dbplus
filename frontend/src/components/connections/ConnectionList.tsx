import React, { useState, useMemo } from 'react';
import { Connection } from '../../types';
import { SearchBar } from './SearchBar';
import { ConnectionItem } from './ConnectionItem';
import { useConnectionStore } from '../../store/connectionStore';
import { Database, Plus } from 'lucide-react';

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
            <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                onAdd={onAdd}
            />

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
