import axios from 'axios';

export const api = axios.create({ baseURL: 'http://localhost:8001' });

export function setToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

// Add request interceptor to automatically add token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    if (config.headers) {
      (config.headers as any)['Authorization'] = `Bearer ${token}`;
    } else {
      (config as any).headers = { Authorization: `Bearer ${token}` };
    }
  }
  return config;
});