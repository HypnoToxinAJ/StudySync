/**
 * Desmos API v1.12 Script Loader Service
 *
 * Handles singleton script loading, API key encoding, error handling,
 * timeouts, and retry capabilities without duplicating script tags or leaking keys.
 */

let desmosLoadingPromise = null;
const SCRIPT_TIMEOUT_MS = 15000;
const DESMOS_API_VERSION = 'v1.12';

export const desmosLoader = {
  /**
   * Checks if window.Desmos is available and ready
   */
  isLoaded: () => {
    return typeof window !== 'undefined' && Boolean(window.Desmos && window.Desmos.GraphingCalculator);
  },

  /**
   * Loads the official Desmos v1.12 API script
   * @returns {Promise<typeof window.Desmos>}
   */
  load: () => {
    // 1. Return immediately if already available in window
    if (desmosLoader.isLoaded()) {
      return Promise.resolve(window.Desmos);
    }

    // 2. Return existing in-flight promise if loading
    if (desmosLoadingPromise) {
      return desmosLoadingPromise;
    }

    // 3. Retrieve and validate API Key from Vite environment
    const rawApiKey = import.meta.env.VITE_DESMOS_API_KEY;
    if (!rawApiKey || typeof rawApiKey !== 'string' || !rawApiKey.trim()) {
      return Promise.reject({
        code: 'CONFIG_MISSING',
        message: 'Desmos is not configured. Add VITE_DESMOS_API_KEY to the environment.'
      });
    }

    const encodedKey = encodeURIComponent(rawApiKey.trim());
    const scriptSrc = `https://www.desmos.com/api/${DESMOS_API_VERSION}/calculator.js?apiKey=${encodedKey}`;

    desmosLoadingPromise = new Promise((resolve, reject) => {
      // Check if matching script element is already in DOM
      let script = document.querySelector(`script[src*="/api/${DESMOS_API_VERSION}/calculator.js"]`);

      let timeoutId = null;

      const cleanup = () => {
        if (timeoutId) clearTimeout(timeoutId);
      };

      const handleSuccess = () => {
        cleanup();
        if (window.Desmos) {
          resolve(window.Desmos);
        } else {
          desmosLoadingPromise = null;
          reject({
            code: 'API_UNAVAILABLE',
            message: 'Desmos library loaded but the global Desmos object is not ready.'
          });
        }
      };

      const handleError = () => {
        cleanup();
        desmosLoadingPromise = null;
        reject({
          code: 'NETWORK_ERROR',
          message: 'The calculator could not be loaded. Check your connection and try again.'
        });
      };

      timeoutId = setTimeout(() => {
        desmosLoadingPromise = null;
        reject({
          code: 'TIMEOUT',
          message: 'Loading the Desmos calculator timed out. Please check your network.'
        });
      }, SCRIPT_TIMEOUT_MS);

      if (script) {
        // Script tag already exists
        if (window.Desmos) {
          handleSuccess();
          return;
        }
        script.addEventListener('load', handleSuccess, { once: true });
        script.addEventListener('error', handleError, { once: true });
      } else {
        // Create and append official script tag
        script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = scriptSrc;
        script.async = true;
        script.defer = true;
        script.id = 'desmos-api-script';
        script.addEventListener('load', handleSuccess, { once: true });
        script.addEventListener('error', handleError, { once: true });
        document.head.appendChild(script);
      }
    });

    return desmosLoadingPromise;
  },

  /**
   * Resets the cached promise to allow retrying after failure
   */
  reset: () => {
    desmosLoadingPromise = null;
  }
};
