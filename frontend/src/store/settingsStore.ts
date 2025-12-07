import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'light' | 'solar' | 'midnight' | 'system';

interface SettingsState {
    theme: Theme;
    editorFontSize: number;
    wordWrap: boolean;
    setTheme: (theme: Theme) => void;
    setEditorFontSize: (size: number) => void;
    toggleWordWrap: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            theme: 'dark',
            editorFontSize: 14,
            wordWrap: true,
            setTheme: (theme) => set({ theme }),
            setEditorFontSize: (size) => set({ editorFontSize: size }),
            toggleWordWrap: () => set((state) => ({ wordWrap: !state.wordWrap })),
        }),
        {
            name: 'app-settings',
        }
    )
);
