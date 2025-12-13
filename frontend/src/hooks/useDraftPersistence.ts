import { useCallback } from 'react';

export interface DraftQuery {
    id: string;
    title: string;
    sql: string;
    metadata?: Record<string, any>;
    lastModified: number;
    savedQueryId?: string;
    type?: 'query' | 'table';
}

const STORAGE_PREFIX = 'dbplus_drafts_';
const MAX_DRAFTS = 10;

export function useDraftPersistence(scopeKey: string) {
    const storageKey = `${STORAGE_PREFIX}${scopeKey}`;

    const loadDrafts = useCallback((): DraftQuery[] => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return [];
            return JSON.parse(stored) as DraftQuery[];
        } catch (error) {
            console.error('Failed to load drafts:', error);
            return [];
        }
    }, [storageKey]);

    const saveDraft = useCallback((draft: DraftQuery) => {
        try {
            const existing = loadDrafts();
            const filtered = existing.filter(d => d.id !== draft.id);
            const updated = [...filtered, { ...draft, lastModified: Date.now() }];

            // Keep only the most recent MAX_DRAFTS
            const sorted = updated.sort((a, b) => b.lastModified - a.lastModified);
            const limited = sorted.slice(0, MAX_DRAFTS);

            localStorage.setItem(storageKey, JSON.stringify(limited));
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }, [storageKey, loadDrafts]);

    const deleteDraft = useCallback((draftId: string) => {
        try {
            const existing = loadDrafts();
            const filtered = existing.filter(d => d.id !== draftId);
            localStorage.setItem(storageKey, JSON.stringify(filtered));
        } catch (error) {
            console.error('Failed to delete draft:', error);
        }
    }, [storageKey, loadDrafts]);

    const clearAllDrafts = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
        } catch (error) {
            console.error('Failed to clear drafts:', error);
        }
    }, [storageKey]);

    return {
        saveDraft,
        loadDrafts,
        deleteDraft,
        clearAllDrafts,
    };
}
