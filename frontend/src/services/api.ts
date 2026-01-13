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
    // Basic CRUD for connection resource
    const matchString = `/api/connections/${connectionId}`;
    if (url === matchString || url.startsWith(`${matchString}?`)) {
        if (method === 'GET') return { command: 'get_connection', args: { id: connectionId } };
        if (method === 'PUT') return { command: 'update_connection', args: { id: connectionId, request: data } };
        if (method === 'DELETE') return { command: 'delete_connection', args: { id: connectionId } };
    }

    // --- Core Operations ---
    if (url.endsWith('/version')) return { command: 'get_connection', args: { id: connectionId } };
    if (url.endsWith('/test') && method === 'POST') return { command: 'test_connection_by_id', args: { id: connectionId } };
    if (url.endsWith('/switch-database') && method === 'POST') return { command: 'switch_database', args: { id: connectionId, request: data } };
    if (url.endsWith('/execute')) return { command: 'execute_query', args: { connectionId, request: { sql: data?.query || data?.sql, database: data?.database } } };
    if (url.endsWith('/export-ddl')) return { command: 'export_ddl', args: { connectionId, request: data } };
    if (url.endsWith('/search')) return { command: 'search_objects', args: { connectionId, request: { query: data?.params?.q ?? data?.q } } };

    // --- Database & Schema Management ---
    if (url.endsWith('/databases')) {
        if (method === 'GET') return { command: 'list_databases', args: { connectionId } };
        if (method === 'POST') return { command: 'create_database', args: { connectionId, request: data } };
    }
    const dbMatch = url.match(/\/databases\/([^/]+)$/);
    if (dbMatch && method === 'DELETE') return { command: 'drop_database', args: { connectionId, name: dbMatch[1] } };

    if (url.endsWith('/schemas')) {
        if (method === 'GET') return { command: 'schema_list_schemas', args: { connectionId } };
        if (method === 'POST') return { command: 'create_schema', args: { connectionId, schemaName: data?.name } };
    }
    const schemaMatch = url.match(/\/schemas\/([^/]+)$/);
    if (schemaMatch && method === 'DELETE') return { command: 'drop_schema', args: { connectionId, schemaName: schemaMatch[1] } };

    // --- Table Operations ---
    if (url.endsWith('/tables')) {
        if (method === 'GET') return { command: 'schema_list_tables', args: { connectionId, schema: data?.params?.schema || data?.schema } };
        if (method === 'POST') return { command: 'create_table', args: { connectionId, request: data } };
        if (method === 'DELETE') return { command: 'drop_table', args: { connectionId, request: { schema: data?.params?.schema, table_name: data?.params?.table } } };
    }
    if (url.includes('/columns')) return { command: 'schema_get_columns', args: { connectionId, ...extractTableParams(url, data) } };
    if (url.endsWith('/table-comment')) {
        if (method === 'GET') return { command: 'get_table_comment', args: { connectionId, params: data?.params } };
        if (method === 'PUT') return { command: 'set_table_comment', args: { connectionId, schema: data?.schema, table: data?.table, comment: data?.comment } };
    }

    // Table Data Query
    if (url.match(/\/query\?/)) {
        if (method === 'GET') {
            const params = extractTableParams(url, data);
            const urlObj = new URL('http://d' + url);
            return {
                command: 'get_table_data',
                args: {
                    connectionId,
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
        if (url.includes(`/${key}`)) {
            return { command, args: { connectionId, params: extractTableParams(url, data) } };
        }
    }

    // --- Schema Objects (Views, Functions) ---
    for (const [key, command] of Object.entries(SCHEMAS_COMMANDS)) {
        if (url.endsWith(`/${key}`)) {
            return { command, args: { connectionId, schema: data?.params?.schema } };
        }
    }
    if (url.endsWith('/view-definition')) return { command: 'schema_get_view_definition', args: { connectionId, schema: data?.params?.schema, view: data?.params?.view } };
    if (url.endsWith('/function-definition')) return { command: 'schema_get_function_definition', args: { connectionId, schema: data?.params?.schema, function: data?.params?.function } };

    // --- Sub-resources (Sessions, History, Snippets, Settings) ---
    if (url.endsWith('/sessions')) return { command: 'list_sessions', args: { connectionId } };
    const sessionMatch = url.match(/\/sessions\/([^/]+)$/);
    if (sessionMatch && method === 'DELETE') return { command: 'kill_session', args: { connectionId, pid: parseInt(sessionMatch[1]) } };

    if (url.endsWith('/history')) {
        if (method === 'GET') return { command: 'get_history', args: { id: connectionId } };
        if (method === 'POST') return { command: 'add_history', args: { id: connectionId, entry: data } };
    }
    if (url.endsWith('/snippets')) {
        if (method === 'GET') return { command: 'list_snippets', args: { connectionId } };
        if (method === 'POST') return { command: 'create_snippet', args: { connectionId, snippet: data } };
    }
    if (url.endsWith('/settings') && method === 'GET') return { command: 'get_all_settings', args: { connectionId } };

    // SQLite
    if (url.endsWith('/sqlite/attachments')) {
        if (method === 'GET') return { command: 'list_sqlite_attachments', args: { connectionId } };
        if (method === 'POST') return { command: 'attach_sqlite_database', args: { connectionId, request: data } };
    }
    const attachMatch = url.match(/\/sqlite\/attachments\/([^/]+)$/);
    if (attachMatch && method === 'DELETE') return { command: 'detach_sqlite_database', args: { connectionId, name: attachMatch[1] } };

    // Permissions (Sub-routes)
    if (url.endsWith('/permissions')) {
        if (method === 'GET') return { command: 'get_table_permissions', args: { connectionId, params: data?.params } };
    }
    if (url.endsWith('/roles')) return { command: 'list_roles', args: { connectionId } };

    if (url.includes('/permissions/')) {
        const part = url.split('/').pop();
        if (part === 'table') return { command: 'get_table_permissions', args: { connectionId, params: data?.params } };
        if (part === 'schema') return { command: 'get_schema_permissions', args: { connectionId, params: data?.params } };
        if (part === 'function') return { command: 'get_function_permissions', args: { connectionId, params: data?.params } };
    }

    // Legacy / mismatch handling
    if (url.endsWith('/storage/bloat')) return { command: 'get_storage_bloat_info', args: { connectionId, params: extractTableParams(url, data) } }; // Keeping for compatibility

    return null;
};

const routeToCommand = (method: string, url: string, data?: any): { command: string, args: any } | null => {
    // 1. Global (Non-connection) Routes
    if (url === '/api/connections/test' && method === 'POST') return { command: 'test_connection', args: { request: data } };
    if (url.includes('/api/connections') && !url.match(/\/api\/connections\/([^/]+)/)) {
        if (method === 'GET') return { command: 'list_connections', args: {} };
        if (method === 'POST') return { command: 'create_connection', args: { request: data } };
    }
    if (url === '/api/autocomplete' && method === 'POST') return { command: 'autocomplete_suggest', args: { request: data } };

    // Settings API
    if (url === '/api/settings') {
        if (method === 'GET') return { command: 'get_all_settings', args: {} };
    }
    const globalSettingMatch = url.match(/\/api\/settings\/([^/]+)$/);
    if (globalSettingMatch) {
        const key = globalSettingMatch[1];
        if (method === 'GET') return { command: 'get_setting', args: { key } };
        if (method === 'PUT') return { command: 'update_setting', args: { key, request: data } };
        if (method === 'DELETE') return { command: 'delete_setting', args: { key } };
    }
    if (url === '/api/settings/reset' && method === 'POST') return { command: 'reset_settings', args: {} };

    // Snippets API (Global)
    if (url === '/api/snippets') {
        if (method === 'GET') return { command: 'list_snippets', args: {} };
        if (method === 'POST') return { command: 'create_snippet', args: { request: data } };
    }
    const snippetMatch = url.match(/\/api\/snippets\/([^/]+)$/);
    if (snippetMatch) {
        const id = parseInt(snippetMatch[1]);
        if (method === 'PUT') return { command: 'update_snippet', args: { id, request: data } };
        if (method === 'DELETE') return { command: 'delete_snippet', args: { id } };
    }

    // 2. Connection-scoped Routes
    const connMatch = url.match(/\/api\/connections\/([^/]+)/);
    if (connMatch) {
        return handleConnectionRoutes(method, url, data, connMatch[1]);
    }

    return null;
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
                log('error', `Error ${url} (IPC): ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
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
            // 🔥 OPTIMIZED: Query Caching for SELECT queries
            const isExecuteQuery = route.command === 'execute_query';
            const sql = data?.query || data?.sql;
            const isSelect = isExecuteQuery && sql?.trim()?.toLowerCase()?.startsWith('select');

            const connMatch = url.match(/\/api\/connections\/([^/]+)/);
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

                    // Cache the result if it was a SELECT query
                    if (isSelect && connectionId && result) {
                        queryCache.set(connectionId, sql, result as any);
                    }
                    return result;
                });

                log('response', `200 OK ${url} (IPC)`, res);
                return { data: res as T, status: 200, statusText: 'OK' };
            } catch (err: any) {
                log('error', `Error ${url} (IPC): ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
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
                log('error', `Error ${url} (IPC): ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
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
                log('error', `Error ${url} (IPC): ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
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
                log('error', `Error ${url} (IPC): ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
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
