import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from '../store/logStore';
import { queryCache } from './queryCache';
import { requestDeduplicator } from './requestDeduplicator';

// Determine if we are running in Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

// Helper to log requests/responses
const log = (type: 'request' | 'response' | 'error', message: string, data?: any) => {
    useLogStore.getState().addLog({ type, message, data });
};

// Route configurations
const TABLE_INFO_COMMANDS: Record<string, string> = {
    'constraints': 'get_table_constraints',
    'indexes': 'get_table_indexes',
    'table-stats': 'get_table_statistics',
    'triggers': 'get_table_triggers',
    'partitions': 'get_partitions',
    'dependencies': 'get_table_dependencies',
    'storage-info': 'get_storage_bloat_info',
    'fk-orphans': 'get_fk_orphans'
};

const SCHEMAS_COMMANDS: Record<string, string> = {
    'functions': 'schema_list_functions',
    'views': 'schema_list_views',
    'foreign-keys': 'schema_get_schema_foreign_keys'
};

// Helper to extract schema/table params
const extractTableParams = (url: string, data: any) => {
    const urlObj = new URL('http://d' + url);
    const get = (key: string) => data?.params?.[key] || urlObj.searchParams.get(key);
    return { schema: get('schema'), table: get('table') };
};

const handleConnectionRoutes = (method: string, url: string, data: any, connectionId: string): { command: string, args: any } | null => {
    const [path] = url.split('?');
    const matchString = `/api/connections/${connectionId}`;

    // Basic CRUD for connection resource - uses 'id' instead of 'connection_id'
    if (path === matchString) {
        if (method === 'GET') return { command: 'get_connection', args: { id: connectionId } };
        if (method === 'PUT') return { command: 'update_connection', args: { id: connectionId, request: data } };
        if (method === 'DELETE') return { command: 'delete_connection', args: { id: connectionId } };
    }

    // --- Core Operations ---
    if (path.endsWith('/version')) return { command: 'get_connection', args: { id: connectionId } };
    if (path.endsWith('/test') && method === 'POST') return { command: 'test_connection_by_id', args: { id: connectionId } };
    if (path.endsWith('/switch-database') && method === 'POST') return { command: 'switch_database', args: { id: connectionId, request: data } };
    if (path.endsWith('/execute')) return { command: 'execute_query', args: { connection_id: connectionId, request: { sql: data?.query || data?.sql, database: data?.database } } };
    if (path.endsWith('/export-ddl')) return { command: 'export_postgres_ddl', args: { connection_id: connectionId, request: data } };
    if (path.endsWith('/search')) return { command: 'search_objects', args: { connection_id: connectionId, request: { query: data?.params?.q ?? data?.q } } };

    // --- Database & Schema Management ---
    if (path.endsWith('/databases')) {
        if (method === 'GET') return { command: 'list_databases', args: { connection_id: connectionId } };
        if (method === 'POST') return { command: 'create_database', args: { connection_id: connectionId, request: data } };
    }
    const dbMatch = path.match(/\/databases\/([^/]+)$/);
    if (dbMatch && method === 'DELETE') return { command: 'drop_database', args: { connection_id: connectionId, name: dbMatch[1] } };

    if (path.endsWith('/schemas')) {
        if (method === 'GET') return { command: 'schema_list_schemas', args: { connection_id: connectionId } };
        if (method === 'POST') return { command: 'create_schema', args: { connection_id: connectionId, schema_name: data?.name } };
    }
    const schemaMatch = path.match(/\/schemas\/([^/]+)$/);
    if (schemaMatch && method === 'DELETE') return { command: 'drop_schema', args: { connection_id: connectionId, schema_name: schemaMatch[1] } };

    // --- Table Operations ---
    if (path.endsWith('/tables')) {
        if (method === 'GET') return { command: 'schema_list_tables', args: { connection_id: connectionId, schema: data?.params?.schema || data?.schema } };
        if (method === 'POST') return { command: 'create_table', args: { connection_id: connectionId, request: data } };
        if (method === 'DELETE') return { command: 'drop_table', args: { connection_id: connectionId, request: { schema: data?.params?.schema, table_name: data?.params?.table } } };
    }
    if (path.includes('/columns')) return { command: 'schema_get_columns', args: { connection_id: connectionId, ...extractTableParams(url, data) } };
    if (path.endsWith('/table-comment')) {
        if (method === 'GET') return { command: 'get_table_comment', args: { connection_id: connectionId, params: data?.params } };
        if (method === 'PUT') return { command: 'set_table_comment', args: { connection_id: connectionId, schema: data?.schema, table: data?.table, comment: data?.comment } };
    }

    // Table Data Query
    if (path.match(/\/query$/) || path.includes('/query?')) {
        if (method === 'GET') {
            const params = extractTableParams(url, data);
            const urlObj = new URL('http://d' + url);
            return {
                command: 'get_table_data',
                args: {
                    connection_id: connectionId,
                    request: {
                        schema: params.schema,
                        table: params.table,
                        limit: urlObj.searchParams.get('limit') ? parseInt(urlObj.searchParams.get('limit')!) : null,
                        offset: urlObj.searchParams.get('offset') ? parseInt(urlObj.searchParams.get('offset')!) : null
                    }
                }
            };
        }
    }

    // --- Automated Table Info Mappings ---
    for (const [key, command] of Object.entries(TABLE_INFO_COMMANDS)) {
        if (path.includes(`/${key}`)) {
            return { command, args: { connection_id: connectionId, params: extractTableParams(url, data) } };
        }
    }

    // --- Schema Objects (Views, Functions) ---
    for (const [key, command] of Object.entries(SCHEMAS_COMMANDS)) {
        if (path.endsWith(`/${key}`)) {
            return { command, args: { connection_id: connectionId, schema: data?.params?.schema || new URL('http://d' + url).searchParams.get('schema') } };
        }
    }
    if (path.endsWith('/view-definition')) return { command: 'schema_get_view_definition', args: { connection_id: connectionId, schema: data?.params?.schema, view: data?.params?.view } };
    if (path.endsWith('/function-definition')) return { command: 'schema_get_function_definition', args: { connection_id: connectionId, schema: data?.params?.schema, function: data?.params?.function } };

    // --- Sub-resources (Sessions, History, Snippets, Settings) ---
    if (path.endsWith('/sessions')) return { command: 'list_sessions', args: { connection_id: connectionId } };
    const sessionMatch = path.match(/\/sessions\/([^/]+)$/);
    if (sessionMatch && method === 'DELETE') return { command: 'kill_session', args: { connection_id: connectionId, pid: parseInt(sessionMatch[1]) } };

    if (path.endsWith('/history')) {
        if (method === 'GET') {
            const urlObj = new URL('http://d' + url);
            return {
                command: 'get_history',
                args: {
                    connection_id: connectionId,
                    limit: urlObj.searchParams.get('limit') ? parseInt(urlObj.searchParams.get('limit')!) : null
                }
            };
        }
        if (method === 'POST') return { command: 'add_history', args: { connection_id: connectionId, request: data } };
        if (method === 'DELETE') return { command: 'clear_history', args: { connection_id: connectionId } };
    }
    const historyEntryMatch = path.match(/\/history\/([^/]+)$/);
    if (historyEntryMatch && method === 'DELETE') {
        return { command: 'delete_history_entry', args: { connection_id: connectionId, entry_id: historyEntryMatch[1] } };
    }

    if (path.endsWith('/snippets')) {
        if (method === 'GET') return { command: 'list_snippets', args: { connection_id: connectionId } };
        if (method === 'POST') return { command: 'create_snippet', args: { connection_id: connectionId, snippet: data } };
    }
    if (path.endsWith('/settings') && method === 'GET') return { command: 'get_all_settings', args: { connection_id: connectionId } };

    // SQLite
    if (path.endsWith('/sqlite/attachments')) {
        if (method === 'GET') return { command: 'list_sqlite_attachments', args: { connection_id: connectionId } };
        if (method === 'POST') return { command: 'attach_sqlite_database', args: { connection_id: connectionId, request: data } };
    }
    const attachMatch = path.match(/\/sqlite\/attachments\/([^/]+)$/);
    if (attachMatch && method === 'DELETE') return { command: 'detach_sqlite_database', args: { connection_id: connectionId, name: attachMatch[1] } };

    // Permissions (Sub-routes)
    if (path.endsWith('/permissions')) {
        if (method === 'GET') return { command: 'get_table_permissions', args: { connection_id: connectionId, params: data?.params } };
    }
    if (path.endsWith('/roles')) return { command: 'list_roles', args: { connection_id: connectionId } };

    if (path.includes('/permissions/')) {
        const part = path.split('/').pop();
        if (part === 'table') return { command: 'get_table_permissions', args: { connection_id: connectionId, params: data?.params } };
        if (part === 'schema') return { command: 'get_schema_permissions', args: { connection_id: connectionId, params: data?.params } };
        if (part === 'function') return { command: 'get_function_permissions', args: { connection_id: connectionId, params: data?.params } };
    }

    return null;
};

