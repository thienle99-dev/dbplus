import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { TableColumn, QueryResult } from '../types';

export const useDatabases = (connectionId: string | undefined) => {
    return useQuery({
        queryKey: ['databases', connectionId],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/databases`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useSchemas = (connectionId: string | undefined) => {
    return useQuery({
        queryKey: ['schemas', connectionId],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/schemas`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useTables = (connectionId: string | undefined, schema: string | undefined) => {
    return useQuery({
        queryKey: ['tables', connectionId, schema],
        queryFn: async () => {
            if (!connectionId || !schema) return [];
            const { data } = await api.get<string[]>(`/api/connections/${connectionId}/tables?schema=${schema}`);
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
    return useQuery({
        queryKey: ['tableData', connectionId, schema, table, limit, offset],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return null;
            const { data } = await api.get<QueryResult>(
                `/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${limit}&offset=${offset}`
            );
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new page
    });
};

export const useColumns = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    return useQuery({
        queryKey: ['columns', connectionId, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [];
            const { data } = await api.get<TableColumn[]>(`/api/connections/${connectionId}/columns?schema=${schema}&table=${table}`);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useIndexes = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    return useQuery({
        queryKey: ['indexes', connectionId, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [];
            const { data } = await api.get<any[]>(`/api/connections/${connectionId}/indexes?schema=${schema}&table=${table}`);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useConstraints = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    return useQuery({
        queryKey: ['constraints', connectionId, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return { foreign_keys: [], check_constraints: [], unique_constraints: [] };
            const { data } = await api.get<any>(`/api/connections/${connectionId}/constraints?schema=${schema}&table=${table}`);
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useTableStats = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    return useQuery({
        queryKey: ['tableStats', connectionId, schema, table],
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
