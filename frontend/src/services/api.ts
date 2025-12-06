import axios from 'axios';
import { useLogStore } from '../store/logStore';

// Create axios instance
// Use runtime check: if running on port 1420, we're in dev mode (Vite)
const isDevServer = typeof window !== 'undefined' && window.location.port === '1420';
const baseURL = isDevServer ? '' : 'http://127.0.0.1:19999';
console.log('[API] Initializing. isDevServer:', isDevServer, 'port:', window?.location?.port, 'baseURL:', baseURL);

const api = axios.create({
  baseURL,
  timeout: 5000, // 5s timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors for logging
api.interceptors.request.use(
  (config) => {
    useLogStore.getState().addLog({
      type: 'request',
      method: config.method?.toUpperCase(),
      url: config.url,
      data: config.data,
      message: `Request: ${config.method?.toUpperCase()} ${config.url}`,
    });
    return config;
  },
  (error) => {
    useLogStore.getState().addLog({
      type: 'error',
      message: `Request Error: ${error.message}`,
      data: error,
    });
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    useLogStore.getState().addLog({
      type: 'response',
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status,
      data: response.data,
      message: `Response: ${response.status} ${response.statusText}`,
    });
    return response;
  },
  (error) => {
    const errorDetail = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      responseData: error.response?.data,
    };

    let logMessage = `Error: ${error.message}`;
    if (error.code === 'ERR_NETWORK') {
      logMessage = `Network Error: Connection refused or CORS blocked. Check backend is running on ${api.defaults.baseURL}`;
    } else if (error.response) {
      const detail = error.response.data
        ? (typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : String(error.response.data))
        : '';
      logMessage = `API Error: ${error.response.status} ${error.response.statusText}${detail ? ` - ${detail}` : ''}`;
    }

    useLogStore.getState().addLog({
      type: 'error',
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: logMessage,
      data: errorDetail,
    });
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

export default api;
