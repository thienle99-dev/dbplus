import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from '../store/logStore';

// Determine if we are running in Tauri
const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

// Helper to log requests/responses
const log = (type: 'request' | 'response' | 'error', message: string, data?: any) => {
    useLogStore.getState().addLog({ type, message, data });
};

// Map URL patterns to Tauri commands
const routeToCommand = (method: string, url: string, data?: any): { command: string, args: any } | null => {
    // Connection ID extraction
    const connMatch = url.match(/\/api\/connections\/([^/]+)/);
    const connectionId = connMatch ? connMatch[1] : null;

    if (url.includes('/api/connections') && method === 'GET' && !connectionId) {
        return { command: 'list_connections', args: {} };
    }

    if (connectionId) {
        // Core connection routes
        if (url.endsWith('/version')) return { command: 'get_connection', args: { id: connectionId } };
        if (url.endsWith('/test') && method === 'POST') return { command: 'test_connection_by_id', args: { id: connectionId } };
        if (url.endsWith('/switch-database') && method === 'POST') return { command: 'switch_database', args: { id: connectionId, request: data } };

        // Database/Schema management
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

        // Table operations
        if (url.endsWith('/tables')) {
            if (method === 'GET') return { command: 'schema_list_tables', args: { connectionId, schema: data?.params?.schema || data?.schema } };
            if (method === 'POST') return { command: 'create_table', args: { connectionId, request: data } };
            if (method === 'DELETE') return { command: 'drop_table', args: { connectionId, request: { schema: data?.params?.schema, table_name: data?.params?.table } } };
        }
        if (url.endsWith('/columns')) return { command: 'schema_get_columns', args: { connectionId, schema: data?.params?.schema, table: data?.params?.table } };
        if (url.endsWith('/constraints')) return { command: 'get_table_constraints', args: { connectionId, params: data?.params } };
        if (url.endsWith('/functions')) return { command: 'schema_list_functions', args: { connectionId, schema: data?.params?.schema } };

        // Query execution
        if (url.endsWith('/execute')) return { command: 'execute_query', args: { connectionId, sql: data?.sql, options: data?.options } };

        // DDL Export
        if (url.endsWith('/export-ddl')) return { command: 'export_ddl', args: { connectionId, request: data } };

        // Sessions
        if (url.endsWith('/sessions')) return { command: 'list_sessions', args: { connectionId } };
        const sessionMatch = url.match(/\/sessions\/([^/]+)$/);
        if (sessionMatch && method === 'DELETE') return { command: 'kill_session', args: { connectionId, pid: parseInt(sessionMatch[1]) } };

        // History
        if (url.endsWith('/history')) {
            if (method === 'GET') return { command: 'get_history', args: { id: connectionId } };
            if (method === 'POST') return { command: 'add_history', args: { id: connectionId, entry: data } };
        }

        // Snippets
        if (url.endsWith('/snippets')) {
            if (method === 'GET') return { command: 'list_snippets', args: { connectionId } };
            if (method === 'POST') return { command: 'create_snippet', args: { connectionId, snippet: data } };
        }

        // Settings
        if (url.endsWith('/settings')) {
            if (method === 'GET') return { command: 'get_all_settings', args: { connectionId } };
        }

        // SQLite Specific
        if (url.endsWith('/sqlite/attachments')) {
            if (method === 'GET') return { command: 'list_sqlite_attachments', args: { connectionId } };
            if (method === 'POST') return { command: 'attach_sqlite_database', args: { connectionId, request: data } };
        }
        const attachMatch = url.match(/\/sqlite\/attachments\/([^/]+)$/);
        if (attachMatch && method === 'DELETE') return { command: 'detach_sqlite_database', args: { connectionId, name: attachMatch[1] } };

        // Permissions & Specialized Info
        if (url.includes('/permissions/')) {
            const part = url.split('/').pop();
            if (part === 'table') return { command: 'get_table_permissions', args: { connectionId, params: data?.params } };
            if (part === 'schema') return { command: 'get_schema_permissions', args: { connectionId, params: data?.params } };
            if (part === 'function') return { command: 'get_function_permissions', args: { connectionId, params: data?.params } };
        }
        if (url.endsWith('/storage/bloat')) return { command: 'get_storage_bloat_info', args: { connectionId, params: data?.params } };
        if (url.endsWith('/fk-orphans')) return { command: 'get_fk_orphans', args: { connectionId, params: data?.params } };
    }

    // Global routes
    if (url === '/api/connections/test' && method === 'POST') return { command: 'test_connection', args: { request: data } };
    if (url === '/api/autocomplete' && method === 'POST') return { command: 'autocomplete_suggest', args: { request: data } };
    
    if (url === '/api/settings') {
        if (method === 'GET') return { command: 'get_all_settings', args: {} };
    }
    const globalSettingMatch = url.match(/\/api\/settings\/([^/]+)$/);
    if (globalSettingMatch) {
        if (method === 'GET') return { command: 'get_setting', args: { key: globalSettingMatch[1] } };
        if (method === 'PUT') return { command: 'update_setting', args: { key: globalSettingMatch[1], request: data } };
        if (method === 'DELETE') return { command: 'delete_setting', args: { key: globalSettingMatch[1] } };
    }
    if (url === '/api/settings/reset' && method === 'POST') return { command: 'reset_settings', args: {} };

    if (url === '/api/snippets') {
        if (method === 'GET') return { command: 'list_snippets', args: {} };
        if (method === 'POST') return { command: 'create_snippet', args: { request: data } };
    }
    const snippetMatch = url.match(/\/api\/snippets\/([^/]+)$/);
    if (snippetMatch) {
        if (method === 'PUT') return { command: 'update_snippet', args: { id: parseInt(snippetMatch[1]), request: data } };
        if (method === 'DELETE') return { command: 'delete_snippet', args: { id: parseInt(snippetMatch[1]) } };
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
            try {
                const res = await invoke(route.command, route.args);
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
        request: { use: () => {} },
        response: { use: () => {} }
    }
};

export default api;
