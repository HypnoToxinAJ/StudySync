import { useState, useEffect, useCallback, useRef } from 'react';
import { cuetResultService } from '../services/cuetResultService';
import { storageService } from '../../../services/storageService';
import { useToast } from '../../../context/ToastContext';

export const useCuetResults = () => {
  const { showToast } = useToast();

  const [resultData, setResultData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [rememberedStudentId, setRememberedStudentId] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState(null);

  const abortControllerRef = useRef(null);

  // Initialize from local storage on mount
  useEffect(() => {
    // 1. Load remembered Student ID if saved with consent
    const savedId = storageService.get(storageService.KEYS.REMEMBERED_STUDENT_ID, '');
    if (savedId) {
      setRememberedStudentId(savedId);
    }

    // 2. Load saved normalized result copy if user opted in
    const savedResults = storageService.get(storageService.KEYS.CUET_RESULTS, null);
    if (savedResults && savedResults.semesters && savedResults.overall) {
      setResultData({ ...savedResults, isSavedCopy: true });
      setIsCached(true);
    }
  }, []);

  /**
   * Safely archives legacy manual semesters if present before replacing with official results
   */
  const archiveManualSemestersIfNeeded = useCallback(() => {
    const manualSemesters = storageService.get(storageService.KEYS.SEMESTERS, []);
    if (manualSemesters && manualSemesters.length > 0) {
      const existingArchive = storageService.get(storageService.KEYS.MANUAL_SEMESTERS_ARCHIVE, null);
      if (!existingArchive) {
        storageService.set(storageService.KEYS.MANUAL_SEMESTERS_ARCHIVE, {
          semesters: manualSemesters,
          archivedAt: new Date().toISOString()
        });
      }
    }
  }, []);

  /**
   * Fetches official results from CUET Result Portal via secure proxy
   */
  const fetchOfficialResults = useCallback(async ({
    studentId,
    password,
    rememberStudentId = false,
    saveLocally = true
  }) => {
    if (!studentId || !password) {
      setError('Please provide both Student ID and Password.');
      return;
    }

    // Cancel any ongoing fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // 1. Remember student ID if user explicitly consented
      if (rememberStudentId) {
        storageService.set(storageService.KEYS.REMEMBERED_STUDENT_ID, studentId.trim());
        setRememberedStudentId(studentId.trim());
      } else {
        localStorage.removeItem(storageService.KEYS.REMEMBERED_STUDENT_ID);
        setRememberedStudentId('');
      }

      // 2. Archive manual entries safely
      archiveManualSemestersIfNeeded();

      // 3. Open a short-lived CAPTCHA challenge. The password stays in the proxy session.
      const challenge = await cuetResultService.startFetch(
        { studentId: studentId.trim(), password },
        abortControllerRef.current.signal
      );
      setCaptchaChallenge({
        ...challenge,
        studentId: studentId.trim(),
        saveLocally,
        rememberStudentId
      });
    } catch (err) {
      if (err.message !== 'Request was cancelled.') {
        setError(err.message || 'Unable to open the CUET CAPTCHA challenge.');
        showToast(err.message || 'Unable to open the CUET CAPTCHA challenge.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [archiveManualSemestersIfNeeded, showToast]);

  const completeCaptchaChallenge = useCallback(async (captcha) => {
    if (!captchaChallenge?.challengeId || !captcha.trim()) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const data = await cuetResultService.completeFetch(
        { challengeId: captchaChallenge.challengeId, captcha },
        abortControllerRef.current.signal
      );

      if (captchaChallenge.saveLocally) {
        storageService.set(storageService.KEYS.CUET_RESULTS, data);
      } else {
        localStorage.removeItem(storageService.KEYS.CUET_RESULTS);
      }

      setResultData(data);
      setIsCached(false);
      setCaptchaChallenge(null);
      showToast(`Official CUET results imported for ${data.student.name || data.student.studentId}!`, 'success');
    } catch (err) {
      if (err.message !== 'Request was cancelled.') {
        setError(err.message || 'An unexpected error occurred during CAPTCHA verification.');
        showToast(err.message || 'CAPTCHA verification failed.', 'error');
      }
    } finally {
      setIsLoading(false);
      // Ensure password reference in caller is cleared immediately
    }
  }, [captchaChallenge, showToast]);

  /**
   * Clears imported and saved result copy
   */
  const clearResults = useCallback(() => {
    localStorage.removeItem(storageService.KEYS.CUET_RESULTS);
    setResultData(null);
    setIsCached(false);
    setError(null);
    showToast('Imported CUET results cleared.', 'info');
  }, [showToast]);

  /**
   * Loads verified demonstration / test dataset
   */
  const loadDemoResults = useCallback((studentId = '1904055') => {
    archiveManualSemestersIfNeeded();
    const demoData = cuetResultService.getDemoCuetResults(studentId);
    setResultData(demoData);
    setIsCached(false);
    setError(null);
    showToast('Loaded verified CUET test dataset.', 'info');
  }, [archiveManualSemestersIfNeeded, showToast]);

  return {
    resultData,
    isLoading,
    error,
    captchaChallenge,
    isCached,
    rememberedStudentId,
    fetchOfficialResults,
    completeCaptchaChallenge,
    clearResults,
    loadDemoResults
  };
};
