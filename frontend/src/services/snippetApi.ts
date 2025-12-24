import api from './api';
import { QuerySnippet, CreateSnippetParams, UpdateSnippetParams } from '../types/snippet';

export const snippetApi = {
    getSnippets: async (): Promise<QuerySnippet[]> => {
        const { data } = await api.get<QuerySnippet[]>('/api/snippets');
        return data;
    },

    createSnippet: async (params: CreateSnippetParams): Promise<QuerySnippet> => {
        const { data } = await api.post<QuerySnippet>('/api/snippets', params);
        return data;
    },

    updateSnippet: async (id: string, params: UpdateSnippetParams): Promise<QuerySnippet> => {
        const { data } = await api.put<QuerySnippet>(`/api/snippets/${id}`, params);
        return data;
    },

    deleteSnippet: async (id: string): Promise<void> => {
        await api.delete(`/api/snippets/${id}`);
    },
};
