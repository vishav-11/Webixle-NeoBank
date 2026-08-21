// src/context/ThemeContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme, Platform } from 'react-native';
import { DarkColors, LightColors } from '@/styles/theme';
import type { ColorScheme } from '@/styles/theme';

// ✅ Theme type — apne existing @/types se import karo agar wahan hai
export type Theme = 'dark' | 'light';

// ✅ ThemeColors = ColorScheme (jo ab string-based hai, literal nahi)
type ThemeColors = ColorScheme;

interface ThemeContextValue {
  theme:       Theme;
  colors:      ThemeColors;
  isDark:      boolean;
  toggleTheme: () => void;
  setTheme:    (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = '@mv_theme';

async function persistTheme(t: Theme) {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined')
        localStorage.setItem(STORAGE_KEY, t);
    } else {
      const { default: AsyncStorage } = await import(
        '@react-native-async-storage/async-storage'
      );
      await AsyncStorage.setItem(STORAGE_KEY, t);
    }
  } catch {}
}

async function loadTheme(): Promise<Theme | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined')
        return (localStorage.getItem(STORAGE_KEY) as Theme) ?? null;
      return null;
    }
    const { default: AsyncStorage } = await import(
      '@react-native-async-storage/async-storage'
    );
    return (await AsyncStorage.getItem(STORAGE_KEY)) as Theme | null;
  } catch {
    return null;
  }
}


export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();

  // Webixle's reference design is the light purple/white theme,
  // so default there regardless of system scheme; user can still
  // toggle to dark via setTheme/toggleTheme, and the choice persists.
  const [theme, setThemeState] = useState<Theme>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadTheme().then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved);
      }
      setLoaded(true);
    });
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    persistTheme(t);
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const colors: ThemeColors = theme === 'dark' ? DarkColors : LightColors;

  // ✅ Pehle system theme se render karo, storage load hone ke baad update hoga
  // This prevents blank screen AND flash
  return (
    <ThemeContext.Provider
      value={{ theme, colors, isDark: theme === 'dark', toggleTheme, setTheme }}
    >
      {/* ✅ loaded check hatao — seedha render karo */}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}