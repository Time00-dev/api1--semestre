import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

type Theme = 'light' | 'dark';
const storageKey = 'time00-theme';
const preference = window.matchMedia('(prefers-color-scheme: dark)');
const subscribe = (notify: () => void) => {
  preference.addEventListener('change', notify);
  return () => preference.removeEventListener('change', notify);
};
const systemTheme = () => preference.matches ? 'dark' : 'light';
function storedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'dark' || value === 'light' ? value : null;
  } catch {
    return null;
  }
}

export const ThemeContext = createContext<Theme>('light');
export const useTheme = () => useContext(ThemeContext);
export function useThemePreference() {
  const system = useSyncExternalStore(subscribe, systemTheme);
  const [manual, setManual] = useState(storedTheme);
  const theme = manual || system;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.colorMode = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#121922' : '#f3f6f8');
  }, [theme]);
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(storageKey, next); } catch { /* Permite a troca nesta aba. */ }
    setManual(next);
  }
  return { theme, toggleTheme };
}
