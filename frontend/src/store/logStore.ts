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
    maxLogs: number;
    addLog: (log: Omit<LogEntry, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    toggleOpen: () => void;
    setOpen: (isOpen: boolean) => void;
    setMaxLogs: (max: number) => void;
}

export const useLogStore = create<LogState>((set) => ({
    logs: [],
    isOpen: false,
    maxLogs: 100,
    addLog: (log) =>
        set((state) => ({
            logs: [
                {
                    ...log,
                    id: Math.random().toString(36).substring(7),
                    timestamp: new Date(),
                },
                ...state.logs,
            ].slice(0, state.maxLogs),
        })),
    clearLogs: () => set({ logs: [] }),
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (isOpen) => set({ isOpen }),
    setMaxLogs: (max) => set((state) => ({
        maxLogs: max,
        logs: state.logs.slice(0, max)
    })),
}));
