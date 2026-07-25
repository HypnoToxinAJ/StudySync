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
