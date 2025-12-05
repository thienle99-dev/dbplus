import { create } from 'zustand';

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'request' | 'response' | 'error' | 'info';
    method?: string;
    url?: string;
    status?: number;
    data?: any;
    message?: string;
}

interface LogState {
    logs: LogEntry[];
    isOpen: boolean;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    toggleOpen: () => void;
    setOpen: (isOpen: boolean) => void;
}

export const useLogStore = create<LogState>((set) => ({
    logs: [],
    isOpen: false,
    addLog: (log) =>
        set((state) => ({
            logs: [
                {
                    ...log,
                    id: Math.random().toString(36).substring(7),
                    timestamp: new Date(),
                },
                ...state.logs,
            ].slice(0, 100), // Keep last 100 logs
        })),
    clearLogs: () => set({ logs: [] }),
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (isOpen) => set({ isOpen }),
}));
