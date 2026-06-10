import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Font families ─────────────────────────────────────────────────────────
// General Sans weights — falls back to system font if files not loaded
export const FONTS = {
  regular:  'GeneralSans-Regular',
  medium:   'GeneralSans-Medium',
  semibold: 'GeneralSans-Semibold',
  bold:     'GeneralSans-Bold',
  // System fallbacks
  system:   undefined,
};

// Use this in StyleSheet fontFamily fields
// When fontsLoaded is true: uses General Sans
// When false: uses platform default (SF Pro on iOS, Roboto on Android)
export function fontFamily(weight = 'regular', fontsLoaded = false) {
  if (!fontsLoaded) return undefined; // system font
  return FONTS[weight] || FONTS.regular;
}


const ThemeContext = createContext();

// Font scale multiplier
export const FONT_SCALES = {
  small: 0.85,
  normal: 1.0,
  large: 1.15,
  xlarge: 1.3,
};

export const THEMES = {
  // ── Dark theme: deep navy / slate inspired by finance app reference ──────
  dark: {
    bg:           '#0f1923',   // deep navy background
    bgCard:       '#1a2535',   // slightly lighter navy for cards
    bgInput:      '#243044',   // input fields
    bgHeader:     '#1a2535',   // header bar
    border:       '#2d3f55',   // subtle blue-grey border
    borderLight:  '#243044',   // lighter border for dividers
    text:         '#f0f4f8',   // near white — clean on dark navy
    textSub:      '#94a3b8',   // slate-400 — secondary text
    textMuted:    '#64748b',   // slate-500 — muted labels
    accent:       '#3b82f6',   // blue-500 — primary action
    accentDim:    '#1e3a5f',   // deep blue tint for backgrounds
    accentText:   '#93c5fd',   // blue-300 — accent text on dark
    red:          '#f87171',   // red-400
    blue:         '#60a5fa',   // blue-400
    orange:       '#fb923c',   // orange-400
    tabBg:        '#1a2535',
    tabBorder:    '#2d3f55',
    statusBarStyle: 'light',
  },
  // ── Light theme: soft blue-white glassmorphism ───────────────────────────
  light: {
    bg:           '#f0f4ff',   // very soft blue-white — like the reference screenshot
    bgCard:       '#ffffff',   // pure white cards with shadow feel
    bgInput:      '#f8faff',   // almost white input
    bgHeader:     '#1e40af',   // deep blue header
    border:       '#dbeafe',   // blue-100 — very soft blue border
    borderLight:  '#eff6ff',   // blue-50 — barely-there dividers
    text:         '#0f172a',   // slate-900 — near black, readable
    textSub:      '#1e3a5f',   // dark blue-grey secondary text
    textMuted:    '#475569',   // slate-600 muted text
    accent:       '#2563eb',   // blue-600 — primary action
    accentDim:    '#dbeafe',   // blue-100 tint
    accentText:   '#1d4ed8',   // blue-700 text on light
    red:          '#dc2626',   // red-600
    blue:         '#2563eb',   // blue-600
    orange:       '#d97706',   // amber-600
    tabBg:        '#ffffff',
    tabBorder:    '#dbeafe',
    statusBarStyle: 'dark',
  },
};

export function ThemeProvider({ children, fontsLoaded = false }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('dark');
  const [fontScale, setFontScale] = useState(1.0);
  const [theme, setTheme] = useState(THEMES.dark);

  useEffect(() => {
    AsyncStorage.multiGet(['batknock_theme', 'batknock_fontscale']).then(pairs => {
      const savedMode = pairs[0][1];
      const savedScale = pairs[1][1];
      if (savedMode) setMode(savedMode);
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

  // Helper: scale font size
  const fs = (size) => Math.round(size * fontScale);

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, fontScale, setFontScale, fs, fontsLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
