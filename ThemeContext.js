import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ThemeContext = createContext();

// Named export so NavBar can import it directly
// Returns undefined (system font) since custom fonts are not loaded
export function fontFamily(weight, fontsLoaded) {
  return undefined;
}

export const THEMES = {
  dark: {
    bg:           '#0d1117',
    bgCard:       '#161b22',
    bgInput:      '#1c2128',
    bgHeader:     '#1e3a5f',
    border:       '#30363d',
    borderLight:  '#21262d',
    text:         '#ffffff',
    textSub:      '#cbd5e1',
    textMuted:    '#3b82f6',
    accent:       '#3b82f6',
    accentDim:    '#1e3a5f',
    accentText:   '#60a5fa',
    red:          '#ef4444',
    blue:         '#60a5fa',
    orange:       '#fb923c',
    tabBg:        '#161b22',
    tabBorder:    '#30363d',
    statusBarStyle: 'light',
  },
  light: {
    bg:           '#f0f4f8',
    bgCard:       '#ffffff',
    bgInput:      '#f8fafc',
    bgHeader:     '#2563eb',
    border:       '#e2e8f0',
    borderLight:  '#f1f5f9',
    text:         '#0f172a',
    textSub:      '#1e3a5f',
    textMuted:    '#2563eb',
    accent:       '#2563eb',
    accentDim:    '#dbeafe',
    accentText:   '#1d4ed8',
    red:          '#ef4444',
    blue:         '#2563eb',
    orange:       '#fb923c',
    tabBg:        '#ffffff',
    tabBorder:    '#e2e8f0',
    statusBarStyle: 'dark',
  },
};

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode,      setMode]      = useState('system');
  const [fontScale, setFontScale] = useState(1.15);
  const [theme,     setTheme]     = useState(THEMES.dark);

  useEffect(() => {
    AsyncStorage.multiGet(['batknock_theme', 'batknock_fontscale']).then(pairs => {
      const savedMode  = pairs[0][1];
      const savedScale = pairs[1][1];
      if (savedMode)  setMode(savedMode);
      if (savedScale) setFontScale(parseFloat(savedScale));
    });
  }, []);

  useEffect(() => {
    const resolved = mode === 'system' ? (systemScheme || 'dark') : mode;
    setTheme(THEMES[resolved] || THEMES.dark);
    AsyncStorage.setItem('batknock_theme', mode);
  }, [mode, systemScheme]);

  useEffect(() => {
    AsyncStorage.setItem('batknock_fontscale', fontScale.toString());
  }, [fontScale]);

  const fs = (size) => Math.round(size * fontScale);
  const fontFamily = (weight) => undefined; // placeholder — custom fonts not loaded

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, fontScale, setFontScale, fs, fontFamily, fontsLoaded: true }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
