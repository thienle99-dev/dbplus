import axios from 'axios';
import { SettingResponse, UpdateSettingRequest } from '../types/settings';

const API_BASE_URL = 'http://localhost:19999/api';

export const settingsApi = {
    // Get all settings
    getAllSettings: async (): Promise<SettingResponse[]> => {
        const response = await axios.get(`${API_BASE_URL}/settings`);
        return response.data;
    },

    // Get a specific setting by key
    getSetting: async (key: string): Promise<SettingResponse> => {
        const response = await axios.get(`${API_BASE_URL}/settings/${key}`);
        return response.data;
    },

    // Update or create a setting
    updateSetting: async (key: string, value: any): Promise<SettingResponse> => {
        const response = await axios.put(`${API_BASE_URL}/settings/${key}`, {
            value,
        } as UpdateSettingRequest);
        return response.data;
    },

    // Delete a setting
    deleteSetting: async (key: string): Promise<void> => {
        await axios.delete(`${API_BASE_URL}/settings/${key}`);
    },

    // Reset all settings to defaults
    resetSettings: async (): Promise<void> => {
        await axios.post(`${API_BASE_URL}/settings/reset`);
    },
};
