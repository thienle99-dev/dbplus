import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { QueryResult, SavedQuery, SavedQueryFolder } from '../types';

export const useExecuteQuery = (connectionId: string | undefined) => {
    return useMutation({
        mutationFn: async ({
            query,
            schema,
            table,
            limit,
            offset,
            include_total_count,
        }: {
            query: string;
            schema?: string;
            table?: string;
            limit?: number;
            offset?: number;
            include_total_count?: boolean;
        }) => {
            if (!connectionId) throw new Error("Connection ID is required");

            // Build query params for GET request if it's a simple select (optional optimization, but keeping POST for generic execute is safer for now)
            // Sticking to the existing pattern: POST /execute with query body
            let url = `/api/connections/${connectionId}/execute`;

            // Should check if we need to use GET /query endpoint for table data browsing or POST /execute for SQL
            // Based on previous code, GET /query was used for table browsing with limit/offset
            if (limit !== undefined && offset !== undefined && schema && table) {
                const { data } = await api.get<QueryResult>(`/api/connections/${connectionId}/query?schema=${schema}&table=${table}&limit=${limit}&offset=${offset}`);
                return data;
            }

            const { data } = await api.post<QueryResult>(url, { query, limit, offset, include_total_count });
            return data;
        },
    });
};

export const useExplainQuery = (connectionId: string | undefined) => {
    return useMutation({
        mutationFn: async ({ query, analyze }: { query: string; analyze?: boolean }) => {
            if (!connectionId) throw new Error("Connection ID is required");
            // Backend expects 'sql' for explain endpoint based on QueryEditor code
            const { data } = await api.post<any>(`/api/connections/${connectionId}/explain`, { sql: query, analyze });
            return data;
        }
    });
}

// Saved Queries Hooks

export const useSavedQueries = (connectionId: string | undefined) => {
    return useQuery({
        queryKey: ['savedQueries', connectionId],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<SavedQuery[]>(`/api/connections/${connectionId}/saved-queries`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useSaveQuery = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (savedQuery: Omit<SavedQuery, 'id' | 'created_at'>) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const { data } = await api.post<SavedQuery>(`/api/connections/${connectionId}/saved-queries`, savedQuery);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
        }
    });
};

export const useUpdateSavedQuery = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: { id: string } & Partial<SavedQuery>) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const response = await api.put<SavedQuery>(`/api/connections/${connectionId}/saved-queries/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
        }
    });
};

export const useDeleteSavedQuery = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            if (!connectionId) throw new Error("Connection ID is required");
            await api.delete(`/api/connections/${connectionId}/saved-queries/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
        }
    });
};

// Saved Query Folder Hooks

export const useSavedQueryFolders = (connectionId: string | undefined) => {
    return useQuery({
        queryKey: ['savedQueryFolders', connectionId],
        queryFn: async () => {
            if (!connectionId) return [];
            const { data } = await api.get<SavedQueryFolder[]>(`/api/connections/${connectionId}/saved-query-folders`);
            return data;
        },
        enabled: !!connectionId,
    });
};

export const useCreateSavedQueryFolder = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ name }: { name: string }) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const { data } = await api.post<SavedQueryFolder>(`/api/connections/${connectionId}/saved-query-folders`, { name });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueryFolders', connectionId] });
        }
    });
};

export const useUpdateSavedQueryFolder = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const { data } = await api.put<SavedQueryFolder>(`/api/connections/${connectionId}/saved-query-folders/${id}`, { name });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueryFolders', connectionId] });
        }
    });
};

export const useDeleteSavedQueryFolder = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            if (!connectionId) throw new Error("Connection ID is required");
            await api.delete(`/api/connections/${connectionId}/saved-query-folders/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['savedQueryFolders', connectionId] });
            queryClient.invalidateQueries({ queryKey: ['savedQueries', connectionId] });
        }
    });
};

export const useUpdateQueryResult = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ schema, table, primary_key, updates }: { schema: string; table: string; primary_key: Record<string, any>; updates: Record<string, any> }) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const response = await api.patch(`/api/connections/${connectionId}/query-results`, { schema, table, primary_key, updates });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tableData', connectionId] });
        }
    });
};

export const useDeleteQueryResult = (connectionId: string | undefined) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ schema, table, primary_key }: { schema: string; table: string; primary_key: Record<string, any> }) => {
            if (!connectionId) throw new Error("Connection ID is required");
            const response = await api.delete(`/api/connections/${connectionId}/query-results`, { data: { schema, table, primary_key } });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tableData', connectionId] });
        }
    });
};
