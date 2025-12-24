import { invoke } from '@tauri-apps/api/core';
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
        return await invoke('list_connections');
    },

    // Get single connection by ID
    getById: async (id: string): Promise<Connection> => {
        return await invoke('get_connection', { id });
    },

    // Create new connection
    create: async (data: CreateConnectionRequest): Promise<Connection> => {
        return await invoke('create_connection', { request: data });
    },

    // Update existing connection
    update: async (id: string, data: Partial<CreateConnectionRequest>): Promise<Connection> => {
        return await invoke('update_connection', { id, request: data });
    },

    switchDatabase: async (id: string, database: string): Promise<Connection> => {
        return await invoke('switch_database', { id, request: { database } });
    },

    // Delete connection
    delete: async (id: string): Promise<void> => {
        await invoke('delete_connection', { id });
    },

    // Test connection
    test: async (id: string): Promise<{ success: boolean; message?: string }> => {
        return await invoke('test_connection_by_id', { id });
    },

    // Test connection parameters (ad-hoc)
    testDetails: async (data: CreateConnectionRequest): Promise<{ success: boolean; message?: string }> => {
        const payload = { ...data, ssl: data.ssl ?? false };
        return await invoke('test_connection', { request: payload });
    },

    getDatabases: async (id: string): Promise<string[]> => {
        return await invoke('list_databases', { connectionId: id });
    },

    createDatabase: async (
        id: string,
        request: string | CreateDatabaseRequest
    ): Promise<DatabaseManagementResponse> => {
        const payload: CreateDatabaseRequest =
            typeof request === 'string' ? { name: request } : request;
        await invoke('create_database', { connectionId: id, request: payload });
        return { success: true, message: 'Database created successfully' };
    },

    dropDatabase: async (id: string, name: string): Promise<void> => {
        await invoke('drop_database', { connectionId: id, name });
    },

    // Get all schemas
    getSchemas: async (id: string, options?: { database?: string }): Promise<string[]> => {
        return await invoke('schema_list_schemas', { connectionId: id });
    },

    createSchema: async (id: string, name: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        await invoke('create_schema', { connectionId: id, schemaName: name });
        return { success: true, message: 'Schema created successfully' };
    },

    createTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<{ success: boolean; message: string }> => {
        await invoke('create_table', { 
            connectionId: id, 
            request: { 
                schema, 
                table_name: table,
                columns: [] // This would need to be passed from the caller
            } 
        });
        return { success: true, message: 'Table created successfully' };
    },

    dropTable: async (id: string, schema: string, table: string, options?: { database?: string }): Promise<void> => {
        await invoke('drop_table', { 
            connectionId: id, 
            request: { schema, table_name: table } 
        });
    },

    dropSchema: async (id: string, name: string, options?: { database?: string }): Promise<void> => {
        await invoke('drop_schema', { connectionId: id, schemaName: name });
    },

    getSchemaMetadata: async (id: string, schema: string): Promise<Array<{ table_name: string; columns: string[] }>> => {
        const tables = await invoke<Array<{ name: string }>>('schema_list_tables', { 
            connectionId: id, 
            schema 
        });
        
        // Get columns for each table
        const metadata = await Promise.all(
            tables.map(async (table) => {
                const columns = await invoke<Array<{ name: string }>>('schema_get_columns', {
                    connectionId: id,
                    schema,
                    table: table.name
                });
                return {
                    table_name: table.name,
                    columns: columns.map(c => c.name)
                };
            })
        );
        
        return metadata;
    },

    // Get table constraints (FKs, etc.)
    getTableConstraints: async (id: string, schema: string, table: string): Promise<any> => {
        return await invoke('get_table_constraints', { 
            connectionId: id, 
            params: { schema, table } 
        });
    },

    listSqliteAttachments: async (id: string): Promise<SqliteAttachment[]> => {
        return await invoke('list_sqlite_attachments', { connectionId: id });
    },

    createSqliteAttachment: async (
        id: string,
        payload: { name: string; file_path: string; read_only?: boolean }
    ): Promise<SqliteAttachment> => {
        await invoke('attach_sqlite_database', { 
            connectionId: id, 
            request: { 
                name: payload.name, 
                file_path: payload.file_path, 
                read_only: payload.read_only ?? false 
            } 
        });
        return {
            name: payload.name,
            file_path: payload.file_path,
            read_only: payload.read_only ?? false
        };
    },

    deleteSqliteAttachment: async (id: string, name: string): Promise<void> => {
        await invoke('detach_sqlite_database', { connectionId: id, name });
    },

    getVersion: async (id: string): Promise<string> => {
        const result = await invoke<{ version: string }>('get_connection', { id });
        return result.version || 'Unknown';
    },

    getAutocompleteSuggestions: async (data: {
        sql: string;
        cursor_pos: number;
        connection_id: string;
        database_name: string;
        active_schema?: string;
    }): Promise<Array<{ label: string, insert_text: string, kind: string, detail?: string, score: number }>> => {
        return await invoke('autocomplete_suggest', { request: data });
    },

    // Permissions
    getRoles: async (id: string): Promise<Array<{ name: string; can_login: boolean }>> => {
        return await invoke('list_roles', { connectionId: id });
    },

    getTablePermissions: async (id: string, schema: string, table: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        return await invoke('get_table_permissions', { 
            connectionId: id, 
            params: { schema, table } 
        });
    },

    getSchemaPermissions: async (id: string, schema: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        return await invoke('get_schema_permissions', { 
            connectionId: id, 
            params: { schema } 
        });
    },

    getFunctionPermissions: async (id: string, schema: string, function_name: string): Promise<Array<{ grantee: string; privilege: string; is_grantable: boolean }>> => {
        return await invoke('get_function_permissions', { 
            connectionId: id, 
            params: { schema, function: function_name } 
        });
    },

    getTables: async (id: string, schema: string): Promise<Array<{ name: string; type: string }>> => {
        return await invoke('schema_list_tables', { connectionId: id, schema });
    },

    listFunctions: async (id: string, schema: string): Promise<Array<{ name: string; return_type: string; argument_types: string[] }>> => {
        return await invoke('schema_list_functions', { connectionId: id, schema });
    },

    getStorageBloatInfo: async (id: string, schema: string, table: string): Promise<any> => {
        return await invoke('get_storage_bloat_info', { 
            connectionId: id, 
            params: { schema, table } 
        });
    },

    getFkOrphans: async (id: string, schema: string, table: string): Promise<Array<{ constraint_name: string; foreign_key_columns: string[]; referenced_table: string; orphan_count: number }>> => {
        return await invoke('get_fk_orphans', { 
            connectionId: id, 
            params: { schema, table } 
        });
    },
};
