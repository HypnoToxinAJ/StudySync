import { useState, useEffect, useCallback } from 'react';
import { cuetResultService } from '../services/cuetResultService';
import { storageService } from '../../../services/storageService';
import { apiClient } from '../../../services/apiClient';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

export const useCuetResults = () => {
  const { showToast } = useToast();

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch {
    // Graceful fallback if context is not mounted
  }

  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [diagnostics, setDiagnostics] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Initialize from local storage on mount, then reconcile with backend database
  useEffect(() => {
    // 1. Fast synchronous load from local cache to prevent layout flicker
    const savedResults = storageService.get(storageService.KEYS.CUET_RESULTS, null);
    if (savedResults && savedResults.semesters && savedResults.overall) {
      setResultData({ ...savedResults, isSavedCopy: true });
      setIsCached(true);
    }

    // 2. Asynchronously reconcile with backend database if user is authenticated
    if (apiClient.hasSession()) {
      cuetResultService.getSavedResults()
        .then(backendData => {
          if (backendData && backendData.semesters && backendData.overall) {
            setResultData({ ...backendData, isSavedCopy: true });
            setIsCached(true);
            storageService.set(storageService.KEYS.CUET_RESULTS, backendData);
          } else if (!backendData && savedResults && savedResults.semesters && savedResults.overall) {
            // Local copy exists but backend has no record yet -> sync to backend
            cuetResultService.saveResultsToBackend(savedResults).catch(err => {
              console.warn('Background sync of cached results to backend failed:', err);
            });
          }
        })
        .catch(err => {
          console.warn('Failed to load academic results from backend:', err);
        });
    }
  }, [authUser?.id]);

  /**
   * Imports results by parsing raw HTML content from CUET result portal.
   * 100% Zero password needed.
   */
  const importFromHtml = useCallback(async (rawHtml, studentFallback = {}) => {
    setIsLoading(true);
    setError(null);
    setDiagnostics(null);

    try {
      const fallback = {
        studentId: studentFallback.studentId || authUser?.studentId || '',
        name: studentFallback.name || authUser?.name || '',
        department: studentFallback.department || authUser?.department || ''
      };

      const normalized = await cuetResultService.importFromHtml(rawHtml, fallback);

      setResultData(normalized);
      setIsCached(true);
      storageService.set(storageService.KEYS.CUET_RESULTS, normalized);
      showToast('Official results successfully imported and saved to database!', 'success');
      return normalized;
    } catch (err) {
      const diag = cuetResultService.diagnoseHtml(rawHtml);
      setDiagnostics(diag);
      const msg = err.message || 'Failed to parse CUET result page. Please review the diagnostic report.';
      setError(msg);
      showToast(msg, 'error');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [authUser, showToast]);

  /**
   * Clears official results from state, local cache, and permanently deletes from the backend database
   */
  const clearResults = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Delete from backend database if user is authenticated
      if (apiClient.hasSession()) {
        await cuetResultService.deleteResultsFromBackend();
      }

      // 2. Clear local storage cache and in-memory state
      localStorage.removeItem(storageService.KEYS.CUET_RESULTS);
      setResultData(null);
      setIsCached(false);
      setDiagnostics(null);
      setError(null);

      showToast('Academic results permanently deleted from database and local storage.', 'info');
    } catch (err) {
      console.error('Failed to delete academic results from database:', err);
      showToast('Failed to delete results from database: ' + (err.message || 'Server error'), 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  return {
    resultData,
    isLoading,
    error,
    diagnostics,
    isCached,
    importFromHtml,
    clearResults
  };
};
