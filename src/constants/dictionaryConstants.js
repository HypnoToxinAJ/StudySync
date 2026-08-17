export const DICTIONARY_API_BASE_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en/';

export const DICTIONARY_STORAGE_KEYS = {
  RECENT_SEARCHES: 'studysync.dictionary.recentSearches',
  CACHE: 'studysync.dictionary.cache'
};

export const MAX_RECENT_SEARCHES = 10;
export const MAX_CACHE_ENTRIES = 30;
export const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
export const MAX_QUERY_LENGTH = 80;
export const DEFAULT_VISIBLE_DEFINITIONS = 3;
