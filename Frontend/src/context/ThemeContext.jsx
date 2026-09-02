import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const user = storageService.get(storageService.KEYS.USER, {});
    return user?.themePreference || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const user = storageService.get(storageService.KEYS.USER, {});
    if (user && user.themePreference !== theme) {
      storageService.set(storageService.KEYS.USER, { ...user, themePreference: theme });
    }
  }, [theme]);

  useEffect(() => {
    const useProfileTheme = event => {
      const profileTheme = event.detail?.user?.themePreference;
      if (profileTheme) setTheme(profileTheme);
    };
    globalThis.addEventListener('studysync:profile-hydrated', useProfileTheme);
    globalThis.addEventListener('studysync:profile-synced', useProfileTheme);
    return () => {
      globalThis.removeEventListener('studysync:profile-hydrated', useProfileTheme);
      globalThis.removeEventListener('studysync:profile-synced', useProfileTheme);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
