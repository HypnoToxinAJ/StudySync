/**
 * Tuition API Service
 * Connects Private Tuition Tracker frontend to Django backend and Supabase PostgreSQL.
 */
import { apiClient } from './apiClient';

const BASE_PATH = '/tuition';

export const tuitionApi = {
  /**
   * Fetch all tuition students with slots, notes, and month history
   */
  list: () => apiClient.get(`${BASE_PATH}/students/`),

  /**
   * Fetch single student by ID
   */
  get: (id) => apiClient.get(`${BASE_PATH}/students/${id}/`),

  /**
   * Create a new student
   */
  create: (data) => apiClient.post(`${BASE_PATH}/students/`, data),

  /**
   * Partial update an existing student
   */
  update: (id, data) => apiClient.patch(`${BASE_PATH}/students/${id}/`, data),

  /**
   * Delete a student
   */
  delete: (id) => apiClient.delete(`${BASE_PATH}/students/${id}/`),

  /**
   * Update or clear a class slot date
   * @param {string} studentId
   * @param {number} order (1-indexed slot number)
   * @param {{ date: string|null, completed?: boolean }} payload
   */
  updateSlot: (studentId, order, payload) =>
    apiClient.patch(`${BASE_PATH}/students/${studentId}/slots/${order}/`, payload),

  /**
   * Start a new month: archive current progress and reset class slots
   * @param {string} studentId
   * @param {string|null} targetMonth - e.g. "2026-04"
   */
  startNewMonth: (studentId, targetMonth = null) =>
    apiClient.post(`${BASE_PATH}/students/${studentId}/start-new-month/`, { targetMonth }),

  /**
   * List notes for a student
   */
  listNotes: (studentId) => apiClient.get(`${BASE_PATH}/students/${studentId}/notes/`),

  /**
   * Add a note to a student
   */
  addNote: (studentId, content, id = null) =>
    apiClient.post(`${BASE_PATH}/students/${studentId}/notes/`, {
      content,
      ...(id ? { id } : {}),
    }),

  /**
   * Update an existing note
   */
  updateNote: (studentId, noteId, content) =>
    apiClient.patch(`${BASE_PATH}/students/${studentId}/notes/${noteId}/`, { content }),

  /**
   * Delete a note
   */
  deleteNote: (studentId, noteId) =>
    apiClient.delete(`${BASE_PATH}/students/${studentId}/notes/${noteId}/`),

  /**
   * Synchronize a batch of students from localStorage into Supabase PostgreSQL
   */
  syncBatch: (students) => apiClient.post(`${BASE_PATH}/sync/`, { students }),
};

export default tuitionApi;
