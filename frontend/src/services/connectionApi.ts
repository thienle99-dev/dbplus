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
    getSchemas: async (id: string, options?: { database?: string }): Promise<string[]> => {
        const response = await api.get(`/api/connections/${id}/schemas`, { params: options });
        return response.data;
    },

    createSchema: async (id: string, name: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/api/connections/${id}/schemas`, { name }, { params: options });
        return response.data;
    },

    createTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/api/connections/${id}/tables`, { schema, table, database: options?.database });
        return response.data;
    },

    dropTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<void> => {
        await api.delete(`/api/connections/${id}/tables`, {
            params: { schema, table, ...options },
        });
    },

    dropSchema: async (id: string, name: string, options?: { database?: string }): Promise<void> => {
        await api.delete(`/api/connections/${id}/schemas/${encodeURIComponent(name)}`, { params: options });
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

    // Permissions
    getRoles: async (id: string): Promise<Array<{ name: string; can_login: boolean }>> => {
        const response = await api.get(`/api/connections/${id}/roles`);
        return response.data;
    },

    getTablePermissions: async (id: string, schema: string, table: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const response = await api.get(`/api/connections/${id}/permissions`, { params: { schema, table } });
        return response.data;
    },

    getSchemaPermissions: async (id: string, schema: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const response = await api.get(`/api/connections/${id}/permissions/schema`, { params: { schema } });
        return response.data;
    },

    getFunctionPermissions: async (id: string, schema: string, function_name: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const response = await api.get(`/api/connections/${id}/permissions/function`, { params: { schema, function: function_name } });
        return response.data;
    },

    getTables: async (id: string, schema: string): Promise<Array<{ name: string; type: string }>> => {
        const response = await api.get(`/api/connections/${id}/tables`, { params: { schema } });
        return response.data;
    },

    listFunctions: async (id: string, schema: string): Promise<Array<{ name: string; return_type: string; argument_types: string[] }>> => {
        const response = await api.get(`/api/connections/${id}/functions`, { params: { schema } });
        return response.data;
    },

    getStorageBloatInfo: async (id: string, schema: string, table: string): Promise<any> => {
        const response = await api.get(`/api/connections/${id}/storage-info`, { params: { schema, table } });
        return response.data;
    },

    getFkOrphans: async (id: string, schema: string, table: string): Promise<Array<{ constraint_name: string; foreign_key_columns: string[]; referenced_table: string; orphan_count: number }>> => {
        const response = await api.get(`/api/connections/${id}/health/orphans`, { params: { schema, table } });
        return response.data;
    },
};
