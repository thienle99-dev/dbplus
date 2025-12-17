import React, { useState, useMemo } from 'react';
import { Connection } from '../../types';
import { SearchBar } from './SearchBar';
import { ConnectionItem } from './ConnectionItem';
import { useConnectionStore } from '../../store/connectionStore';

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
                        <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                        </svg>
                        <p className="text-sm text-center">
                            {searchQuery ? 'No connections found' : 'No connections yet'}
                        </p>
                        {!searchQuery && (
                            <button
                                onClick={onAdd}
                                className="mt-4 text-accent hover:text-accent-hover text-sm font-medium transition-colors"
                            >
                                Create your first connection
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 px-4 pb-4">
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
