/**
 * SeasonGuideScreen.js — BatKnock Phase 2
 *
 * Free seasonal calendar feature.
 * Lets the user browse cricket seasons by country (grouped by continent),
 * select their country, and see whether the current month is in-season.
 *
 * Selection is saved locally via AsyncStorage (paves the way for Phase 3
 * profile-based personalisation).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import AppText from '../components/AppText';
import { SEASON_DATA, CONTINENT_ICONS, MONTHS, isInSeason } from '../data/seasonData';

const STORAGE_KEY = 'batknock_selected_country';

export default function SeasonGuideScreen({ navigation }) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(val => {
      if (val) setSelected(val);
    });
  }, []);

  const selectCountry = async (countryName) => {
    setSelected(countryName);
    await AsyncStorage.setItem(STORAGE_KEY, countryName);
  };

  const clearSelection = async () => {
    setSelected(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  // Find selected country's data
  const selectedData = useMemo(() => {
    if (!selected) return null;
    for (const continent of Object.values(SEASON_DATA)) {
      const found = continent.find(c => c.country === selected);
      if (found) return found;
    }
    return null;
  }, [selected]);

  const currentMonthIdx = new Date().getMonth();
  const currentMonthName = MONTHS[currentMonthIdx];

  const inSeasonNow = selectedData
    ? isInSeason(selectedData.start, selectedData.end, currentMonthIdx)
    : null;

  // Filter countries by search term
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

  const toggleContinent = (continent) => {
    setExpanded(prev => ({ ...prev, [continent]: !prev[continent] }));
  };

  const seasonLabel = (c) => {
    if (c.start === null || c.end === null) return 'Year-round';
    return `${c.start} – ${c.end}`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Season Guide"
        subtitle="Cricket seasons by country" showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Intro */}
        <AppText style={{ color: theme.textSub, fontSize: 13, marginBottom: 16, lineHeight: 20 }}>
          Outdoor cricket seasons vary by climate. Select your country to see
          when your season runs and whether now is a good time to prepare your bat.
        </AppText>

        {/* Selected country card */}
        {selectedData && (
          <View style={{
            backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
            marginBottom: 16, borderWidth: 2,
            borderColor: inSeasonNow ? theme.accent : theme.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                  YOUR COUNTRY
                </AppText>
                <AppText style={{ color: theme.text, fontSize: 18, fontWeight: '800', marginTop: 4 }}>
                  {selected}
                </AppText>
                <AppText style={{ color: theme.textSub, fontSize: 13, marginTop: 4 }}>
                  Season: {seasonLabel(selectedData)}
                </AppText>
              </View>
              <TouchableOpacity onPress={clearSelection}
                style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
                         backgroundColor: theme.bgInput, borderWidth: 1, borderColor: theme.border }}>
                <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700' }}>Clear</AppText>
              </TouchableOpacity>
            </View>

            {/* In-season indicator */}
            <View style={{
              marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8,
              backgroundColor: inSeasonNow ? theme.accentDim : theme.bgInput,
              borderRadius: 10, padding: 10,
            }}>
              <AppText style={{ fontSize: 16 }}>{inSeasonNow ? '✅' : '⏳'}</AppText>
              <AppText style={{ color: inSeasonNow ? theme.accent : theme.textSub, fontSize: 13, fontWeight: '700', flex: 1 }}>
                {inSeasonNow
                  ? `${currentMonthName} is within your season — good time to prepare your bat`
                  : `${currentMonthName} is outside your season — plan ahead for next season`}
              </AppText>
            </View>
          </View>
        )}

        {/* Search */}
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search country…"
          placeholderTextColor={theme.textMuted}
          style={{
            backgroundColor: theme.bgInput, borderRadius: 12, padding: 12,
            color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.border,
            marginBottom: 16,
          }}
        />

        {/* Continent groups */}
        {Object.entries(filteredData).map(([continent, countries]) => (
          <View key={continent} style={{
            backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 10,
            borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
          }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 }}
              onPress={() => toggleContinent(continent)}>
              <AppText style={{ fontSize: 20 }}>{CONTINENT_ICONS[continent]}</AppText>
              <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700', flex: 1 }}>
                {continent}
              </AppText>
              <AppText style={{ color: theme.textMuted, fontSize: 12 }}>
                {countries.length} {expanded[continent] || search ? '▲' : '▼'}
              </AppText>
            </TouchableOpacity>

            {(expanded[continent] || search) && countries.map(c => (
              <TouchableOpacity
                key={c.country}
                onPress={() => selectCountry(c.country)}
                style={{
                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: theme.borderLight,
                  backgroundColor: selected === c.country ? theme.accentDim : 'transparent',
                }}>
                <AppText style={{
                  color: selected === c.country ? theme.accent : theme.text,
                  fontSize: 14, fontWeight: selected === c.country ? '700' : '500',
                }}>
                  {c.country}
                </AppText>
                <AppText style={{
                  color: selected === c.country ? theme.accent : theme.textSub,
                  fontSize: 12,
                }}>
                  {seasonLabel(c)}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
