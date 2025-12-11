const API_BASE = 'http://localhost:19999';

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
        const response = await fetch(
            `${API_BASE}/api/connections/${connectionId}/history?limit=${limit}`
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch history: ${response.statusText}`);
        }

        return response.json();
    },

    async addHistory(
        connectionId: string,
        entry: AddHistoryRequest
    ): Promise<QueryHistoryEntry> {
        const response = await fetch(
            `${API_BASE}/api/connections/${connectionId}/history`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry),
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to add history: ${response.statusText}`);
        }

        return response.json();
    },

    async clearHistory(connectionId: string): Promise<void> {
        const response = await fetch(
            `${API_BASE}/api/connections/${connectionId}/history`,
            {
                method: 'DELETE',
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to clear history: ${response.statusText}`);
        }
    },
};
