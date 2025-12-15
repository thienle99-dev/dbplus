import { useEffect } from 'react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

/**
 * Get the display text for a keyboard shortcut action
 */
export function useShortcutDisplay(action: string): string {
    const { shortcuts } = useKeyboardShortcuts();

    const shortcut = shortcuts.find(s => s.action === action && s.enabled);
    if (!shortcut) return '';

    return formatShortcutKeys(shortcut.keys);
}

/**
 * Format shortcut keys for display
 */
export function formatShortcutKeys(keys: string[]): string {
    return keys
        .map(key => {
            const keyMap: Record<string, string> = {
                Mod: navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl',
                Shift: 'Shift',
                Alt: 'Alt',
                Enter: 'Enter',
            };
            return keyMap[key] || key;
        })
        .join('+');
}

/**
 * Get the full title with shortcut hint
 */
export function useShortcutTitle(baseTitle: string, action: string): string {
    const display = useShortcutDisplay(action);
    if (!display) return baseTitle;
    return `${baseTitle} (${display})`;
}

/**
 * Register multiple keyboard shortcut actions for a component
 */
export function useShortcutActions(
    actions: Record<string, () => void>,
    deps: React.DependencyList = []
) {
    useEffect(() => {
        const handlers = Object.entries(actions).map(([action, handler]) => {
            const handleShortcut = (event: Event) => {
                const customEvent = event as CustomEvent;
                if (customEvent.detail.action === action) {
                    handler();
                }
            };

            window.addEventListener('keyboard-shortcut', handleShortcut);
            return () => window.removeEventListener('keyboard-shortcut', handleShortcut);
        });

        return () => {
            handlers.forEach(cleanup => cleanup());
        };
    }, deps);
}
