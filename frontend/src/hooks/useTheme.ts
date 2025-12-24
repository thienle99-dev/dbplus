import { useEffect } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { ALL_THEME_CLASS_NAMES, getThemeClassName } from '../constants/themes';

export function useTheme() {
    const theme = useSettingsStore((state) => state.theme);

    useEffect(() => {
        // Remove all theme classes
        document.body.classList.remove(...ALL_THEME_CLASS_NAMES);

        // Apply selected theme
        if (theme === 'system') {
            // Use system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.classList.add(prefersDark ? 'theme-dark' : 'theme-light');
        } else {
            const className = getThemeClassName(theme);
            if (className) {
                document.body.classList.add(className);
            }
        }
    }, [theme]);

    return theme;
}
