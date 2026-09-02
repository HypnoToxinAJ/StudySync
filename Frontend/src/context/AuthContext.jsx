import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import { storageService } from '../services/storageService';
import { setCurrentSession } from '../services/api';
import { apiClient } from '../services/apiClient';
import { supabase } from '../services/supabaseClient';

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

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback(async nextSession => {
    setCurrentSession(nextSession);
    setSession(nextSession);
    let nextUser = toStudySyncUser(nextSession?.user);

    if (nextUser) {
      try {
        const backendUser = await apiClient.get('/auth/me/');
        nextUser = {
          ...nextUser,
          ...backendUser,
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
      await storageService.prepareForUser(nextUser.id).catch(error => {
        console.warn('StudySync cloud data will retry when the backend is available.', error);
      });
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

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      // Keep the callback synchronous and perform application hydration separately.
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

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    throwIfError(error);
    return applySession(data.session);
  };

  const loginWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: oauthRedirectUrl()
      }
    });
    throwIfError(error);
    return data;
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
    const updated = toStudySyncUser(data.user);
    setUserState(updated);
    storageService.hydrateUser(updated);
    return updated;
  };

  const logout = async () => {
    await storageService.flushPending().catch(() => {});
    const { error } = await supabase.auth.signOut();
    throwIfError(error);
    setSession(null);
    setUserState(null);
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
      loading,
      login,
      loginWithGoogle,
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
