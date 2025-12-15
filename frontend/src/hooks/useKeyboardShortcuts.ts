import React, { useEffect, useCallback } from 'react';
import { useSettings } from './useSettings';
import { KeyboardShortcut, DEFAULT_SHORTCUTS } from '../types/settings';

const SHORTCUTS_KEY = 'keyboard_shortcuts';

export function useKeyboardShortcuts() {
    const { settings, updateSettings } = useSettings();

    // Get shortcuts from settings or use defaults
    const shortcuts: KeyboardShortcut[] = React.useMemo(() => {
        const settingsData = settings as any;
        return settingsData[SHORTCUTS_KEY] || DEFAULT_SHORTCUTS;
    }, [settings]);

    // Register keyboard event listener
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const pressedKeys: string[] = [];

            // Check modifier keys
            if (event.ctrlKey || event.metaKey) pressedKeys.push('Mod');
            if (event.shiftKey) pressedKeys.push('Shift');
            if (event.altKey) pressedKeys.push('Alt');

            // Add the main key
            const key = event.key.toUpperCase();
            if (key !== 'CONTROL' && key !== 'SHIFT' && key !== 'ALT' && key !== 'META') {
                pressedKeys.push(key);
            }

            // Find matching shortcut
            const matchedShortcut = shortcuts.find((shortcut) => {
                if (!shortcut.enabled) return false;

                // Normalize keys for comparison
                const shortcutKeys = shortcut.keys.map(k => k.toUpperCase());
                const pressedKeysNormalized = pressedKeys.map(k => k.toUpperCase());

                return (
                    shortcutKeys.length === pressedKeysNormalized.length &&
                    shortcutKeys.every(k => pressedKeysNormalized.includes(k))
                );
            });

            if (matchedShortcut) {
                event.preventDefault();
                // Dispatch custom event for the action
                window.dispatchEvent(
                    new CustomEvent('keyboard-shortcut', {
                        detail: { action: matchedShortcut.action, shortcut: matchedShortcut },
                    })
                );
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);

    // Update shortcuts
    const updateShortcuts = useCallback(
        (newShortcuts: KeyboardShortcut[]) => {
            updateSettings({ [SHORTCUTS_KEY]: newShortcuts } as any);
        },
        [updateSettings]
    );

    // Update a single shortcut
    const updateShortcut = useCallback(
        (id: string, updates: Partial<KeyboardShortcut>) => {
            const updatedShortcuts = shortcuts.map((s) =>
                s.id === id ? { ...s, ...updates } : s
            );
            updateShortcuts(updatedShortcuts);
        },
        [shortcuts, updateShortcuts]
    );

    // Reset shortcuts to defaults
    const resetShortcuts = useCallback(() => {
        updateShortcuts(DEFAULT_SHORTCUTS);
    }, [updateShortcuts]);

    return {
        shortcuts,
        updateShortcuts,
        updateShortcut,
        resetShortcuts,
    };
}

// Hook to listen for a specific keyboard shortcut action
export function useKeyboardShortcutAction(action: string, callback: () => void) {
    useEffect(() => {
        const handleShortcut = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail.action === action) {
                callback();
            }
        };

        window.addEventListener('keyboard-shortcut', handleShortcut);
        return () => window.removeEventListener('keyboard-shortcut', handleShortcut);
    }, [action, callback]);
}
