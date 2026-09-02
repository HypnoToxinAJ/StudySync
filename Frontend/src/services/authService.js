import { supabase } from './supabaseClient';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message || 'Authentication failed.', { cause: error });
  return data;
};

export const authService = {
  login: async (email, password) => unwrap(
    await supabase.auth.signInWithPassword({ email, password })
  ),

  register: async ({ email, password, ...profile }) => unwrap(
    await supabase.auth.signUp({
      email,
      password,
      options: { data: { ...profile, onboarded: false } }
    })
  ),

  loginWithGoogle: async () => unwrap(
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${globalThis.location.origin}${globalThis.location.pathname}`
      }
    })
  ),

  restoreSession: async () => unwrap(await supabase.auth.getSession()),

  completeOnboarding: async onboardingData => unwrap(
    await supabase.auth.updateUser({ data: { ...onboardingData, onboarded: true } })
  ),

  forgotPassword: async email => unwrap(
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${globalThis.location.origin}${globalThis.location.pathname}#/reset-password`
    })
  ),

  resetPassword: async ({ password }) => unwrap(
    await supabase.auth.updateUser({ password })
  ),

  logout: async () => unwrap(await supabase.auth.signOut()),

  getCurrentUser: async () => unwrap(await supabase.auth.getUser())
};
