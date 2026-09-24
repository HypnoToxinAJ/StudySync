import axios from 'axios';
import { supabase } from './supabaseClient';

const configuredBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD
    ? 'https://studysync-jowq.onrender.com/api/v1'
    : 'http://localhost:8000/api/v1')
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

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = cb => {
  refreshSubscribers.push(cb);
};

const onRefreshed = token => {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
};

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

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && data?.session?.access_token) {
            currentSession = data.session;
            onRefreshed(data.session.access_token);
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${data.session.access_token}`;
            return api(originalRequest);
          }
        } catch {
          // Token refresh failed - allow rejection to proceed
        } finally {
          isRefreshing = false;
        }
      } else {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh(token => {
            if (!token) {
              reject(error);
              return;
            }
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
    }
    return Promise.reject(error);
  }
);

export default api;

