/**
 * Client-Side CUET Result Service
 * Handles network interaction with the StudySync Django REST API,
 * zero-password result import, and authentic preview demo data.
 */

import { parseCuetResultHtml, extractNormalizedCourses, diagnoseResultPage } from '../parsers/cuetResultParser';
import { validateNormalizedResult } from '../utils/resultValidation';
import { apiClient } from '../../../services/apiClient';

export const cuetResultService = {
  /**
   * Retrieves saved academic result from the StudySync backend database.
   * Returns null if no record exists (404 / 204) or user is unauthenticated.
   */
  getSavedResults: async () => {
    try {
      if (!apiClient.hasSession()) return null;
      return await apiClient.get('/academics/results/');
    } catch (err) {
      if (err?.status === 404 || err?.status === 204) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Persists normalized academic results to the StudySync backend.
   */
  saveResultsToBackend: async (resultData) => {
    if (!apiClient.hasSession() || !resultData) return null;
    return await apiClient.post('/academics/results/', resultData);
  },

  /**
   * Imports results array directly through the authoritative backend pipeline.
   * Resolves repeated course attempts and calculates official CGPA.
   * @param {Object} payload - { student: {...}, results: [...] } or { results: [...] }
   */
  importNormalizedResults: async (payload) => {
    if (!apiClient.hasSession()) {
      throw new Error('Please log in to StudySync to import and save your official results.');
    }
    return await apiClient.post('/academics/results/import/', payload);
  },

  /**
   * Parses raw HTML string from CUET result portal, then imports via backend pipeline.
   * If offline or backend error, falls back to client-side calculated model.
   * @param {string} rawHtml 
   * @param {Object} [studentFallback] 
   * @returns {Promise<Object>}
   */
  importFromHtml: async (rawHtml, studentFallback = {}) => {
    if (!rawHtml || typeof rawHtml !== 'string' || !rawHtml.trim()) {
      throw new Error('Please provide the HTML content or saved webpage file from the CUET result page.');
    }

    // 1. First parse locally to validate and extract normalized rows
    const clientParsed = parseCuetResultHtml(rawHtml, studentFallback);
    const normalizedCourses = extractNormalizedCourses(rawHtml);

    // 2. If authenticated, submit normalized courses to the backend pipeline
    if (apiClient.hasSession() && normalizedCourses.length > 0) {
      try {
        const backendSaved = await apiClient.post('/academics/results/import/', {
          student: clientParsed.student,
          results: normalizedCourses
        });
        if (backendSaved && backendSaved.semesters) {
          return { ...backendSaved, isSavedCopy: true };
        }
      } catch (err) {
        console.warn('Backend import failed, falling back to client-parsed model:', err);
      }
    }

    return clientParsed;
  },

  /**
   * Inspects and diagnoses the HTML content for debugging when detection or parsing fails.
   */
  diagnoseHtml: (rawHtml, currentUrl = '') => {
    return diagnoseResultPage(rawHtml, currentUrl);
  },

  /**
   * Deletes saved academic results from the StudySync backend.
   */
  deleteResultsFromBackend: async () => {
    if (!apiClient.hasSession()) return;
    return await apiClient.delete('/academics/results/');
  }
};
