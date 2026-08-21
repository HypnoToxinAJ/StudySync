import { useState, useEffect, useCallback } from 'react';
import { desmosLoader } from '../services/desmosLoader';

export const useDesmos = () => {
  const [isLoaded, setIsLoaded] = useState(desmosLoader.isLoaded());
  const [isLoading, setIsLoading] = useState(!desmosLoader.isLoaded());
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (desmosLoader.isLoaded()) {
      setIsLoaded(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await desmosLoader.load();
      setIsLoaded(true);
      setError(null);
    } catch (err) {
      setIsLoaded(false);
      setError(err || {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred while loading Desmos.'
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = useCallback(() => {
    desmosLoader.reset();
    load();
  }, [load]);

  return {
    isLoaded,
    isLoading,
    error,
    retry
  };
};
