import { useState, useCallback, useEffect } from 'react';
import { pdfFileUtils } from '../utils/pdfFileUtils';

export const usePdfDocument = () => {
  const [file, setFile] = useState(null);
  const [objectUrl, setObjectUrl] = useState(null);
  const [docFingerprint, setDocFingerprint] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordNeeded, setPasswordNeeded] = useState(false);
  const [password, setPassword] = useState('');

  // Viewer Navigation & Viewport State
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0); // 1.0 = 100%
  const [fitMode, setFitMode] = useState('custom'); // 'custom' | 'page' | 'width'
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [viewMode, setViewMode] = useState('continuous'); // 'continuous' | 'single'
  const [interactionTool, setInteractionTool] = useState('select'); // 'select' | 'pan'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState({ current: 0, total: 0, matches: [] });

  // Sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('thumbnails'); // 'thumbnails' | 'outline' | 'notes'

  // Clean up object URL when component unmounts or file changes
  useEffect(() => {
    return () => {
      if (objectUrl) {
        pdfFileUtils.revokeObjectUrl(objectUrl);
      }
    };
  }, [objectUrl]);

  const loadPdfFile = useCallback((newFile) => {
    if (!newFile) return false;

    const validation = pdfFileUtils.validatePdfFile(newFile);
    if (!validation.isValid) {
      setFileError(validation.message);
      return false;
    }

    setFileError('');
    setIsLoading(true);
    setPasswordNeeded(false);

    // Revoke previous URL if any
    if (objectUrl) {
      pdfFileUtils.revokeObjectUrl(objectUrl);
    }

    const newUrl = pdfFileUtils.createObjectUrl(newFile);
    const fingerprint = pdfFileUtils.getFingerprint(newFile);

    setFile(newFile);
    setObjectUrl(newUrl);
    setDocFingerprint(fingerprint);
    setCurrentPage(1);
    setRotation(0);
    setZoomScale(1.0);
    setFitMode('custom');
    setSearchQuery('');
    setSearchResults({ current: 0, total: 0, matches: [] });

    return true;
  }, [objectUrl]);

  const closePdfDocument = useCallback(() => {
    if (objectUrl) {
      pdfFileUtils.revokeObjectUrl(objectUrl);
    }
    setFile(null);
    setObjectUrl(null);
    setDocFingerprint(null);
    setFileError('');
    setIsLoading(false);
    setPasswordNeeded(false);
    setPassword('');
    setNumPages(0);
    setCurrentPage(1);
  }, [objectUrl]);

  const goToPage = useCallback((pageNum) => {
    const target = Math.max(1, Math.min(pageNum, numPages || 1));
    setCurrentPage(target);
  }, [numPages]);

  const zoomIn = useCallback(() => {
    setFitMode('custom');
    setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setFitMode('custom');
    setZoomScale((prev) => Math.max(0.4, Number((prev - 0.15).toFixed(2))));
  }, []);

  const rotateClockwise = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  const rotateCounterClockwise = useCallback(() => {
    setRotation((prev) => (prev + 270) % 360);
  }, []);

  return {
    file,
    objectUrl,
    docFingerprint,
    fileError,
    isLoading,
    setIsLoading,
    passwordNeeded,
    setPasswordNeeded,
    password,
    setPassword,
    currentPage,
    setCurrentPage,
    numPages,
    setNumPages,
    zoomScale,
    setZoomScale,
    fitMode,
    setFitMode,
    rotation,
    setRotation,
    viewMode,
    setViewMode,
    interactionTool,
    setInteractionTool,
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSidebarOpen,
    setIsSidebarOpen,
    sidebarTab,
    setSidebarTab,
    loadPdfFile,
    closePdfDocument,
    goToPage,
    zoomIn,
    zoomOut,
    rotateClockwise,
    rotateCounterClockwise
  };
};
