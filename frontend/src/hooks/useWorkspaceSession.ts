import React, { useEffect, useCallback } from 'react';
import { useSettings } from './useSettings';
import { WorkspaceSession } from '../types/settings';

const SESSION_KEY = 'workspace_session';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export function useWorkspaceSession() {
    const { settings, updateSettings } = useSettings();

    // Get current session from settings
    const session: WorkspaceSession | null = React.useMemo(() => {
        const settingsData = settings as any;
        return settingsData[SESSION_KEY] || null;
    }, [settings]);

    // Save session
    const saveSession = useCallback(
        (sessionData: WorkspaceSession) => {
            const updatedSession = {
                ...sessionData,
                lastSavedAt: new Date().toISOString(),
            };
            updateSettings({ [SESSION_KEY]: updatedSession } as any);
        },
        [updateSettings]
    );

    // Update specific session properties
    const updateSession = useCallback(
        (updates: Partial<WorkspaceSession>) => {
            const currentSession = session || {
                openTabs: [],
                activeTabId: null,
                sidebarCollapsed: false,
                rightSidebarCollapsed: false,
                lastSavedAt: new Date().toISOString(),
            };

            saveSession({
                ...currentSession,
                ...updates,
            });
        },
        [session, saveSession]
    );

    // Clear session
    const clearSession = useCallback(() => {
        updateSettings({ [SESSION_KEY]: null } as any);
    }, [updateSettings]);

    // Auto-save session periodically
    useEffect(() => {
        if (!session || !settings.autoSave) return;

        const interval = setInterval(() => {
            // Re-save current session to update lastSavedAt
            saveSession(session);
        }, settings.autoSaveInterval || AUTO_SAVE_INTERVAL);

        return () => clearInterval(interval);
    }, [session, settings.autoSave, settings.autoSaveInterval, saveSession]);

    return {
        session,
        saveSession,
        updateSession,
        clearSession,
    };
}
