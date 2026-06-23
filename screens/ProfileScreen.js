/**
 * ProfileScreen.js — BatKnock Phase 3
 *
 * Local-only user profile. Nothing here is ever sent to a server —
 * all data is stored in AsyncStorage on the device.
 *
 * Fields:
 *   - Location (country) — reuses Season Guide's country list
 *   - Gender (optional)
 *   - Age range (optional)
 *
 * This profile feeds Phase 5's personalised knock recommendations
 * (willow type + location + season start date).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import AppText from '../components/AppText';
import { SEASON_DATA, CONTINENT_ICONS, findCountry, isInSeason, MONTHS } from '../data/seasonData';

const PROFILE_KEY = 'batknock_profile';
const COUNTRY_KEY = 'batknock_selected_country'; // shared with Season Guide

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];
const AGE_RANGES = ['Under 16', '16–24', '25–34', '35–44', '45–54', '55+'];

export default function ProfileScreen({ navigation }) {
  const { theme, fs } = useTheme();

  const [country, setCountry] = useState(null);
  const [gender, setGender]   = useState(null);
  const [ageRange, setAgeRange] = useState(null);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  // ── Load saved profile ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(PROFILE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        setCountry(p.country || null);
        setGender(p.gender || null);
        setAgeRange(p.ageRange || null);
      } else {
        // Fall back to Season Guide's country if profile not set yet
        const c = await AsyncStorage.getItem(COUNTRY_KEY);
        if (c) setCountry(c);
      }
      setLoaded(true);
    })();
  }, []);

  // ── Save profile (called whenever a field changes) ──────────────────────
  const saveProfile = async (updates) => {
    const next = {
      country: updates.country !== undefined ? updates.country : country,
      gender: updates.gender !== undefined ? updates.gender : gender,
      ageRange: updates.ageRange !== undefined ? updates.ageRange : ageRange,
    };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    // Keep Season Guide's key in sync
    if (next.country) {
      await AsyncStorage.setItem(COUNTRY_KEY, next.country);
    }
  };

  const selectCountry = (name) => {
    setCountry(name);
    setCountryPickerOpen(false);
    setSearch('');
    saveProfile({ country: name });
  };

  const selectGender = (g) => {
    const next = gender === g ? null : g;
    setGender(next);
    saveProfile({ gender: next });
  };

  const selectAgeRange = (a) => {
    const next = ageRange === a ? null : a;
    setAgeRange(next);
    saveProfile({ ageRange: next });
  };

  const clearProfile = () => {
    Alert.alert('Clear Profile', 'This removes your location, gender and age range from this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          setCountry(null); setGender(null); setAgeRange(null);
          await AsyncStorage.removeItem(PROFILE_KEY);
          await AsyncStorage.removeItem(COUNTRY_KEY);
        },
      },
    ]);
  };

  // ── Season info for selected country ────────────────────────────────────
  const countryData = useMemo(() => country ? findCountry(country) : null, [country]);
  const currentMonthIdx = new Date().getMonth();
  const inSeasonNow = countryData
    ? isInSeason(countryData.start, countryData.end, currentMonthIdx)
    : null;

  // ── Filtered country list for picker ─────────────────────────────────────
  const filteredData = useMemo(() => {
    if (!search.trim()) return SEASON_DATA;
    const term = search.trim().toLowerCase();
    const result = {};
    for (const [continent, countries] of Object.entries(SEASON_DATA)) {
      const matches = countries.filter(c => c.country.toLowerCase().includes(term));
      if (matches.length > 0) result[continent] = matches;
    }
    return result;
  }, [search]);

  const seasonLabel = (c) => {
    if (!c) return '';
    if (c.start === null || c.end === null) return 'Year-round';
    return `${c.start} – ${c.end}`;
  };

  if (!loaded) return null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Profile"
        subtitle="Stored on this device only" showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Privacy notice */}
        <View style={{
          backgroundColor: theme.accentDim, borderRadius: 14, padding: 14,
          marginBottom: 20, flexDirection: 'row', gap: 10, alignItems: 'flex-start',
          borderWidth: 1, borderColor: theme.accent,
        }}>
          <AppText style={{ fontSize: 18 }}>🔒</AppText>
          <AppText style={{ color: theme.accent, fontSize: 13, lineHeight: 19, flex: 1 }}>
            Your profile stays on this device. None of this information is uploaded,
            shared, or sent to any server. It's used only to personalise bat care
            recommendations within the app.
          </AppText>
        </View>

        {/* Location */}
        <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 }}>
          LOCATION
        </AppText>

        {!countryPickerOpen ? (
          <TouchableOpacity
            onPress={() => setCountryPickerOpen(true)}
            style={{
              backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: theme.border, marginBottom: 20,
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            }}>
            <View>
              <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                {country || 'Select your country'}
              </AppText>
              {countryData && (
                <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 3 }}>
                  Season: {seasonLabel(countryData)}
                  {inSeasonNow !== null && (inSeasonNow ? '  ·  ✅ in season now' : '  ·  ⏳ off season')}
                </AppText>
              )}
            </View>
            <AppText style={{ color: theme.textMuted, fontSize: 18 }}>›</AppText>
          </TouchableOpacity>
        ) : (
          <View style={{
            backgroundColor: theme.bgCard, borderRadius: 14, padding: 12,
            borderWidth: 1, borderColor: theme.border, marginBottom: 20,
          }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search country…"
              placeholderTextColor={theme.textMuted}
              autoFocus
              style={{
                backgroundColor: theme.bgInput, borderRadius: 10, padding: 12,
                color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.border,
                marginBottom: 10,
              }}
            />
            <ScrollView style={{ maxHeight: 320 }} nestedScrollEnabled>
              {Object.entries(filteredData).map(([continent, countries]) => (
                <View key={continent} style={{ marginBottom: 8 }}>
                  <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 4, marginTop: 6 }}>
                    {CONTINENT_ICONS[continent]} {continent}
                  </AppText>
                  {countries.map(c => (
                    <TouchableOpacity key={c.country} onPress={() => selectCountry(c.country)}
                      style={{
                        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                        paddingVertical: 9, paddingHorizontal: 4,
                        borderBottomWidth: 1, borderBottomColor: theme.borderLight,
                      }}>
                      <AppText style={{ color: theme.text, fontSize: 14 }}>{c.country}</AppText>
                      <AppText style={{ color: theme.textSub, fontSize: 12 }}>{seasonLabel(c)}</AppText>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => { setCountryPickerOpen(false); setSearch(''); }}
              style={{ marginTop: 10, alignItems: 'center', padding: 10,
                       borderRadius: 10, backgroundColor: theme.bgInput,
                       borderWidth: 1, borderColor: theme.border }}>
              <AppText style={{ color: theme.textMuted, fontSize: 13, fontWeight: '700' }}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        )}

        {/* Gender */}
        <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 }}>
          GENDER (OPTIONAL)
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
          {GENDER_OPTIONS.map(g => (
            <TouchableOpacity key={g} onPress={() => selectGender(g)}
              style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                backgroundColor: gender === g ? theme.accentDim : theme.bgCard,
                borderColor: gender === g ? theme.accent : theme.border,
              }}>
              <AppText style={{ color: gender === g ? theme.accent : theme.textSub, fontSize: 13, fontWeight: '700' }}>
                {g}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Age range */}
        <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 }}>
          AGE RANGE (OPTIONAL)
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
          {AGE_RANGES.map(a => (
            <TouchableOpacity key={a} onPress={() => selectAgeRange(a)}
              style={{
                paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5,
                backgroundColor: ageRange === a ? theme.accentDim : theme.bgCard,
                borderColor: ageRange === a ? theme.accent : theme.border,
              }}>
              <AppText style={{ color: ageRange === a ? theme.accent : theme.textSub, fontSize: 13, fontWeight: '700' }}>
                {a}
              </AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Clear profile */}
        {(country || gender || ageRange) && (
          <TouchableOpacity onPress={clearProfile}
            style={{
              alignItems: 'center', padding: 14, borderRadius: 14,
              backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: theme.red,
              marginBottom: 20,
            }}>
            <AppText style={{ color: theme.red, fontSize: 14, fontWeight: '700' }}>
              🗑 Clear Profile Data
            </AppText>
          </TouchableOpacity>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
