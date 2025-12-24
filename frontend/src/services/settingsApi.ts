import { invoke } from '@tauri-apps/api/core';
import { SettingResponse, UpdateSettingRequest } from '../types/settings';

export const settingsApi = {
    // Get all settings
    getAllSettings: async (): Promise<SettingResponse[]> => {
        return await invoke('get_all_settings');
    },

    // Get a specific setting by key
    getSetting: async (key: string): Promise<SettingResponse> => {
        return await invoke('get_setting', { key });
    },

    // Update or create a setting
    updateSetting: async (key: string, value: any): Promise<SettingResponse> => {
        return await invoke('update_setting', {
            key,
            request: { value: JSON.stringify(value) }
        });
    },

    // Delete a setting
    deleteSetting: async (key: string): Promise<void> => {
        await invoke('delete_setting', { key });
    },

    // Reset all settings to defaults
    resetSettings: async (): Promise<void> => {
        await invoke('reset_settings');
    },
};
