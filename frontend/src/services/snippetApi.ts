import { invoke } from '@tauri-apps/api/core';
import { QuerySnippet, CreateSnippetParams, UpdateSnippetParams } from '../types/snippet';

export const snippetApi = {
    getSnippets: async (): Promise<QuerySnippet[]> => {
        return await invoke('list_snippets');
    },

    createSnippet: async (params: CreateSnippetParams): Promise<QuerySnippet> => {
        return await invoke('create_snippet', { request: params });
    },

    updateSnippet: async (id: string, params: UpdateSnippetParams): Promise<QuerySnippet> => {
        return await invoke('update_snippet', { 
            id: parseInt(id), 
            request: params 
        });
    },

    deleteSnippet: async (id: string): Promise<void> => {
        await invoke('delete_snippet', { id: parseInt(id) });
    },
};
