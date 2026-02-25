import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, getThemeColors } from '@/theme/colors';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  colors: typeof colors.light;
  isDark: boolean;
}

const defaultThemeContext: ThemeContextType = {
  theme: 'light',
  themeMode: 'light',
  setThemeMode: async () => {},
  colors: colors.light,
  isDark: false,
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // Default to dark (spec: #0F0F14)
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Load saved theme preference
  useEffect(() => {
    loadTheme();
  }, []);

  // Update theme based on mode and system preference
  useEffect(() => {
    if (themeMode === 'system') {
      setTheme(systemColorScheme === 'dark' ? 'dark' : 'light');
    } else {
      setTheme(themeMode);
    }
  }, [themeMode, systemColorScheme]);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('rekto-theme');
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        setThemeModeState(saved as ThemeMode);
      } else {
        // If no theme saved, default to dark (spec)
        setThemeModeState('dark');
        await AsyncStorage.setItem('rekto-theme', 'dark');
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('rekto-theme', mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const themeColors = getThemeColors(theme);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        colors: themeColors,
        isDark: theme === 'dark',
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
