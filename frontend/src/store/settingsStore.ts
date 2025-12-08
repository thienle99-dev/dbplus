import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'soft-pink' | 'light' | 'solar' | 'midnight' | 'wibu-pink' | 'wibu-sakura' | 'wibu-ocean' | 'wibu-sunset' | 'wibu-neon' | 'system';

export interface AppSettings {
    // General
    autoSave: boolean;
    confirmBeforeDelete: boolean;
    maxRecentConnections: number;

    // Editor
    editorFontSize: number;
    tabSize: number;
    wordWrap: boolean;
    lineNumbers: boolean;
    autoComplete: boolean;

    // Theme
    theme: Theme;
    accentColor: string;

    // Query
    defaultLimit: number;
    queryTimeout: number;

    // Table
    defaultPageSize: number;
    showNullAsText: boolean;
}

interface SettingsState extends AppSettings {
    setTheme: (theme: Theme) => void;
    setEditorFontSize: (size: number) => void;
    toggleWordWrap: () => void;
    updateSettings: (settings: Partial<AppSettings>) => void;
    resetSettings: () => void;
}

const defaultSettings: AppSettings = {
    // General
    autoSave: true,
    confirmBeforeDelete: true,
    maxRecentConnections: 10,

    // Editor
    editorFontSize: 14,
    tabSize: 2,
    wordWrap: true,
    lineNumbers: true,
    autoComplete: true,

    // Theme
    theme: 'dark',
    accentColor: '#4f83ff',

    // Query
    defaultLimit: 1000,
    queryTimeout: 30000,

    // Table
    defaultPageSize: 50,
    showNullAsText: true,
};

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            ...defaultSettings,
            setTheme: (theme) => set({ theme }),
            setEditorFontSize: (size) => set({ editorFontSize: size }),
            toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
            updateSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
            resetSettings: () => set(defaultSettings),
        }),
        {
            name: 'app-settings',
        }
    )
);
