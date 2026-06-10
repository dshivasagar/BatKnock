/**
 * AppText.js
 * Drop-in replacement for React Native Text that automatically
 * applies General Sans font family based on fontWeight.
 *
 * Usage: import AppText from '../components/AppText';
 *        <AppText style={{ fontSize: 16, fontWeight: '700' }}>Hello</AppText>
 */
import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../ThemeContext';

// Maps fontWeight to General Sans variant
function getFontFamily(fontWeight, fontsLoaded) {
  if (!fontsLoaded) return undefined;
  const w = String(fontWeight || '400');
  if (w === '800' || w === '900') return 'GeneralSans-Bold';
  if (w === '700')                return 'GeneralSans-Semibold';
  if (w === '600' || w === '500') return 'GeneralSans-Medium';
  return 'GeneralSans-Regular';
}

export default function AppText({ style, children, ...props }) {
  const { fontsLoaded } = useTheme();

  // Flatten style to read fontWeight
  const flat = Array.isArray(style)
    ? Object.assign({}, ...style.map(s => s || {}))
    : (style || {});

  const fontFamily = getFontFamily(flat.fontWeight, fontsLoaded);

  return (
    <Text style={[style, fontFamily ? { fontFamily } : undefined]} {...props}>
      {children}
    </Text>
  );
}
