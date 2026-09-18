import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import { storageService } from '../services/storageService';
import { setCurrentSession } from '../services/api';
import { apiClient } from '../services/apiClient';
import { supabase } from '../services/supabaseClient';
import { assessmentApi } from '../services/assessmentApi';

const AuthContext = createContext(null);

const oauthRedirectUrl = () => `${globalThis.location.origin}${globalThis.location.pathname}`;

const toStudySyncUser = supabaseUser => {
  if (!supabaseUser) return null;

  const metadata = supabaseUser.user_metadata || {};
  const cached = storageService.get(storageService.KEYS.USER, null);
  const cachedProfile = cached?.id === supabaseUser.id ? cached : {};
  const emailName = supabaseUser.email?.split('@')[0] || 'Student';

  return {
    ...cachedProfile,
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    username: metadata.user_name || metadata.preferred_username || emailName,
    name: metadata.full_name || metadata.name || cachedProfile.name || emailName,
    avatarUrl: metadata.avatar_url || metadata.picture || cachedProfile.avatarUrl || '',
    university: metadata.university || cachedProfile.university || '',
    department: metadata.department || cachedProfile.department || '',
    semester: metadata.semester || cachedProfile.semester || '',
    studentId: metadata.studentId || cachedProfile.studentId || '',
    currency: metadata.currency || cachedProfile.currency || 'BDT',
    weeklyClassDays: metadata.weeklyClassDays || cachedProfile.weeklyClassDays || [],
    academicGoals: metadata.academicGoals || cachedProfile.academicGoals || '',
    onboarded: metadata.onboarded === true || cachedProfile.onboarded === true,
    isLoggedIn: true,
    provider: supabaseUser.app_metadata?.provider || 'email'
  };
};

const throwIfError = error => {
  if (error) throw new Error(error.message || 'Authentication failed.', { cause: error });
};

