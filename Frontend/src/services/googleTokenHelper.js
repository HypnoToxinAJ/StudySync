/**
 * Google Token Helper — extracts the Google provider_token from
 * the Supabase session for Calendar & Drive API calls.
 *
 * The provider_token is only available when the user logged in with Google
 * and the appropriate scopes were requested.
 */

import { supabase } from './supabaseClient';

/**
 * Get the Google provider token from the current Supabase session.
 * @returns {string|null} The Google access token, or null if unavailable.
 */
export const getGoogleProviderToken = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.provider_token || null;
  } catch {
    return null;
  }
};

/**
 * Synchronously check if we have a cached provider token.
 * Note: Supabase may clear provider_token after token refresh,
 * so this is best-effort.
 */
export const getCachedGoogleToken = () => {
  try {
    const stored = localStorage.getItem('studysync_supabase_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.provider_token || null;
    }
  } catch {
    // ignore parse errors
  }
  return null;
};

/**
 * Check if the current user logged in with Google (and thus might have a provider token).
 */
export const isGoogleUser = async () => {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.user?.app_metadata?.provider === 'google';
  } catch {
    return false;
  }
};

/**
 * The Google OAuth scopes needed for Calendar and Drive integration.
 */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export default {
  getGoogleProviderToken,
  getCachedGoogleToken,
  isGoogleUser,
  GOOGLE_SCOPES,
};
