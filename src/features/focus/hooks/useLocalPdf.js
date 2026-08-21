import { useState, useEffect, useCallback, useRef } from 'react';
import { pdfFileUtils } from '../utils/pdfFileUtils';
import { focusPreferenceService } from '../services/focusPreferenceService';

export const useLocalPdf = () => {
  const [file, setFile] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const activeUrlRef = useRef(null);

  // Safely revoke object URL helper
  const cleanupUrl = useCallback(() => {
    if (activeUrlRef.current) {
      pdfFileUtils.revokeObjectUrl(activeUrlRef.current);
      activeUrlRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupUrl();
    };
  }, [cleanupUrl]);

  /**
   * Opens and validates a local PDF file, creating a safe temporary object URL
   */
  const openPdfFile = useCallback((selectedFile) => {
    if (!selectedFile) return false;

    setError('');
    setIsLoading(true);

    const validation = pdfFileUtils.validatePdfFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.message);
      setIsLoading(false);
      return false;
    }

    try {
      // Revoke previous object URL if any
      cleanupUrl();

      const newUrl = pdfFileUtils.createObjectUrl(selectedFile);
      activeUrlRef.current = newUrl;

      const info = {
        name: selectedFile.name,
        size: selectedFile.size,
        formattedSize: pdfFileUtils.formatFileSize(selectedFile.size),
        lastModified: selectedFile.lastModified,
        fingerprint: pdfFileUtils.getFingerprint(selectedFile)
      };

      setFile(selectedFile);
      setObjectUrl(newUrl);
      setFileInfo(info);

      // Record lightweight metadata in recent list
      focusPreferenceService.addRecentPdf(info);

      setIsLoading(false);
      return true;
    } catch (err) {
      console.error('Error creating PDF Object URL:', err);
      setError('Unable to open this PDF document. Please try another file.');
      setIsLoading(false);
      return false;
    }
  }, [cleanupUrl]);

  /**
   * Closes the active PDF and revokes its memory URL
   */
  const closePdf = useCallback(() => {
    cleanupUrl();
    setFile(null);
    setObjectUrl(null);
    setFileInfo(null);
    setError('');
  }, [cleanupUrl]);

  return {
    file,
    objectUrl,
    fileInfo,
    error,
    isLoading,
    openPdfFile,
    closePdf
  };
};
