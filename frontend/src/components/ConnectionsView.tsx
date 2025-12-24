import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Connection } from '../types';
import { ConnectionList } from './connections/ConnectionList';
import { useConnectionStore } from '../store/connectionStore';

interface MainLayoutContext {
    openNewConnection: () => void;
    editConnection: (conn: Connection) => void;
}

export const ConnectionsView: React.FC = () => {
    const navigate = useNavigate();
    const { connections, error, isLoading } = useConnectionStore();
    const { openNewConnection, editConnection } = useOutletContext<MainLayoutContext>();

    // Loading State
    if (isLoading && connections.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="text-text-secondary font-mono animate-pulse uppercase tracking-[0.2em] text-[10px]">Loading connections...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center justify-between px-6 pt-4 pb-1">
                <h2 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tight">Connections</h2>
            </header>

            <div className="flex-1 overflow-hidden">
                {error && (
                    <div className="mx-10 mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-[var(--color-error)] text-sm font-black uppercase tracking-wide glass">
                        {error}
                    </div>
                )}

                <ConnectionList
                    connections={connections}
                    onAdd={openNewConnection}
                    onOpen={(id) => navigate(`/workspace/${id}`)}
                    onEdit={editConnection}
                />
            </div>
        </div>
    );
};
