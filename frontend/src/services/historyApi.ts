import { invoke } from '@tauri-apps/api/core';

export interface QueryHistoryEntry {
    id: string;
    connection_id: string;
    sql: string;
    row_count: number | null;
    execution_time: number | null;
    success: boolean;
    error_message: string | null;
    executed_at: string;
}

export interface HistoryResponse {
    history: QueryHistoryEntry[];
}

export interface AddHistoryRequest {
    sql: string;
    row_count: number | null;
    execution_time: number | null;
    success: boolean;
    error_message: string | null;
}

export const historyApi = {
    async getHistory(connectionId: string, limit = 100): Promise<HistoryResponse> {
        const history = await invoke<QueryHistoryEntry[]>('get_history', {
            connectionId,
            limit
        });
        
        return { history };
    },

    async addHistory(
        connectionId: string,
        entry: AddHistoryRequest
    ): Promise<QueryHistoryEntry> {
        return await invoke('add_history', {
            connectionId,
            request: {
                query: entry.sql,
                execution_time_ms: entry.execution_time,
                status: entry.success ? 'success' : 'error',
                error_message: entry.error_message
            }
        });
    },

    async clearHistory(connectionId: string): Promise<void> {
        await invoke('clear_history', { connectionId });
    },
};
