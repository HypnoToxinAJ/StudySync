import axios from 'axios';
import { supabase } from './supabaseClient';

const configuredBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
).replace(/\/+$/, '');

export const API_BASE_URL = configuredBaseUrl.endsWith('/api')
  ? `${configuredBaseUrl}/v1`
  : configuredBaseUrl;

let currentSession = null;

export const getCurrentSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  currentSession = data.session;
  return currentSession;
};

export const getCachedSession = () => currentSession;
export const setCurrentSession = session => {
  currentSession = session;
};

supabase.auth.onAuthStateChange((_event, session) => {
  currentSession = session;
});

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
  timeout: 30_000
});

api.interceptors.request.use(
  async config => {
    const session = await getCurrentSession();
    if (session?.access_token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default api;
