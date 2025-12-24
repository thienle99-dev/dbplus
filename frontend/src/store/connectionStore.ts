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
    updateConnection: (id: string, updates: Partial<Connection>) => Promise<void>;
    deleteConnection: (id: string) => Promise<void>;
    setActiveConnection: (id: string | null) => void;
    fetchConnections: () => Promise<void>;
    createConnection: (connection: Omit<Connection, 'id'>) => Promise<Connection>;
    testConnection: (id: string) => Promise<boolean>;
    testConnectionDetails: (connection: Omit<Connection, 'id'> & { id?: string }) => Promise<{ success: boolean; message?: string }>;

    // Sorting
    sortOption: { field: 'name' | 'type' | 'host'; direction: 'asc' | 'desc' };
    setSortOption: (option: { field: 'name' | 'type' | 'host'; direction: 'asc' | 'desc' }) => void;
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

    updateConnection: async (id, updates) => {
        set({ isLoading: true, error: null });
        try {
            // Remove typically read-only fields before sending to API if necessary, 
            // but connectionApi.update takes Partial<CreateConnectionRequest>.
            // We assume updates contains valid editable fields.
            const updatedConnection = await connectionApi.update(id, updates as any);
            set((state) => ({
                connections: state.connections.map((conn) =>
                    conn.id === id ? updatedConnection : conn
                ),
                isLoading: false,
            }));
        } catch (error) {
            console.error('Failed to update connection:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to update connection',
                isLoading: false,
            });
        }
    },

    deleteConnection: async (id) => {
        set({ isLoading: true, error: null });
        try {
            await connectionApi.delete(id);
            set((state) => ({
                connections: state.connections.filter((conn) => conn.id !== id),
                activeConnectionId: state.activeConnectionId === id ? null : state.activeConnectionId,
                isLoading: false,
            }));
        } catch (error) {
            console.error('Failed to delete connection:', error);
            set({
                error: error instanceof Error ? error.message : 'Failed to delete connection',
                isLoading: false,
            });
        }
    },

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
                type: connectionData.type as any,
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

    testConnectionDetails: async (connectionData: Omit<Connection, 'id'> & { id?: string }) => {
        try {
            const result = await connectionApi.testDetails({
                name: connectionData.name,
                type: connectionData.type as any,
                host: connectionData.host,
                port: connectionData.port,
                database: connectionData.database,
                username: connectionData.username,
                password: connectionData.password,
                id: connectionData.id,
            });
            return result;
        } catch (error) {
            console.error('Failed to test connection details:', error);
            const message = error instanceof Error
                ? ((error as any).response?.data || error.message)
                : 'Connection failed';
            return { success: false, message: typeof message === 'string' ? message : JSON.stringify(message) };
        }
    },

    sortOption: { field: 'name', direction: 'asc' },
    setSortOption: (option) => set({ sortOption: option }),
}));
