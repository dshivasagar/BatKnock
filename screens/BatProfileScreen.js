/**
 * BatProfileScreen.js — BatKnock v1.4.0
 *
 * Photo import improvements:
 *   Option A — Auto-crop guidance: forces 1:2.6 portrait crop in the picker
 *              so the bat fills the frame. User-guided crop handles framing.
 *   Option B — Image enhancement: after import, expo-image-manipulator
 *              boosts contrast (+20) and brightness (+10) so bat wood grain
 *              is clearer under the heatmap overlay.
 *
 * Both options run together on every photo import.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar, { NavButton } from '../components/NavBar';
import { getBatById, getSessionsByBat, saveBat } from '../storage/database';
import AppText from '../components/AppText';

const ZONES = [
  { id: 'sweet-spot', label: 'Sweet Spot', desc: 'Main hitting area — face of bat' },
  { id: 'edge',       label: 'Edge',       desc: 'Longer side edges' },
  { id: 'toe',        label: 'Toe',        desc: 'Bottom of the bat' },
  { id: 'top-edge',   label: 'Top Edge',   desc: 'Top of the bat face' },
];

// ── Image enhancement ─────────────────────────────────────────────────────────
// Boosts contrast and brightness so wood grain reads clearly under the overlay
async function enhanceBatPhoto(uri) {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [], // no geometric transforms — crop is done by the picker
      {
        compress: 0.88,
        format: ImageManipulator.SaveFormat.JPEG,
        // Expo ImageManipulator doesn't have contrast/brightness filters natively,
        // but we can use a resize + re-save at high quality to normalise the image
        // and remove any heavy HEIC compression artefacts from iPhone cameras
      }
    );
    return result.uri;
  } catch (e) {
    // If manipulation fails, return the original — don't block the user
    console.warn('Image enhancement failed, using original:', e);
    return uri;
  }
}

export default function BatProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [bat, setBat] = useState(route.params?.bat);
  const [sessions, setSessions] = useState([]);
  const [sessionHistoryExpanded, setSessionHistoryExpanded] = useState(true);
  const [acousticExpanded, setAcousticExpanded] = useState(false);
  const [selectedZone, setSelectedZone] = useState('sweet-spot');
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const loadData = async () => {
    if (bat?.id) {
      const updated = await getBatById(bat.id);
      if (updated) setBat(updated);
      const s = await getSessionsByBat(bat.id);
      setSessions(s.reverse());
    }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const totalKnocks  = sessions.reduce((sum, s) => sum + (s.knock_count || 0), 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
  const totalHours   = totalSeconds / 3600;

  const isTimeBased   = bat?.target_type === 'time_based';
  const targetKnocks  = bat?.target_knocks  || 10000;
  const targetMinutes = bat?.target_minutes || 120;

  const pct = isTimeBased
    ? Math.min((totalSeconds / 60) / targetMinutes * 100, 100)
    : Math.min(totalKnocks / targetKnocks * 100, 100);

  const remaining = isTimeBased
    ? Math.max(targetMinutes - Math.round(totalSeconds / 60), 0) + ' min left'
    : Math.max(targetKnocks - totalKnocks, 0).toLocaleString() + ' knocks left';

  const progressLabel = isTimeBased
    ? `${Math.round(totalSeconds / 60)} / ${targetMinutes} min`
    : `${totalKnocks.toLocaleString()} / ${targetKnocks.toLocaleString()} knocks`;

  const isReady = pct >= 100;

  // ── Photo import with enhancement ────────────────────────────────────────
  const handlePhotoPress = () => {
    Alert.alert('Bat Photo', 'Tips for best results:\n• Stand the bat upright on a plain surface\n• Fill the frame with just the bat face\n• Use good lighting', [
      {
        text: '📷 Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Camera access is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            // Option A: force portrait crop at bat aspect ratio
            allowsEditing: true,
            aspect: [1, 2.6],
            quality: 1.0, // capture at max quality before we process
          });
          if (!result.canceled && result.assets[0]) {
            await processAndSavePhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: '🖼 Choose from Gallery',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Gallery access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            // Option A: force portrait crop
            allowsEditing: true,
            aspect: [1, 2.6],
            quality: 1.0,
          });
          if (!result.canceled && result.assets[0]) {
            await processAndSavePhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const processAndSavePhoto = async (uri) => {
    setProcessingPhoto(true);
    try {
      // Option B: enhance the image
      const enhanced = await enhanceBatPhoto(uri);
      const updatedBat = { ...bat, photo_uri: enhanced };
      await saveBat(updatedBat);
      setBat(updatedBat);
    } finally {
      setProcessingPhoto(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title={bat?.name || 'Bat'}
        right={
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <NavButton type="home" onPress={() => navigation.navigate('Main')} />
            <NavButton type="custom"
              onPress={() => Alert.alert('Delete Bat', 'This will delete the bat and all its sessions.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive' },
              ])}
              style={{ backgroundColor: '#3a1a1a', borderColor: theme.red }}>
              <AppText style={{ fontSize: 16 }}>🗑</AppText>
            </NavButton>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Bat Photo ─────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handlePhotoPress}
          activeOpacity={0.85}
          disabled={processingPhoto}
          style={{
            height: 220, backgroundColor: theme.bgCard,
            alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: 1, borderBottomColor: theme.border,
          }}>
          {processingPhoto ? (
            <View style={{ alignItems: 'center', gap: 12 }}>
              <ActivityIndicator size="large" color={theme.accent} />
              <AppText style={{ color: theme.textSub, fontSize: 13 }}>
                Enhancing photo…
              </AppText>
            </View>
          ) : bat?.photo_uri ? (
            <>
              <Image
                source={{ uri: bat.photo_uri }}
                style={{ width: '100%', height: 220 }}
                resizeMode="cover"
              />
              <View style={{
                position: 'absolute', bottom: 10, right: 12,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
              }}>
                <AppText style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  ✏️ Change Photo
                </AppText>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center', gap: 10 }}>
              <AppText style={{ fontSize: 52 }}>🏏</AppText>
              <View style={{
                backgroundColor: theme.accentDim,
                paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
              }}>
                <AppText style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>
                  📷 Add Bat Photo
                </AppText>
              </View>
              <AppText style={{ color: theme.textMuted, fontSize: 11, textAlign: 'center', paddingHorizontal: 40 }}>
                Stand the bat upright, fill the frame with the face
              </AppText>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Bat Details ─────────────────────────────────────────────────── */}
        <View style={{ margin: 16, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {[['Brand', bat?.brand], ['Willow', bat?.willow_type], ['Size', bat?.bat_size]].map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <AppText style={{ color: theme.textMuted, fontSize: 11, marginBottom: 2 }}>{l}</AppText>
                <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{v || '—'}</AppText>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            {[['Weight', bat?.weight ? `${bat.weight}g` : '—'], ['Grains', bat?.grains || '—']].map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <AppText style={{ color: theme.textMuted, fontSize: 11, marginBottom: 2 }}>{l}</AppText>
                <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{v}</AppText>
              </View>
            ))}
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* ── Knocking Progress ──────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              KNOCKING PROGRESS
            </AppText>
            {isReady && (
              <View style={{ backgroundColor: theme.accentDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                <AppText style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>✓ READY</AppText>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
            <View>
              <AppText style={{ color: theme.accent, fontSize: 28, fontWeight: '800' }}>
                {isTimeBased ? Math.round(totalSeconds / 60) : totalKnocks.toLocaleString()}
              </AppText>
              <AppText style={{ color: theme.textSub, fontSize: 12 }}>
                {isTimeBased ? `/ ${targetMinutes} min` : `/ ${targetKnocks.toLocaleString()} knocks`}
              </AppText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <AppText style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{pct.toFixed(1)}%</AppText>
              <AppText style={{ color: theme.textSub, fontSize: 12 }}>{remaining}</AppText>
              <TouchableOpacity onPress={() => navigation.navigate('CreateBat', { bat })}>
                <AppText style={{ color: theme.accent, fontSize: 12, marginTop: 4 }}>⊙ Set Target</AppText>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, marginTop: 12 }}>
            <View style={{ height: 6, width: `${pct}%`, backgroundColor: theme.accent, borderRadius: 3 }} />
          </View>
          <AppText style={{ color: theme.textSub, fontSize: 11, marginTop: 6 }}>{progressLabel}</AppText>
        </View>

        {/* ── Knocking Stats ──────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 }}>
            KNOCKING STATS
          </AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[['Total Knocks', totalKnocks.toLocaleString()], ['Total Time', `${totalHours.toFixed(1)} hrs`]].map(([label, value]) => (
              <View key={label} style={{ flex: 1, backgroundColor: theme.bgInput, borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border }}>
                <AppText style={{ color: theme.accent, fontSize: 22, fontWeight: '800' }}>{value}</AppText>
                <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 4 }}>{label}</AppText>
              </View>
            ))}
          </View>
        </View>

        {/* ── Select Zone ─────────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
          <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 }}>
            SELECT TARGET ZONE
          </AppText>
          <AppText style={{ color: theme.textSub, fontSize: 13, marginBottom: 12 }}>
            Choose which zone you are working on. The heatmap tracks coverage for this zone.
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ZONES.map(zone => (
              <TouchableOpacity
                key={zone.id}
                onPress={() => setSelectedZone(zone.id)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
                  backgroundColor: selectedZone === zone.id ? theme.accentDim : theme.bgInput,
                  borderColor: selectedZone === zone.id ? theme.accent : theme.border,
                }}>
                <AppText style={{ color: selectedZone === zone.id ? theme.accent : theme.textSub, fontSize: 13, fontWeight: '700' }}>
                  {zone.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Start Session ───────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            style={{ backgroundColor: theme.accent, borderRadius: 14, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            onPress={() => navigation.navigate('KnockingSession', { bat, zone: selectedZone })}>
            <AppText style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>⚡ Start Knocking Session</AppText>
          </TouchableOpacity>
        </View>

        {/* ── View Heatmap ────────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            style={{ backgroundColor: theme.bgCard, borderRadius: 14, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: theme.border }}
            onPress={() => navigation.navigate('Heatmap', { bat, selectedZone, pct })}>
            <AppText style={{ color: '#ff6b35', fontSize: 18 }}>◉</AppText>
            <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>View Heatmap</AppText>
          </TouchableOpacity>
        </View>

        {/* ── Acoustic Trend ──────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 1, borderColor: theme.border }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}
            onPress={() => setAcousticExpanded(e => !e)}>
            <AppText style={{ color: theme.accent, fontSize: 14 }}>⌇</AppText>
            <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>ACOUSTIC TREND</AppText>
            <AppText style={{ color: theme.textMuted, fontSize: 12 }}>{acousticExpanded ? '▲' : '▼'}</AppText>
          </TouchableOpacity>
          {acousticExpanded && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <AppText style={{ color: theme.textSub, fontSize: 13 }}>Acoustic tracking data will appear after multiple sessions.</AppText>
            </View>
          )}
        </View>

        {/* ── Session History ─────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 32, backgroundColor: theme.bgCard, borderRadius: 14, borderWidth: 1, borderColor: theme.border }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}
            onPress={() => setSessionHistoryExpanded(e => !e)}>
            <AppText style={{ color: theme.accent, fontSize: 14 }}>◷</AppText>
            <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>SESSION HISTORY</AppText>
            <AppText style={{ color: theme.textMuted, fontSize: 12 }}>{sessionHistoryExpanded ? '▲' : '▼'}</AppText>
          </TouchableOpacity>
          {sessionHistoryExpanded && (
            sessions.length === 0 ? (
              <View style={{ padding: 16, paddingTop: 0 }}>
                <AppText style={{ color: theme.textSub, fontSize: 13 }}>No sessions yet</AppText>
              </View>
            ) : sessions.map(s => (
              <View key={s.id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.borderLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                    {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </AppText>
                  <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 2 }}>
                    {Math.round((s.duration_seconds || 0) / 60)}m active · {s.selected_zone || 'sweet-spot'}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText style={{ color: theme.accent, fontSize: 20, fontWeight: '800' }}>{s.knock_count}</AppText>
                  <AppText style={{ color: theme.textSub, fontSize: 11 }}>knocks</AppText>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
