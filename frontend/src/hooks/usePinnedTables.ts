import { useState, useEffect } from 'react';

interface PinnedTable {
    schema: string;
    table: string;
}

const STORAGE_KEY = 'dbplus_pinned_tables';

export function usePinnedTables(connectionId: string) {
    const [pinnedTables, setPinnedTables] = useState<PinnedTable[]>([]);

    // Load pinned tables from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(`${STORAGE_KEY}_${connectionId}`);
        if (stored) {
            try {
                setPinnedTables(JSON.parse(stored));
            } catch (error) {
                console.error('Failed to parse pinned tables:', error);
            }
        }
    }, [connectionId]);

    // Save to localStorage whenever pinnedTables changes
    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_${connectionId}`, JSON.stringify(pinnedTables));
    }, [pinnedTables, connectionId]);

    const isPinned = (schema: string, table: string): boolean => {
        return pinnedTables.some((p) => p.schema === schema && p.table === table);
    };

    const togglePin = (schema: string, table: string) => {
        setPinnedTables((prev) => {
            const exists = prev.some((p) => p.schema === schema && p.table === table);
            if (exists) {
                return prev.filter((p) => !(p.schema === schema && p.table === table));
            } else {
                return [...prev, { schema, table }];
            }
        });
    };

    const getPinnedTablesForSchema = (schema: string): string[] => {
        return pinnedTables
            .filter((p) => p.schema === schema)
            .map((p) => p.table);
    };

    return {
        pinnedTables,
        isPinned,
        togglePin,
        getPinnedTablesForSchema,
    };
}
