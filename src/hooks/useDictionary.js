import { useState, useEffect, useRef, useCallback } from 'react';
import { dictionaryService } from '../services/dictionaryService';
import {
  DICTIONARY_STORAGE_KEYS,
  MAX_RECENT_SEARCHES,
  MAX_CACHE_ENTRIES,
  CACHE_EXPIRY_MS
} from '../constants/dictionaryConstants';
import { normalizeWord } from '../utils/dictionaryUtils';

// Helper to read recent searches from LocalStorage
const getStoredRecentSearches = () => {
  try {
    const data = localStorage.getItem(DICTIONARY_STORAGE_KEYS.RECENT_SEARCHES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

// Helper to save recent searches to LocalStorage
const saveStoredRecentSearches = (list) => {
  try {
    localStorage.setItem(DICTIONARY_STORAGE_KEYS.RECENT_SEARCHES, JSON.stringify(list));
  } catch (e) {
    console.error('Error saving recent dictionary searches:', e);
  }
};

// Helper to read cached lookup from LocalStorage/Memory
const getCachedLookup = (word) => {
  try {
    const rawCache = localStorage.getItem(DICTIONARY_STORAGE_KEYS.CACHE);
    if (!rawCache) return null;
    const cacheMap = JSON.parse(rawCache);
    const key = normalizeWord(word);
    const item = cacheMap[key];

    if (item && item.timestamp && (Date.now() - item.timestamp < CACHE_EXPIRY_MS)) {
      return item.data;
    }
  } catch (e) {
    return null;
  }
  return null;
};

// Helper to save successful lookup to LocalStorage cache
const setCachedLookup = (word, data) => {
  try {
    const key = normalizeWord(word);
    const rawCache = localStorage.getItem(DICTIONARY_STORAGE_KEYS.CACHE);
    let cacheMap = rawCache ? JSON.parse(rawCache) : {};

    cacheMap[key] = {
      timestamp: Date.now(),
      data
    };

    // Bounded cache cleanup if keys exceed max entries
    const keys = Object.keys(cacheMap);
    if (keys.length > MAX_CACHE_ENTRIES) {
      // Sort keys by oldest timestamp and delete excess
      const sortedKeys = keys.sort((a, b) => (cacheMap[a].timestamp || 0) - (cacheMap[b].timestamp || 0));
      while (sortedKeys.length > MAX_CACHE_ENTRIES) {
        const oldest = sortedKeys.shift();
        delete cacheMap[oldest];
      }
    }

    localStorage.setItem(DICTIONARY_STORAGE_KEYS.CACHE, JSON.stringify(cacheMap));
  } catch (e) {
    console.error('Error writing to dictionary cache:', e);
  }
};

export const useDictionary = () => {
  const [query, setQuery] = useState('');
  const [submittedWord, setSubmittedWord] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'not-found' | 'error'
  const [errorType, setErrorType] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [recentSearches, setRecentSearches] = useState(getStoredRecentSearches);
  const [isOpen, setIsOpen] = useState(false);

  const abortControllerRef = useRef(null);

  // Sync recent searches to state
  const addRecentSearch = useCallback((wordStr) => {
    const trimmed = (wordStr || '').trim();
    if (!trimmed) return;
    const normalized = normalizeWord(trimmed);

    setRecentSearches(prevList => {
      const filtered = prevList.filter(item => normalizeWord(item.word) !== normalized);
      const updated = [{ word: trimmed, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      saveStoredRecentSearches(updated);
      return updated;
    });
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(DICTIONARY_STORAGE_KEYS.RECENT_SEARCHES);
    } catch (e) {
      console.error('Error clearing recent searches:', e);
    }
  }, []);

  const searchWord = useCallback(async (wordToSearch, options = {}) => {
    const targetWord = (wordToSearch ?? query).trim();

    if (!targetWord) {
      setStatus('idle');
      setErrorType('empty');
      setErrorMessage('Enter an English word to search.');
      setResult(null);
      setIsOpen(true);
      return;
    }

    // Cancel pending active request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setQuery(targetWord);
    setSubmittedWord(targetWord);
    setIsOpen(true);

    // Check bounded cache first
    const cachedData = getCachedLookup(targetWord);
    if (cachedData && !options.skipCache) {
      setResult(cachedData);
      setStatus('success');
      setErrorType(null);
      setErrorMessage('');
      addRecentSearch(targetWord);
      return;
    }

    setStatus('loading');
    setErrorType(null);
    setErrorMessage('');

    const res = await dictionaryService.searchEnglishWord(targetWord, { signal: controller.signal });

    // If cancelled, ignore
    if (res.errorType === 'cancelled') {
      return;
    }

    if (res.success && res.data) {
      setResult(res.data);
      setStatus('success');
      setErrorType(null);
      setErrorMessage('');
      setCachedLookup(targetWord, res.data);
      addRecentSearch(targetWord);
    } else {
      setResult(null);
      if (res.errorType === 'not-found') {
        setStatus('not-found');
        setErrorType('not-found');
      } else {
        setStatus('error');
        setErrorType(res.errorType || 'error');
      }
      setErrorMessage(res.message || 'Lookup failed.');
    }
  }, [query, addRecentSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSubmittedWord('');
    setResult(null);
    setStatus('idle');
    setErrorType(null);
    setErrorMessage('');
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    submittedWord,
    result,
    status,
    errorType,
    errorMessage,
    recentSearches,
    isOpen,
    setIsOpen,
    searchWord,
    clearSearch,
    clearRecentSearches
  };
};
