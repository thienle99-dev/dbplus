import { create } from 'zustand';
import { Connection } from '../types';
import { connectionApi } from '../services/connectionApi';

interface ConnectionState {
    connections: Connection[];
    activeConnectionId: string | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    setConnections: (connections: Connection[]) => void;
    addConnection: (connection: Connection) => void;
    updateConnection: (id: string, updates: Partial<Connection>) => void;
    deleteConnection: (id: string) => void;
    setActiveConnection: (id: string | null) => void;
    fetchConnections: () => Promise<void>;
    createConnection: (connection: Omit<Connection, 'id'>) => Promise<void>;
    testConnection: (id: string) => Promise<boolean>;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
    connections: [],
    activeConnectionId: null,
    isLoading: false,
    error: null,

    setConnections: (connections) => set({ connections }),

    addConnection: (connection) =>
        set((state) => ({
            connections: [...state.connections, connection],
        })),

    updateConnection: (id, updates) =>
        set((state) => ({
            connections: state.connections.map((conn) =>
                conn.id === id ? { ...conn, ...updates } : conn
            ),
        })),

    deleteConnection: (id) =>
        set((state) => ({
            connections: state.connections.filter((conn) => conn.id !== id),
            activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
        })),

    setActiveConnection: (id) => set({ activeConnectionId: id }),

    fetchConnections: async () => {
        set({ isLoading: true, error: null });
        try {
            const connections = await connectionApi.getAll();
            set({ connections, isLoading: false });
        } catch (error) {
            console.error('Failed to fetch connections:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to fetch connections',
                isLoading: false,
                // Fallback to empty array on error
                connections: []
            });
        }
    },

    createConnection: async (connectionData) => {
        set({ isLoading: true, error: null });
        try {
            const newConnection = await connectionApi.create({
                name: connectionData.name,
                type: connectionData.type,
                host: connectionData.host,
                database: connectionData.database,
            });

            set((state) => ({
                connections: [...state.connections, newConnection],
                isLoading: false,
            }));
        } catch (error) {
            console.error('Failed to create connection:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to create connection',
                isLoading: false
            });
            throw error; // Re-throw to allow UI to handle
        }
    },

    testConnection: async (id: string) => {
        try {
            const result = await connectionApi.test(id);
            return result.success;
        } catch (error) {
            console.error('Failed to test connection:', error);
            return false;
        }
    },
}));
