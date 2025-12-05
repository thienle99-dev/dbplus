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
    createConnection: (connection: Omit<Connection, 'id'>) => Promise<Connection>;
    testConnection: (id: string) => Promise<boolean>;
    testConnectionDetails: (connection: Omit<Connection, 'id'>) => Promise<{ success: boolean; message?: string }>;
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
                port: connectionData.port,
                database: connectionData.database,
                username: connectionData.username,
                password: connectionData.password,
                ssl: connectionData.ssl,
            });

            set((state) => ({
                connections: [...state.connections, newConnection],
                isLoading: false,
            }));
            return newConnection;
        } catch (error) {
            console.error('Failed to create connection:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to create connection',
                isLoading: false
            });
            throw error;
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

    testConnectionDetails: async (connectionData: Omit<Connection, 'id'>) => {
        try {
            const result = await connectionApi.testDetails({
                name: connectionData.name,
                type: connectionData.type,
                host: connectionData.host,
                port: connectionData.port,
                database: connectionData.database,
                username: connectionData.username,
                password: connectionData.password,
            });
            return result;
        } catch (error) {
            console.error('Failed to test connection details:', error);
            const message = error instanceof Error ? error.message : 'Connection failed';
            return { success: false, message };
        }
    },
}));
