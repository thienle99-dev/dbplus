import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { QuerySnippet } from '../types';

export const useSnippets = () => {
    return useQuery({
        queryKey: ['snippets'],
        queryFn: async () => {
            const { data } = await api.get<QuerySnippet[]>('/api/snippets');
            return data;
        },
    });
};

export const useCreateSnippet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (snippet: Omit<QuerySnippet, 'id'>) => {
            const { data } = await api.post<QuerySnippet>('/api/snippets', snippet);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snippets'] });
        },
    });
};

export const useUpdateSnippet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: QuerySnippet) => {
            const response = await api.put<QuerySnippet>(`/api/snippets/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snippets'] });
        },
    });
};

export const useDeleteSnippet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/snippets/${id}`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['snippets'] });
        },
    });
};
