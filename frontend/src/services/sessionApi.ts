import api from './api';

export interface SessionInfo {
    pid: number;
    user_name: string | null;
    application_name: string | null;
    client_addr: string | null;
    backend_start: string | null;
    query_start: string | null;
    state: string | null;
    query: string | null;
    wait_event_type: string | null;
    wait_event: string | null;
    state_change: string | null;
}

export const sessionApi = {
    getSessions: async (connectionId: string): Promise<SessionInfo[]> => {
        const response = await api.get(`/api/connections/${connectionId}/sessions`);
        return response.data;
    },
    killSession: async (connectionId: string, pid: number): Promise<void> => {
        await api.delete(`/api/connections/${connectionId}/sessions/${pid}`);
    },
};
