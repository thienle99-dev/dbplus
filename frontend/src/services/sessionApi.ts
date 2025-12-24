import { invoke } from '@tauri-apps/api/core';

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
        return await invoke('list_sessions', { id: connectionId });
    },
    killSession: async (connectionId: string, pid: number): Promise<void> => {
        await invoke('kill_session', { id: connectionId, pid });
    },
};

