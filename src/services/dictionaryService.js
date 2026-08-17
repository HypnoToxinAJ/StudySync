import { DICTIONARY_API_BASE_URL, MAX_QUERY_LENGTH } from '../constants/dictionaryConstants';
import { normalizeWord, normalizeApiResponse } from '../utils/dictionaryUtils';

export const dictionaryService = {
  /**
   * Search English word definition via Free Dictionary API.
   * @param {string} word 
   * @param {object} options { signal }
   * @returns {Promise<object>} normalized result object or error classification object
   */
  searchEnglishWord: async (word, options = {}) => {
    const rawTrimmed = (word || '').trim();
    if (!rawTrimmed) {
      return {
        errorType: 'empty',
        message: 'Enter an English word to search.'
      };
    }

    if (rawTrimmed.length > MAX_QUERY_LENGTH) {
      return {
        errorType: 'invalid-input',
        message: `Word search exceeds maximum length of ${MAX_QUERY_LENGTH} characters.`
      };
    }

    const normalized = normalizeWord(rawTrimmed);
    const targetUrl = `${DICTIONARY_API_BASE_URL}${encodeURIComponent(normalized)}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        signal: options.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            errorType: 'not-found',
            word: rawTrimmed,
            message: `No definitions found for "${rawTrimmed}".`
          };
        } else if (response.status >= 500) {
          return {
            errorType: 'server',
            word: rawTrimmed,
            message: 'The dictionary service is temporarily unavailable. Please try again later.'
          };
        } else {
          return {
            errorType: 'error',
            word: rawTrimmed,
            message: 'Unable to fetch dictionary result.'
          };
        }
      }

      const data = await response.json();

      // Check if API returned explicit "No Definitions Found" object
      if (data && !Array.isArray(data) && data.title === 'No Definitions Found') {
        return {
          errorType: 'not-found',
          word: rawTrimmed,
          message: data.message || `No definitions found for "${rawTrimmed}".`
        };
      }

      if (!data || (Array.isArray(data) && data.length === 0)) {
        return {
          errorType: 'invalid-response',
          word: rawTrimmed,
          message: 'Received invalid response format from dictionary server.'
        };
      }

      const normalizedResult = normalizeApiResponse(data, rawTrimmed);
      return {
        success: true,
        data: normalizedResult
      };

    } catch (err) {
      if (err.name === 'AbortError') {
        return {
          errorType: 'cancelled',
          word: rawTrimmed
        };
      }

      return {
        errorType: 'network',
        word: rawTrimmed,
        message: 'We couldn’t reach the dictionary service. Check your connection and try again.'
      };
    }
  }
};
