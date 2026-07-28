import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../ThemeContext';

function getFontFamily(fontWeight, fontsLoaded) {
  if (!fontsLoaded) return undefined;
  const w = String(fontWeight || '400');
  if (w === '900') return 'Nunito_900Black';
  if (w === '800') return 'Nunito_800ExtraBold';
  if (w === '700') return 'Nunito_700Bold';
  if (w === '600') return 'Nunito_600SemiBold';
  if (w === '500') return 'Nunito_500Medium';
  if (w === '300') return 'Nunito_300Light';
  return 'Nunito_400Regular';
}

export default function AppText({ style, children, ...props }) {
  const { fontsLoaded } = useTheme();
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
