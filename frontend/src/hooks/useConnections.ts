import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { Connection } from '../types';

export const useConnections = () => {
    return useQuery({
        queryKey: ['connections'],
        queryFn: async () => {
            const { data } = await api.get<Connection[]>('/api/connections');
            return data;
        },
    });
};

export const useConnection = (id: string | undefined) => {
    return useQuery({
        queryKey: ['connection', id],
        queryFn: async () => {
            if (!id) return null;
            const { data } = await api.get<Connection>(`/api/connections/${id}`);
            return data;
        },
        enabled: !!id,
    });
};

export const useCreateConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (newConnection: Omit<Connection, 'id'>) => {
            const { data } = await api.post<Connection>('/api/connections', newConnection);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
        },
    });
};

export const useUpdateConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...data }: Connection) => {
            const response = await api.put<Connection>(`/api/connections/${id}`, data);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.invalidateQueries({ queryKey: ['connection', data.id] });
        },
    });
};

export const useDeleteConnection = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/api/connections/${id}`);
            return id;
        },
        onSuccess: (id) => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            queryClient.removeQueries({ queryKey: ['connection', id] });
        },
    });
};

export const useTestConnection = () => {
    return useMutation({
        mutationFn: async (connectionData: any) => {
            const { data } = await api.post('/api/connections/test', connectionData);
            return data;
        },
    });
};
