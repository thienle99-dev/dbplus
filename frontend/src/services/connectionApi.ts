import api from './api';
import { Connection } from '../types';

export interface CreateConnectionRequest {
    name: string;
    type: 'postgres' | 'mysql' | 'mongo' | 'redis';
    host: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    ssl?: boolean;
}

export interface UpdateConnectionRequest extends Partial<CreateConnectionRequest> {
    id: string;
}

export const connectionApi = {
    // Get all connections
    getAll: async (): Promise<Connection[]> => {
        const response = await api.get('/api/connections');
        return response.data;
    },

    // Get single connection by ID
    getById: async (id: string): Promise<Connection> => {
        const response = await api.get(`/api/connections/${id}`);
        return response.data;
    },

    // Create new connection
    create: async (data: CreateConnectionRequest): Promise<Connection> => {
        const response = await api.post('/api/connections', data);
        return response.data;
    },

    // Update existing connection
    update: async (id: string, data: Partial<CreateConnectionRequest>): Promise<Connection> => {
        const response = await api.put(`/api/connections/${id}`, data);
        return response.data;
    },

    // Delete connection
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/connections/${id}`);
    },

    // Test connection
    test: async (id: string): Promise<{ success: boolean; message?: string }> => {
        const response = await api.post(`/api/connections/${id}/test`);
        return response.data;
    },

    // Test connection parameters (ad-hoc)
    testDetails: async (data: CreateConnectionRequest): Promise<{ success: boolean; message?: string }> => {
        const payload = { ...data, ssl: data.ssl ?? false };
        const response = await api.post('/api/connections/test', payload);
        return response.data;
    },

    getDatabases: async (id: string): Promise<string[]> => {
        const response = await api.get(`/api/connections/${id}/databases`);
        return response.data;
    },

    // Get all schemas
    getSchemas: async (id: string): Promise<string[]> => {
        const response = await api.get(`/api/connections/${id}/schemas`);
        return response.data;
    },

    getSchemaMetadata: async (id: string, schema: string): Promise<Array<{ table_name: string; columns: string[] }>> => {
        const response = await api.get(`/api/connections/${id}/schema-metadata`, { params: { schema } });
        return response.data;
    },
    // Get table constraints (FKs, etc.)
    getTableConstraints: async (id: string, schema: string, table: string): Promise<any> => {
        // Use 'any' or import TableConstraints from types
        const response = await api.get(`/api/connections/${id}/constraints`, { params: { schema, table } });
        return response.data;
    },
};
