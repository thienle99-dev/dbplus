import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../services/settingsApi';
import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';

const SETTINGS_KEY = 'user_settings';

export function useSettings() {
    const queryClient = useQueryClient();

    // Fetch all settings
    const { data: settingsData, isLoading } = useQuery({
        queryKey: ['settings'],
        queryFn: settingsApi.getAllSettings,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Parse settings from API response
    const settings: UserSettings = React.useMemo(() => {
        if (!settingsData) return DEFAULT_SETTINGS;

        const settingsMap = settingsData.find((s) => s.key === SETTINGS_KEY);
        if (!settingsMap) return DEFAULT_SETTINGS;

        return {
            ...DEFAULT_SETTINGS,
            ...settingsMap.value,
        };
    }, [settingsData]);

    // Update settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: (newSettings: Partial<UserSettings>) => {
            const updatedSettings = { ...settings, ...newSettings };
            return settingsApi.updateSetting(SETTINGS_KEY, updatedSettings);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });

    // Reset settings mutation
    const resetSettingsMutation = useMutation({
        mutationFn: settingsApi.resetSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });

    return {
        settings,
        isLoading,
        updateSettings: updateSettingsMutation.mutate,
        resetSettings: resetSettingsMutation.mutate,
        isUpdating: updateSettingsMutation.isPending,
    };
}

// Hook for individual setting
export function useSetting<K extends keyof UserSettings>(key: K) {
    const { settings, updateSettings, isLoading } = useSettings();

    const updateSetting = React.useCallback(
        (value: UserSettings[K]) => {
            updateSettings({ [key]: value } as Partial<UserSettings>);
        },
        [key, updateSettings]
    );

    return {
        value: settings[key],
        setValue: updateSetting,
        isLoading,
    };
}
