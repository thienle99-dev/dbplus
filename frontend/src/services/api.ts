import { invoke } from '@tauri-apps/api/core';
import { useLogStore } from '../store/logStore';

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
        if (url.endsWith('/version')) return { command: 'get_connection', args: { id: connectionId } };
        if (url.endsWith('/tables')) return { command: 'schema_list_tables', args: { connectionId, schema: data?.params?.schema } };
        if (url.endsWith('/columns')) return { command: 'schema_get_columns', args: { connectionId, schema: data?.params?.schema, table: data?.params?.table } };
        if (url.endsWith('/execute')) return { command: 'execute_query', args: { connectionId, sql: data?.sql, options: data?.options } };
        if (url.endsWith('/history')) {
            if (method === 'GET') return { command: 'get_history', args: { id: connectionId } };
            if (method === 'POST') return { command: 'add_history', args: { id: connectionId, entry: data } };
        }
        if (url.endsWith('/snippets')) {
            if (method === 'GET') return { command: 'list_snippets', args: { connectionId } };
            if (method === 'POST') return { command: 'create_snippet', args: { connectionId, snippet: data } };
        }
        if (url.endsWith('/settings')) {
            if (method === 'GET') return { command: 'get_all_settings', args: { connectionId } };
        }
    }

    return null;
};

const api = {
    get: async (url: string, config?: any) => {
        log('request', `GET ${url}`, config);
        const route = routeToCommand('GET', url, config);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url}`, res);
                return { data: res, status: 200 };
            } catch (err: any) {
                log('error', `Error ${url}: ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
            }
        }
        // Fallback or error
        console.warn(`[IPC Proxy] No route for GET ${url}`);
        throw new Error(`No IPC route for ${url}`);
    },
    post: async (url: string, data?: any, config?: any) => {
        log('request', `POST ${url}`, { data, config });
        const route = routeToCommand('POST', url, data);
        if (route) {
            try {
                const res = await invoke(route.command, route.args);
                log('response', `200 OK ${url}`, res);
                return { data: res, status: 200 };
            } catch (err: any) {
                log('error', `Error ${url}: ${err}`, err);
                throw { response: { data: err, status: 500 }, message: err };
            }
        }
        console.warn(`[IPC Proxy] No route for POST ${url}`);
        throw new Error(`No IPC route for ${url}`);
    },
    put: async (url: string, data?: any, config?: any) => {
        log('request', `PUT ${url}`, { data, config });
        throw new Error(`No IPC route for PUT ${url}`);
    },
    delete: async (url: string, config?: any) => {
        log('request', `DELETE ${url}`, config);
        throw new Error(`No IPC route for DELETE ${url}`);
    },
    defaults: { baseURL: '' },
    interceptors: {
        request: { use: () => {} },
        response: { use: () => {} }
    }
};

export default api;
