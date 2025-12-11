import api from './api';
import { QuerySnippet, CreateSnippetParams, UpdateSnippetParams } from '../types/snippet';

export const snippetApi = {
    getSnippets: async (): Promise<QuerySnippet[]> => {
        const response = await api.get<QuerySnippet[]>('/api/snippets');
        return response.data;
    },

    createSnippet: async (params: CreateSnippetParams): Promise<QuerySnippet> => {
        const response = await api.post<QuerySnippet>('/api/snippets', params);
        return response.data;
    },

    updateSnippet: async (id: string, params: UpdateSnippetParams): Promise<QuerySnippet> => {
        const response = await api.put<QuerySnippet>(`/api/snippets/${id}`, params);
        return response.data;
    },

    deleteSnippet: async (id: string): Promise<void> => {
        await api.delete(`/api/snippets/${id}`);
    },
};
