import api from './api';
import { SettingResponse } from '../types/settings';

export const settingsApi = {
    // Get all settings
    getAllSettings: async (): Promise<SettingResponse[]> => {
        const { data } = await api.get<SettingResponse[]>('/api/settings');
        return data;
    },

    // Get a specific setting by key
    getSetting: async (key: string): Promise<SettingResponse> => {
        const { data } = await api.get<SettingResponse>(`/api/settings/${key}`);
        return data;
    },

    // Update or create a setting
    updateSetting: async (key: string, value: any): Promise<SettingResponse> => {
        const { data } = await api.put<SettingResponse>(`/api/settings/${key}`, { 
            value: JSON.stringify(value) 
        });
        return data;
    },

    // Delete a setting
    deleteSetting: async (key: string): Promise<void> => {
        await api.delete(`/api/settings/${key}`);
    },

    // Reset all settings to defaults
    resetSettings: async (): Promise<void> => {
        await api.post('/api/settings/reset');
    },
};
