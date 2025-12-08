import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';

export function useTheme() {
    const theme = useSettingsStore((state) => state.theme);

    useEffect(() => {
        // Remove all theme classes
        document.body.classList.remove(
            'theme-dark',
            'theme-light',
            'theme-solar',
            'theme-midnight',
            'theme-wibu-pink',
            'theme-wibu-sakura',
            'theme-wibu-ocean',
            'theme-wibu-sunset',
            'theme-wibu-neon'
        );

        // Apply selected theme
        if (theme === 'system') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            document.body.classList.add(`theme-${theme}`);
        }
    }, [theme]);

    return theme;
}
