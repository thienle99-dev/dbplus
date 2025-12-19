import api from './api';
import { Connection, CreateDatabaseRequest, DatabaseManagementResponse } from '../types';

export interface CreateConnectionRequest {
    name: string;
    type: 'postgres' | 'sqlite' | 'mysql' | 'mongo' | 'redis';
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

export interface SqliteAttachment {
    name: string;
    file_path: string;
    read_only: boolean;
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

    switchDatabase: async (id: string, database: string): Promise<Connection> => {
        const response = await api.patch(`/api/connections/${id}/database`, { database });
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

    createDatabase: async (
        id: string,
        request: string | CreateDatabaseRequest
    ): Promise<DatabaseManagementResponse> => {
        const payload: CreateDatabaseRequest =
            typeof request === 'string' ? { name: request } : request;
        const response = await api.post(`/api/connections/${id}/databases`, payload);
        return response.data;
    },

    dropDatabase: async (id: string, name: string): Promise<void> => {
        await api.delete(`/api/connections/${id}/databases/${encodeURIComponent(name)}`);
    },

    // Get all schemas
    getSchemas: async (id: string): Promise<string[]> => {
        const response = await api.get(`/api/connections/${id}/schemas`);
        return response.data;
    },

    createSchema: async (id: string, name: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/api/connections/${id}/schemas`, { name });
        return response.data;
    },

    dropSchema: async (id: string, name: string): Promise<void> => {
        await api.delete(`/api/connections/${id}/schemas/${encodeURIComponent(name)}`);
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

    listSqliteAttachments: async (id: string): Promise<SqliteAttachment[]> => {
        const response = await api.get(`/api/connections/${id}/sqlite/attachments`);
        return response.data;
    },

    createSqliteAttachment: async (
        id: string,
        payload: { name: string; file_path: string; read_only?: boolean }
    ): Promise<SqliteAttachment> => {
        const response = await api.post(`/api/connections/${id}/sqlite/attachments`, {
            ...payload,
            read_only: payload.read_only ?? false,
        });
        return response.data;
    },

    deleteSqliteAttachment: async (id: string, name: string): Promise<void> => {
        await api.delete(`/api/connections/${id}/sqlite/attachments/${encodeURIComponent(name)}`);
    },

    getVersion: async (id: string): Promise<string> => {
        const response = await api.get(`/api/connections/${id}/version`);
        return response.data.version;
    },
    getAutocompleteSuggestions: async (data: {
        sql: string;
        cursor_pos: number;
        connection_id: string;
        database_name: string;
        active_schema?: string;
    }): Promise<Array<{ label: string, insert_text: string, kind: string, detail?: string, score: number }>> => {
        const response = await api.post('/api/autocomplete', data);
        return response.data;
    },
};
