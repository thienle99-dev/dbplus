import api from './api';

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
        const { data: history } = await api.get<QueryHistoryEntry[]>(`/api/connections/${connectionId}/history`, {
            params: { limit }
        });

        return { history };
    },

    async addHistory(
        connectionId: string,
        entry: AddHistoryRequest
    ): Promise<QueryHistoryEntry> {
        const { data } = await api.post<QueryHistoryEntry>(`/api/connections/${connectionId}/history`, {
            sql: entry.sql,
            execution_time: entry.execution_time,
            success: entry.success,
            row_count: entry.row_count,
            error_message: entry.error_message
        });
        return data;
    },

    async clearHistory(connectionId: string): Promise<void> {
        await api.delete(`/api/connections/${connectionId}/history`);
    },
};
