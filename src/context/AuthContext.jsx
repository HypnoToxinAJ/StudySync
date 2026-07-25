import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storageService.initialize();
    let storedUser = authService.getCurrentUser();
    if (!storedUser || storedUser.isLoggedIn === undefined) {
      storedUser = {
        ...storedUser,
        name: storedUser?.name || 'Tanvir Ahmed',
        email: storedUser?.email || 'tanvir.student@university.edu.bd',
        isLoggedIn: true,
        onboarded: true
      };
      storageService.set(storageService.KEYS.USER, storedUser);
    }
    setUser(storedUser);
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const loginWithGoogle = async () => {
    const loggedInUser = await authService.loginWithGoogle();
    setUser(loggedInUser);
    return loggedInUser;
  };

  const register = async (userData) => {
    const newUser = await authService.register(userData);
    setUser(newUser);
    return newUser;
  };

  const completeOnboarding = async (onboardingData) => {
    const updated = await authService.completeOnboarding(onboardingData);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    authService.logout();
    setUser(prev => ({ ...prev, isLoggedIn: false }));
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      loginWithGoogle,
      register,
      completeOnboarding,
      logout,
      setUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
