/**
 * NavBar.js — Apple-inspired navigation component
 *
 * Buttons use squircle shape (borderRadius: 10) matching iOS style.
 * Icons are rendered as clean React Native Views (no external libs).
 */
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme, fontFamily } from '../ThemeContext';
import AppText from './AppText';

// Chevron-left icon drawn with two View lines (like SF Symbols chevron.left)
function ChevronLeft({ color, size = 16 }) {
  const t = size * 0.12;
  const h = size * 0.55;
  return (
    <View style={{ width: size * 0.6, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: t, height: h,
        backgroundColor: color,
        borderRadius: t / 2,
        transform: [{ rotate: '-45deg' }, { translateX: size * 0.06 }],
        position: 'absolute', top: size * 0.05,
      }} />
      <View style={{
        width: t, height: h,
        backgroundColor: color,
        borderRadius: t / 2,
        transform: [{ rotate: '45deg' }, { translateX: size * 0.06 }],
        position: 'absolute', bottom: size * 0.05,
      }} />
    </View>
  );
}

// House icon: roof triangle + box body
function HouseIcon({ color, size = 16 }) {
  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>
      {/* Roof */}
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: s * 0.52,
        borderRightWidth: s * 0.52,
        borderBottomWidth: s * 0.48,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
        position: 'absolute', top: 0,
      }} />
      {/* Body */}
      <View style={{
        width: s * 0.68, height: s * 0.50,
        backgroundColor: color,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
      }} />
    </View>
  );
}

export function NavButton({ onPress, type = 'back', accent, children, style }) {
  const { theme } = useTheme();
  const bg     = accent ? theme.accent  : theme.bgCard;
  const border = accent ? theme.accent  : theme.border;
  const color  = accent ? '#000'        : theme.text;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.65}
      style={[{
        width: 38, height: 38,
        borderRadius: 10,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: border,
      }, style]}
    >
      {type === 'back' && <ChevronLeft color={color} size={18} />}
      {type === 'home' && <HouseIcon  color={color} size={18} />}
      {type === 'custom' && children}
    </TouchableOpacity>
  );
}

export default function NavBar({ navigation, title, subtitle, showHome = false, right }) {
  const { theme, fontsLoaded } = useTheme();
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bgCard,
    }}>
      <NavButton type="back" onPress={() => navigation.goBack()} />

      <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
        <AppText style={{ color: theme.text, fontSize: 16, fontWeight: '700', fontFamily: fontFamily('semibold', fontsLoaded) }} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 1, fontFamily: fontFamily('regular', fontsLoaded) }} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right !== undefined ? right : (
        showHome
          ? <NavButton type="home" onPress={() => navigation.navigate('Main')} />
          : <View style={{ width: 38 }} />
      )}
    </View>
  );
}