const GOOGLE_EXTRA_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [session, setSession] = useState(null);
  const [providerToken, setProviderToken] = useState(() => {
    try {
      return sessionStorage.getItem('studysync_google_provider_token') || null;
    } catch {
      return null;
    }
  });
  const [googleServicesGranted, setGoogleServicesGranted] = useState(() => {
    try {
      return sessionStorage.getItem('studysync_google_services_granted') === 'true';
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(true);
  const lastAppliedTokenRef = useRef(null);
  const isHydratingUserRef = useRef(false);

  const verifyGoogleServices = useCallback(async (tokenToCheck) => {
    const token = tokenToCheck || providerToken;
    if (!token) {
      setGoogleServicesGranted(false);
      try { sessionStorage.removeItem('studysync_google_services_granted'); } catch {}
      return false;
    }
    try {
      const status = await assessmentApi.checkGoogleStatus(token);
      const isConnected = Boolean(status?.connected && status?.hasCalendar && status?.hasDrive);
      setGoogleServicesGranted(isConnected);
      try {
        if (isConnected) {
          sessionStorage.setItem('studysync_google_services_granted', 'true');
        } else {
          sessionStorage.removeItem('studysync_google_services_granted');
        }
      } catch {}
      return isConnected;
    } catch (err) {
      console.warn('Google services verification check failed:', err);
      return false;
    }
  }, [providerToken]);

  const applySession = useCallback(async nextSession => {
    const token = nextSession?.access_token || null;
    setCurrentSession(nextSession);
    setSession(nextSession);
    // Capture the Google provider token when available (only present right after OAuth)
    if (nextSession?.provider_token) {
      setProviderToken(nextSession.provider_token);
      try {
        sessionStorage.setItem('studysync_google_provider_token', nextSession.provider_token);
      } catch {}

      const wasRequesting = sessionStorage.getItem('studysync_requesting_google_services') === 'true';
      if (wasRequesting) {
        sessionStorage.setItem('studysync_google_services_granted', 'true');
        sessionStorage.removeItem('studysync_requesting_google_services');
        setGoogleServicesGranted(true);
      } else {
        // Asynchronously verify scopes of newly received token
        assessmentApi.checkGoogleStatus(nextSession.provider_token).then(status => {
          const isConnected = Boolean(status?.connected && status?.hasCalendar && status?.hasDrive);
          setGoogleServicesGranted(isConnected);
          try {
            if (isConnected) {
              sessionStorage.setItem('studysync_google_services_granted', 'true');
            } else {
              sessionStorage.removeItem('studysync_google_services_granted');
            }
          } catch {}
        }).catch(() => {});
      }
    } else {
      const cached = sessionStorage.getItem('studysync_google_provider_token');
      if (cached) {
        setProviderToken(cached);
      }
    }
    let nextUser = toStudySyncUser(nextSession?.user);

    if (!nextSession?.user) {
      lastAppliedTokenRef.current = null;
      setUserState(null);
      storageService.clearWorkspaceCache();
      return null;
    }

    // Prevent duplicate simultaneous hydration for the same active session
    if (lastAppliedTokenRef.current === token && isHydratingUserRef.current) {
      return nextUser;
    }
    lastAppliedTokenRef.current = token;
    isHydratingUserRef.current = true;

    if (nextUser) {
      try {
        const backendUser = await apiClient.get('/auth/me/');
        nextUser = {
          ...nextUser,
          ...backendUser,
          onboarded: Boolean(nextUser.onboarded || backendUser?.onboarded),
          id: nextUser.id,
          email: nextUser.email,
          isLoggedIn: true
        };
      } catch (error) {
        console.error('Unable to register the signed-in user with StudySync.', error);
      }
    }

    setUserState(nextUser);

    if (nextUser) {
      storageService.hydrateUser(nextUser);
      try {
        await storageService.prepareForUser(nextUser.id);
      } catch (error) {
        console.warn('StudySync cloud data will retry when the backend is available.', error);
      } finally {
        isHydratingUserRef.current = false;
      }
    } else {
      isHydratingUserRef.current = false;
    }
    return nextUser;
  }, []);

  useEffect(() => {
    let active = true;
    storageService.initialize();

    const restoreSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        throwIfError(error);
        if (active) await applySession(data.session);
      } catch (error) {
        console.error('Unable to restore the Supabase session.', error);
        if (active) {
          setSession(null);
          setUserState(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active) return;
      if (event === 'INITIAL_SESSION' && nextSession?.access_token && nextSession.access_token === lastAppliedTokenRef.current) {
        return;
      }
      setTimeout(() => {
        if (active) void applySession(nextSession);
      }, 0);
    });

    void restoreSession();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [applySession]);

  useEffect(() => {
    const updateProfile = event => {
      const profile = event.detail?.user;
      if (!profile) return;
      setUserState(current => current
        ? { ...current, ...profile, id: current.id, email: current.email, isLoggedIn: true }
        : current);
    };
    globalThis.addEventListener('studysync:profile-synced', updateProfile);
    return () => globalThis.removeEventListener('studysync:profile-synced', updateProfile);
  }, []);

  useEffect(() => {
    if (providerToken && !googleServicesGranted) {
      verifyGoogleServices(providerToken);
    }
  }, [providerToken, googleServicesGranted, verifyGoogleServices]);

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwIfError(error);
    return applySession(data.session);
  };

  const loginWithGoogle = async (customOptions = {}) => {
    const { includeGoogleServices = false, ...restOptions } = customOptions;
    if (includeGoogleServices) {
      try {
        sessionStorage.setItem('studysync_requesting_google_services', 'true');
      } catch {}
    }
    const options = {
      redirectTo: oauthRedirectUrl(),
      ...(includeGoogleServices ? {
        scopes: GOOGLE_EXTRA_SCOPES,
        queryParams: { access_type: 'offline', prompt: 'consent' }
      } : {}),
      ...restOptions
    };
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options
    });
    throwIfError(error);
    return data;
  };

  const connectGoogleServices = async () => {
    return loginWithGoogle({ includeGoogleServices: true });
  };

  const register = async userData => {
    const { email, password, ...profile } = userData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { ...profile, onboarded: false } }
    });
    throwIfError(error);
    if (data.session) return applySession(data.session);
    return toStudySyncUser(data.user);
  };

  const completeOnboarding = async onboardingData => {
    const { data, error } = await supabase.auth.updateUser({
      data: { ...onboardingData, onboarded: true }
    });
    throwIfError(error);

    let updated = toStudySyncUser(data.user);
    updated = {
      ...updated,
      ...onboardingData,
      onboarded: true
    };

    if (apiClient.hasSession()) {
      try {
        const backendProfile = await apiClient.patch('/auth/me/', {
          ...onboardingData,
          onboarded: true
        });
        updated = {
          ...updated,
          ...backendProfile,
          onboarded: true
        };
      } catch (err) {
        console.warn('Could not sync onboarding to backend immediately:', err);
      }
    }

    setUserState(updated);
    storageService.hydrateUser(updated);
    storageService.set(storageService.KEYS.USER, updated);
    return updated;
  };

  const logout = async () => {
    await storageService.flushPending().catch(() => {});
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
    setSession(null);
    setUserState(null);
    setProviderToken(null);
    setGoogleServicesGranted(false);
    try {
      sessionStorage.removeItem('studysync_google_provider_token');
      sessionStorage.removeItem('studysync_google_services_granted');
      sessionStorage.removeItem('studysync_requesting_google_services');
    } catch {}
    storageService.clearWorkspaceCache();
    localStorage.removeItem(storageService.KEYS.USER);
  };

  const forgotPassword = async email => {
    const redirectTo = `${oauthRedirectUrl()}#/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    throwIfError(error);
  };

  const setUser = value => {
    setUserState(current => {
      const next = typeof value === 'function' ? value(current) : value;
      if (next) storageService.hydrateUser(next);
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      providerToken,
      hasGoogleServices: Boolean(providerToken && googleServicesGranted),
      isGoogleConnected: Boolean(providerToken && googleServicesGranted),
      googleServicesGranted,
      verifyGoogleServices,
      loading,
      login,
      loginWithGoogle,
      connectGoogleServices,
      register,
      completeOnboarding,
      logout,
      forgotPassword,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider.');
  return context;
};
