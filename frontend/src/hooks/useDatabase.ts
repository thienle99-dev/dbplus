import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { QueryResult, RoleInfo, TableColumn, TableComment, TableGrant, TriggerInfo } from '../types';
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

export const useTriggers = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['triggers', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [];
            const { data } = await api.get<TriggerInfo[]>(`/api/connections/${connectionId}/triggers`, {
                params: { schema, table },
            });
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useTableComment = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['tableComment', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return { comment: null } as TableComment;
            const { data } = await api.get<TableComment>(`/api/connections/${connectionId}/table-comment`, {
                params: { schema, table },
            });
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useSetTableComment = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useMutation({
        mutationFn: async ({ schema, table, comment }: { schema: string; table: string; comment: string | null }) => {
            if (!connectionId) throw new Error('Missing connection id');
            await api.put(`/api/connections/${connectionId}/table-comment`, {
                schema,
                table,
                comment,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['tableComment', connectionId, dbKey, variables.schema, variables.table] });
        },
    });
};

export const usePermissions = (connectionId: string | undefined, schema: string | undefined, table: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['permissions', connectionId, dbKey, schema, table],
        queryFn: async () => {
            if (!connectionId || !schema || !table) return [] as TableGrant[];
            const { data } = await api.get<TableGrant[]>(`/api/connections/${connectionId}/permissions`, {
                params: { schema, table },
            });
            return data;
        },
        enabled: !!connectionId && !!schema && !!table,
    });
};

export const useRoles = (connectionId: string | undefined) => {
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useQuery({
        queryKey: ['roles', connectionId, dbKey],
        queryFn: async () => {
            if (!connectionId) return [] as RoleInfo[];
            const { data } = await api.get<RoleInfo[]>(`/api/connections/${connectionId}/roles`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useSetPermissions = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    const dbOverride = useActiveDatabaseOverride(connectionId);
    const dbKey = dbOverride ?? '__default__';
    return useMutation({
        mutationFn: async ({
            schema,
            table,
            grantee,
            privileges,
            grant_option,
        }: {
            schema: string;
            table: string;
            grantee: string;
            privileges: string[];
            grant_option: boolean;
        }) => {
            if (!connectionId) throw new Error('Missing connection id');
            await api.put(`/api/connections/${connectionId}/permissions`, {
                schema,
                table,
                grantee,
                privileges,
                grant_option,
            });
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ['permissions', connectionId, dbKey, variables.schema, variables.table] });
            queryClient.invalidateQueries({ queryKey: ['roles', connectionId, dbKey] });
        },
    });
};
