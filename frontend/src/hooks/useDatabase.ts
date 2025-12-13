import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { TableColumn, QueryResult } from '../types';
import { useActiveDatabaseOverride } from './useActiveDatabaseOverride';

export const useDatabases = (connectionId: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['databases', connectionId, dbKey],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/databases`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useSchemas = (connectionId: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['schemas', connectionId, dbKey],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/schemas`, {
                params: dbOverride ? { database: dbOverride } : undefined,
            });
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useTables = (connectionId: string | undefined, schema: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['tables', connectionId, dbKey, schema],
        queryFn: async () => {
            if (!connectionId || !schema) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/tables`, {
                params: dbOverride ? { schema, database: dbOverride } : { schema },
            });
            return data;
        },
        enabled: !!connectionId && !!schema,
    });
};

export const useTableData = (
    connectionId: string | undefined,
    schema: string | undefined,
    table: string | undefined,
    limit: number,
    offset: number
) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['tableData', connectionId, dbKey, schema, table, limit, offset],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return null;
            const { data } = await api.get<QueryResult>(`/api/connections/${connectionId}/query`, {
                params: dbOverride
                    ? { schema, table, limit, offset, database: dbOverride }
                    : { schema, table, limit, offset },
            });
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });
};

export const useColumns = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['columns', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [];
            const { data } = await api.get<TableColumn[]>(`/api/connections/${connectionId}/columns`, {
                params: dbOverride ? { schema, table, database: dbOverride } : { schema, table },
            });
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useIndexes = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['indexes', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [];
            const { data } = await api.get<any[]>(`/api/connections/${connectionId}/indexes?schema=${schema}&table=${table}`);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useConstraints = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['constraints', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return { foreign_keys: [], check_constraints: [], unique_constraints: [] };
            const { data } = await api.get<any>(`/api/connections/${connectionId}/constraints?schema=${schema}&table=${table}`);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useTableStats = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['tableStats', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return null;
            const { data } = await api.get<any>(`/api/connections/${connectionId}/table-stats?schema=${schema}&table=${table}`);
            console.log('[DEBUG] Table stats response:', data);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
        refetchOnWindowFocus: false,
    });
};