const routeToCommand = (method: string, url: string, data?: any): { command: string, args: any } | null => {
    const [path] = url.split('?');

    // 1. Global (Non-connection) Routes
    if (path === '/api/connections/test' && method === 'POST') return { command: 'test_connection', args: { request: data } };
    if (path.includes('/api/connections') && !path.match(/\/api\/connections\/([^/]+)/)) {
        if (method === 'GET') return { command: 'list_connections', args: {} };
        if (method === 'POST') return { command: 'create_connection', args: { request: data } };
    }
    if (path === '/api/autocomplete' && method === 'POST') return { command: 'autocomplete_suggest', args: { request: data } };

    // Settings API
    if (path === '/api/settings') {
        if (method === 'GET') return { command: 'get_all_settings', args: {} };
    }
    const globalSettingMatch = path.match(/\/api\/settings\/([^/]+)$/);
    if (globalSettingMatch) {
        const key = globalSettingMatch[1];
        if (method === 'GET') return { command: 'get_setting', args: { key } };
        if (method === 'PUT') return { command: 'update_setting', args: { key, request: data } };
        if (method === 'DELETE') return { command: 'delete_setting', args: { key } };
    }
    if (path === '/api/settings/reset' && method === 'POST') return { command: 'reset_settings', args: {} };

    // Snippets API (Global)
    if (path === '/api/snippets') {
        if (method === 'GET') return { command: 'list_snippets', args: {} };
        if (method === 'POST') return { command: 'create_snippet', args: { request: data } };
    }
    const snippetMatch = path.match(/\/api\/snippets\/([^/]+)$/);
    if (snippetMatch) {
        const id = parseInt(snippetMatch[1]);
        if (method === 'PUT') return { command: 'update_snippet', args: { id, request: data } };
        if (method === 'DELETE') return { command: 'delete_snippet', args: { id } };
    }

    // 2. Connection-scoped Routes
    const connMatch = path.match(/\/api\/connections\/([^/]+)/);
    if (connMatch) {
        return handleConnectionRoutes(method, url, data, connMatch[1]);
    }

    return null;
};

