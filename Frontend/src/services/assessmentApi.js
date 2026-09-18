/**
 * Assessment API service — connects the frontend assessment forms to the
 * Django backend, with Google Calendar & Drive integration.
 *
 * Follows the same pattern as routineApi.js (uses apiClient + api for token).
 */

import api from './api';
import { apiClient } from './apiClient';

const ASSESSMENTS_PATH = '/academics/assessments/';

/**
 * Attach a Google access token as an X-Google-Token header for the request.
 * This is the same pattern used by GoogleCalendarSyncView.
 */
const withGoogleToken = (googleToken) => {
  if (!googleToken) return {};
  return { headers: { 'X-Google-Token': googleToken } };
};

export const assessmentApi = {
  /**
   * List all assessments for the current user.
   */
  list: () => apiClient.get(ASSESSMENTS_PATH),

  /**
   * Create a new assessment. Optionally creates a Google Calendar event.
   * @param {Object} data - Assessment form data (camelCase keys).
   * @param {string|null} googleToken - Google OAuth provider token.
   */
  create: async (data, googleToken = null) => {
    const response = await api.request({
      url: ASSESSMENTS_PATH,
      method: 'POST',
      data,
      headers: {
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * Get a single assessment by ID.
   */
  get: (id) => apiClient.get(`${ASSESSMENTS_PATH}${id}/`),

  /**
   * Update an existing assessment (partial update).
   * Optionally updates the linked Google Calendar event.
   */
  update: async (id, data, googleToken = null) => {
    const response = await api.request({
      url: `${ASSESSMENTS_PATH}${id}/`,
      method: 'PATCH',
      data,
      headers: {
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * Delete an assessment. Optionally removes the Calendar event and Drive files.
   */
  delete: async (id, googleToken = null) => {
    const response = await api.request({
      url: `${ASSESSMENTS_PATH}${id}/`,
      method: 'DELETE',
      headers: {
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * Upload a file attachment for an assessment.
   * The file is uploaded to Google Drive if a token is provided.
   * @param {string} assessmentId - The assessment ID.
   * @param {File} file - The File object to upload.
   * @param {string|null} googleToken - Google OAuth provider token.
   */
  uploadAttachment: async (assessmentId, file, googleToken = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.request({
      url: `${ASSESSMENTS_PATH}${assessmentId}/attachments/`,
      method: 'POST',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * List attachments for an assessment.
   */
  listAttachments: (assessmentId) =>
    apiClient.get(`${ASSESSMENTS_PATH}${assessmentId}/attachments/`),

  /**
   * Delete a single attachment (and its Drive file if applicable).
   */
  deleteAttachment: async (attachmentId, googleToken = null) => {
    const response = await api.request({
      url: `/academics/attachments/${attachmentId}/`,
      method: 'DELETE',
      headers: {
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * Sync an existing attachment to Google Drive.
   * @param {string} attachmentId - The attachment ID.
   * @param {string} googleToken - Google OAuth provider token with Drive scope.
   */
  syncAttachmentToDrive: async (attachmentId, googleToken = null) => {
    const response = await api.request({
      url: `/academics/attachments/${attachmentId}/sync-drive/`,
      method: 'POST',
      headers: {
        ...(googleToken ? { 'X-Google-Token': googleToken } : {}),
      },
    });
    return response.data;
  },

  /**
   * Check Google Calendar and Drive connection status and scopes.
   */
  checkGoogleStatus: async (googleToken = null) => {
    if (googleToken) {
      const response = await api.request({
        url: '/academics/google/calendar/connect/',
        method: 'POST',
        headers: { 'X-Google-Token': googleToken },
      });
      return response.data;
    }
    return apiClient.get('/academics/google/calendar/connect/');
  },

  /**
   * Check Google Calendar connection status (alias for backward compatibility).
   */
  checkCalendarConnect: (googleToken = null) => {
    if (googleToken) {
      return api.request({
        url: '/academics/google/calendar/connect/',
        method: 'POST',
        headers: { 'X-Google-Token': googleToken },
      }).then(r => r.data);
    }
    return apiClient.get('/academics/google/calendar/connect/');
  },
};

export default assessmentApi;

