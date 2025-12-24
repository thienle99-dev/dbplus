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
        const { data } = await api.get<Connection[]>('/api/connections');
        return data;
    },

    // Get single connection by ID
    getById: async (id: string): Promise<Connection> => {
        const { data } = await api.get<Connection>(`/api/connections/${id}`);
        return data;
    },

    // Create new connection
    create: async (data: CreateConnectionRequest): Promise<Connection> => {
        const { data: res } = await api.post<Connection>('/api/connections', data);
        return res;
    },

    // Update existing connection
    update: async (id: string, data: Partial<CreateConnectionRequest>): Promise<Connection> => {
        const { data: res } = await api.put<Connection>(`/api/connections/${id}`, data);
        return res;
    },

    switchDatabase: async (id: string, database: string): Promise<Connection> => {
        const { data: res } = await api.post<Connection>(`/api/connections/${id}/switch-database`, { database });
        return res;
    },

    // Delete connection
    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/connections/${id}`);
    },

    // Test connection
    test: async (id: string): Promise<{ success: boolean; message?: string }> => {
        const { data } = await api.post(`/api/connections/${id}/test`);
        return data;
    },

    // Test connection parameters (ad-hoc)
    testDetails: async (data: CreateConnectionRequest): Promise<{ success: boolean; message?: string }> => {
        const payload = { ...data, ssl: data.ssl ?? false };
        const { data: res } = await api.post('/api/connections/test', payload);
        return res;
    },

    getDatabases: async (id: string): Promise<string[]> => {
        const { data } = await api.get<string[]>(`/api/connections/${id}/databases`);
        return data;
    },

    createDatabase: async (
        id: string,
        request: string | CreateDatabaseRequest
    ): Promise<DatabaseManagementResponse> => {
        const payload: CreateDatabaseRequest =
            typeof request === 'string' ? { name: request } : request;
        await api.post(`/api/connections/${id}/databases`, payload);
        return { success: true, message: 'Database created successfully' };
    },

    dropDatabase: async (id: string, name: string): Promise<void> => {
        await api.delete(`/api/connections/${id}/databases/${name}`);
    },

    // Get all schemas
    getSchemas: async (id: string, options?: { database?: string }): Promise<string[]> => {
        const { data } = await api.get<string[]>(`/api/connections/${id}/schemas`);
        return data;
    },

    createSchema: async (id: string, name: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        await api.post(`/api/connections/${id}/schemas`, { name });
        return { success: true, message: 'Schema created successfully' };
    },

    createTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        await api.post(`/api/connections/${id}/tables`, { 
            schema, 
            table_name: table,
            columns: [] 
        });
        return { success: true, message: 'Table created successfully' };
    },

    dropTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<void> => {
        await api.delete(`/api/connections/${id}/tables?schema=${schema}&table=${table}`);
    },

    dropSchema: async (id: string, name: string, options?: { database?: string }): Promise<void> => {
        await api.delete(`/api/connections/${id}/schemas/${name}`);
    },

    getSchemaMetadata: async (id: string, schema: string): Promise<Array<{ table_name: string; columns: string[] }>> => {
        const { data: tables } = await api.get<Array<{ name: string }>>(`/api/connections/${id}/tables`, { 
            params: { schema } 
        });
        
        // Get columns for each table
        const metadata = await Promise.all(
            tables.map(async (table: { name: string }) => {
                const { data: columns } = await api.get<Array<{ name: string }>>(`/api/connections/${id}/columns`, {
                    params: { schema, table: table.name }
                });
                return {
                    table_name: table.name,
                    columns: columns.map((c: { name: string }) => c.name)
                };
            })
        );
        
        return metadata;
    },

    // Get table constraints (FKs, etc.)
    getTableConstraints: async (id: string, schema: string, table: string): Promise<any> => {
        const { data } = await api.get(`/api/connections/${id}/constraints`, { 
            params: { schema, table } 
        });
        return data;
    },

    listSqliteAttachments: async (id: string): Promise<SqliteAttachment[]> => {
        const { data } = await api.get<SqliteAttachment[]>(`/api/connections/${id}/sqlite/attachments`);
        return data;
    },

    createSqliteAttachment: async (
        id: string,
        payload: { name: string; file_path: string; read_only?: boolean }
    ): Promise<SqliteAttachment> => {
        await api.post(`/api/connections/${id}/sqlite/attachments`, { 
            name: payload.name, 
            file_path: payload.file_path, 
            read_only: payload.read_only ?? false 
        });
        return {
            name: payload.name,
            file_path: payload.file_path,
            read_only: payload.read_only ?? false
        };
    },

    deleteSqliteAttachment: async (id: string, name: string): Promise<void> => {
        await api.delete(`/api/connections/${id}/sqlite/attachments/${name}`);
    },

    getVersion: async (id: string): Promise<string> => {
        const { data } = await api.get<any>(`/api/connections/${id}/version`);
        return data.version || 'Unknown';
    },

    getAutocompleteSuggestions: async (data: {
        sql: string;
        cursor_pos: number;
        connection_id: string;
        database_name: string;
        active_schema?: string;
    }): Promise<Array<{ label: string, insert_text: string, kind: string, detail?: string, score: number }>> => {
        const { data: res } = await api.post('/api/autocomplete', data);
        return res;
    },

    // Permissions
    getRoles: async (id: string): Promise<Array<{ name: string; can_login: boolean }>> => {
        const { data } = await api.get(`/api/connections/${id}/roles`);
        return data;
    },

    // Permissions
    getTablePermissions: async (id: string, schema: string, table: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const { data } = await api.get<Array<{ grantee: string; privilege: string; is_grantable: boolean }>>(`/api/connections/${id}/permissions/table`, { 
            params: { schema, table } 
        });
        return data;
    },

    getSchemaPermissions: async (id: string, schema: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const { data } = await api.get<Array<{ grantee: string; privilege: string; is_grantable: boolean }>>(`/api/connections/${id}/permissions/schema`, { 
            params: { schema } 
        });
        return data;
    },

    getFunctionPermissions: async (id: string, schema: string, function_name: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        const { data } = await api.get<Array<{ grantee: string; privilege: string; is_grantable: boolean }>>(`/api/connections/${id}/permissions/function`, { 
            params: { schema, function: function_name } 
        });
        return data;
    },

    getTables: async (id: string, schema: string): Promise<Array<{ name: string; type: string }>> => {
        const { data } = await api.get<Array<{ name: string; type: string }>>(`/api/connections/${id}/tables`, { 
            params: { schema } 
        });
        return data;
    },

    listFunctions: async (id: string, schema: string): Promise<Array<{ name: string; return_type: string; argument_types: string[] }>> => {
        const { data } = await api.get<Array<{ name: string; return_type: string; argument_types: string[] }>>(`/api/connections/${id}/functions`, { 
            params: { schema } 
        });
        return data;
    },

    getStorageBloatInfo: async (id: string, schema: string, table: string): Promise<any> => {
        const { data } = await api.get(`/api/connections/${id}/storage/bloat`, { 
            params: { schema, table } 
        });
        return data;
    },

    getFkOrphans: async (id: string, schema: string, table: string): Promise<Array<{ constraint_name: string; foreign_key_columns: string[]; referenced_table: string; orphan_count: number }>> => {
        const { data } = await api.get<Array<{ constraint_name: string; foreign_key_columns: string[]; referenced_table: string; orphan_count: number }>>(`/api/connections/${id}/fk-orphans`, { 
            params: { schema, table } 
        });
        return data;
    },
};