const handleIpcError = (url: string, err: any) => {
    log('error', `Error ${url} (IPC): ${err}`, err);

    let errorData = err;
    // If the error is a string that looks like JSON, parse it for better structure
    if (typeof err === 'string' && err.startsWith('{')) {
        try {
            errorData = JSON.parse(err);
        } catch (e) {
            // Keep as string if parsing fails
        }
    }

    throw {
        response: {
            data: errorData,
            status: 500,
            statusText: 'Internal Server Error'
        },
        message: typeof err === 'string' ? err : (err.message || 'Unknown IPC Error'),
        config: { url }
    };
};

const api = {
    get: async <T = any>(url: string, config?: any): Promise<{ data: T; status: number; statusText: string }> => {
        log('request', `GET ${url}`, config);

        if (!isTauri) {
            const err = 'Not running in Tauri environment';
            log('error', `Error ${url}: ${err}`);
            throw new Error(err);
        }

        const route = routeToCommand('GET', url, config);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                return handleIpcError(url, err);
            }
        }

        const err = `No IPC route for GET ${url}`;
        console.warn(`[IPC Proxy] ${err}`);
        throw new Error(err);
    },
    post: async <T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number; statusText: string }> => {
        log('request', `POST ${url}`, { data, config });

        if (!isTauri) {
            const err = 'Not running in Tauri environment';
            log('error', `Error ${url}: ${err}`);
            throw new Error(err);
        }

        const route = routeToCommand('POST', url, data);
        if (route) {
            const isExecuteQuery = route.command === 'execute_query';
            const sql = data?.query || data?.sql;
            const isSelect = isExecuteQuery && sql?.trim()?.toLowerCase()?.startsWith('select');

            const [path] = url.split('?');
            const connMatch = path.match(/\/api\/connections\/([^/]+)/);
            const connectionId = connMatch ? connMatch[1] : null;

            if (isSelect && connectionId) {
                const cached = queryCache.get(connectionId, sql);
                if (cached) {
                    log('response', `200 OK ${url} (CACHE HIT)`, cached);
                    return { data: cached as unknown as T, status: 200, statusText: 'OK (Cached)' };
                }
            }

            try {
                const res = await requestDeduplicator.execute(`query:${connectionId}:${sql}`, async () => {
                    const result = await invoke(route.command, route.args);
                    if (isSelect && connectionId && result) {
                        queryCache.set(connectionId, sql, result as any);
                    }
                    return result;
                });

                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                return handleIpcError(url, err);
            }
        }

        const err = `No IPC route for POST ${url}`;
        console.warn(`[IPC Proxy] ${err}`);
        throw new Error(err);
    },
    put: async <T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number; statusText: string }> => {
        log('request', `PUT ${url}`, { data, config });

        if (!isTauri) {
            const err = 'Not running in Tauri environment';
            log('error', `Error ${url}: ${err}`);
            throw new Error(err);
        }

        const route = routeToCommand('PUT', url, data);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                return handleIpcError(url, err);
            }
        }

        const err = `No IPC route for PUT ${url}`;
        console.warn(`[IPC Proxy] ${err}`);
        throw new Error(err);
    },
    delete: async <T = any>(url: string, config?: any): Promise<{ data: T; status: number; statusText: string }> => {
        log('request', `DELETE ${url}`, config);

        if (!isTauri) {
            const err = 'Not running in Tauri environment';
            log('error', `Error ${url}: ${err}`);
            throw new Error(err);
        }

        const route = routeToCommand('DELETE', url, config);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                return handleIpcError(url, err);
            }
        }

        const err = `No IPC route for DELETE ${url}`;
        console.warn(`[IPC Proxy] ${err}`);
        throw new Error(err);
    },
    patch: async <T = any>(url: string, data?: any, config?: any): Promise<{ data: T; status: number; statusText: string }> => {
        log('request', `PATCH ${url}`, { data, config });

        if (!isTauri) {
            const err = 'Not running in Tauri environment';
            log('error', `Error ${url}: ${err}`);
            throw new Error(err);
        }

        const route = routeToCommand('PATCH', url, data);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                return handleIpcError(url, err);
            }
        }

        const err = `No IPC route for PATCH ${url}`;
        console.warn(`[IPC Proxy] ${err}`);
        throw new Error(err);
    },
    defaults: { baseURL: '' },
    interceptors: {
        request: { use: () => { } },
        response: { use: () => { } }
    }
};

export default api;
