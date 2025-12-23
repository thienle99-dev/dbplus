import { Theme } from '../store/settingsStore';

export function isDarkTheme(theme: Theme): boolean {
    if (theme === 'light' || theme === 'gruvbox-light' || theme === 'macos-light' || theme === 'solar') {
        return false;
    }
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // Default is dark
}
