import axios from 'axios';
import api, { API_BASE_URL, getCachedSession } from './api';
import { supabase } from './supabaseClient';

const messageFromPayload = (payload, fallback) => {
  if (payload?.error?.message) return payload.error.message;
  if (payload?.detail) return String(payload.detail);
  const details = payload?.error?.details || payload;
  if (details && typeof details === 'object') {
    const first = Object.values(details).flat(Infinity).find(value => typeof value === 'string');
    if (first) return first;
  }
  return fallback;
};

export class ApiError extends Error {
  constructor(message, status, payload, options = {}) {
    super(message, options);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const request = async config => {
  try {
    const response = await api.request(config);
    return response.status === 204 ? null : response.data;
  } catch (error) {
    if (error?.name === 'CanceledError' || error?.name === 'AbortError') throw error;
    if (!axios.isAxiosError(error)) throw error;

    const status = error.response?.status || 0;
    const payload = error.response?.data || null;
    const fallback = status
      ? `Request failed (${status}).`
      : 'Unable to reach StudySync. Check your connection and try again.';
    throw new ApiError(messageFromPayload(payload, fallback), status, payload, { cause: error });
  }
};

export { API_BASE_URL };

export const apiClient = {
  get: path => request({ url: path, method: 'GET' }),
  post: (path, body) => request({ url: path, method: 'POST', data: body }),
  put: (path, body) => request({ url: path, method: 'PUT', data: body }),
  patch: (path, body) => request({ url: path, method: 'PATCH', data: body }),
  delete: (path, body) => request({
    url: path,
    method: 'DELETE',
    ...(body === undefined ? {} : { data: body })
  }),
  upload: (path, body, options = {}) => request({
    url: path,
    method: 'POST',
    data: body,
    ...options
  }),
  hasSession: () => Boolean(getCachedSession()),
  getRefreshToken: () => getCachedSession()?.refresh_token || null,
  setSession: session => supabase.auth.setSession(session),
  clearSession: () => supabase.auth.signOut({ scope: 'local' })
};
