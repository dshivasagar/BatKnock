/**
 * BatProfileScreen.js — BatKnock v1.2.0
 *
 * Added: camera/gallery photo import
 * The bat photo is stored as photo_uri in the bat record.
 * Tap the bat image area to pick from camera or gallery.
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar, { NavButton } from '../components/NavBar';
import { getBatById, getSessionsByBat, saveBat } from '../storage/database';

const ZONES = [
  { id: 'sweet-spot', label: 'Sweet Spot', desc: 'Main hitting area' },
  { id: 'edge',       label: 'Edge',       desc: 'Longer side edges' },
  { id: 'toe',        label: 'Toe',        desc: 'Bottom of bat' },
  { id: 'top-edge',   label: 'Top Edge',   desc: 'Top of bat face' },
];

export default function BatProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const [bat, setBat] = useState(route.params?.bat);
  const [sessions, setSessions] = useState([]);
  const [sessionHistoryExpanded, setSessionHistoryExpanded] = useState(true);
  const [acousticExpanded, setAcousticExpanded] = useState(false);
  const [selectedZone, setSelectedZone] = useState('sweet-spot');

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

  // ── Photo import ────────────────────────────────────────────────────────
  const handlePhotoPress = () => {
    Alert.alert('Bat Photo', 'Choose how to add a photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Camera access is required to take photos.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 2.6],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await savePhoto(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permission needed', 'Gallery access is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 2.6],
            quality: 0.85,
          });
          if (!result.canceled && result.assets[0]) {
            await savePhoto(result.assets[0].uri);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const savePhoto = async (uri) => {
    const updatedBat = { ...bat, photo_uri: uri };
    await saveBat(updatedBat);
    setBat(updatedBat);
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
              <Text style={{ fontSize: 16 }}>🗑</Text>
            </NavButton>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Bat Photo ──────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handlePhotoPress}
          activeOpacity={0.85}
          style={{
            height: 200, backgroundColor: theme.bgCard,
            alignItems: 'center', justifyContent: 'center',
            borderBottomWidth: 1, borderBottomColor: theme.border,
          }}>
          {bat?.photo_uri ? (
            <>
              <Image
                source={{ uri: bat.photo_uri }}
                style={{ width: '100%', height: 200 }}
                resizeMode="cover"
              />
              {/* Edit overlay */}
              <View style={{
                position: 'absolute', bottom: 10, right: 12,
                backgroundColor: 'rgba(0,0,0,0.6)',
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 10,
              }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✏️ Change Photo</Text>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 56 }}>🏏</Text>
              <View style={{
                marginTop: 10, backgroundColor: theme.accentDim,
                paddingHorizontal: 14, paddingVertical: 7,
                borderRadius: 12,
              }}>
                <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>
                  📷 Add Bat Photo
                </Text>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 6 }}>
                Used for the heatmap overlay
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ── Bat Details ────────────────────────────────────────────────── */}
        <View style={{
          margin: 16, backgroundColor: theme.bgCard,
          borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            {[['Brand', bat?.brand], ['Willow', bat?.willow_type], ['Size', bat?.bat_size]].map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 2 }}>{l}</Text>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{v || '—'}</Text>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 14 }}>
            {[
              ['Weight', bat?.weight ? `${bat.weight}g` : '—'],
              ['Grains', bat?.grains || '—'],
            ].map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <Text style={{ color: theme.textMuted, fontSize: 11, marginBottom: 2 }}>{l}</Text>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>{v}</Text>
              </View>
            ))}
            <View style={{ flex: 1 }} />
          </View>
        </View>

        {/* ── Knocking Progress ──────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 12,
          backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
              KNOCKING PROGRESS
            </Text>
            {isReady && (
              <View style={{ backgroundColor: theme.accentDim, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '800' }}>✓ READY</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
            <View>
              <Text style={{ color: theme.accent, fontSize: 28, fontWeight: '800' }}>
                {isTimeBased ? Math.round(totalSeconds / 60) : totalKnocks.toLocaleString()}
              </Text>
              <Text style={{ color: theme.textSub, fontSize: 12 }}>
                {isTimeBased ? `/ ${targetMinutes} min` : `/ ${targetKnocks.toLocaleString()} knocks`}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{pct.toFixed(1)}%</Text>
              <Text style={{ color: theme.textSub, fontSize: 12 }}>{remaining}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateBat', { bat })}>
                <Text style={{ color: theme.accent, fontSize: 12, marginTop: 4 }}>⊙ Set Target</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, marginTop: 12 }}>
            <View style={{ height: 6, width: `${pct}%`, backgroundColor: theme.accent, borderRadius: 3 }} />
          </View>
          <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 6 }}>{progressLabel}</Text>
        </View>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 12,
          backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 }}>
            KNOCKING STATS
          </Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {[
              ['Total Knocks', totalKnocks.toLocaleString()],
              ['Total Time', `${totalHours.toFixed(1)} hrs`],
            ].map(([label, value]) => (
              <View key={label} style={{
                flex: 1, backgroundColor: theme.bgInput,
                borderRadius: 12, padding: 14, alignItems: 'center',
                borderWidth: 1, borderColor: theme.border,
              }}>
                <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '800' }}>{value}</Text>
                <Text style={{ color: theme.textSub, fontSize: 12, marginTop: 4 }}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Select Target Zone ──────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 12,
          backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8 }}>
            SELECT TARGET ZONE
          </Text>
          <Text style={{ color: theme.textSub, fontSize: 13, marginBottom: 12 }}>
            Choose which zone you are working on. The heatmap tracks coverage for this zone.
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ZONES.map(zone => (
              <TouchableOpacity
                key={zone.id}
                onPress={() => setSelectedZone(zone.id)}
                style={{
                  paddingHorizontal: 14, paddingVertical: 8,
                  borderRadius: 20, borderWidth: 1.5,
                  backgroundColor: selectedZone === zone.id ? theme.accentDim : theme.bgInput,
                  borderColor: selectedZone === zone.id ? theme.accent : theme.border,
                }}>
                <Text style={{
                  color: selectedZone === zone.id ? theme.accent : theme.textSub,
                  fontSize: 13, fontWeight: '700',
                }}>{zone.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Start Session ───────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.accent, borderRadius: 14,
              padding: 18, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 8,
            }}
            onPress={() => navigation.navigate('KnockingSession', { bat, zone: selectedZone })}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>⚡ Start Knocking Session</Text>
          </TouchableOpacity>
        </View>

        {/* ── View Heatmap ────────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 16, marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              backgroundColor: theme.bgCard, borderRadius: 14,
              padding: 16, alignItems: 'center',
              flexDirection: 'row', justifyContent: 'center', gap: 10,
              borderWidth: 1, borderColor: theme.border,
            }}
            onPress={() => navigation.navigate('Heatmap', { bat, selectedZone, pct })}>
            <Text style={{ color: '#ff6b35', fontSize: 18 }}>◉</Text>
            <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>View Heatmap</Text>
          </TouchableOpacity>
        </View>

        {/* ── Acoustic Trend ──────────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 8,
          backgroundColor: theme.bgCard, borderRadius: 14,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}
            onPress={() => setAcousticExpanded(e => !e)}>
            <Text style={{ color: theme.accent, fontSize: 14 }}>⌇</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>ACOUSTIC TREND</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{acousticExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {acousticExpanded && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={{ color: theme.textSub, fontSize: 13 }}>
                Acoustic tracking data will appear after multiple sessions.
              </Text>
            </View>
          )}
        </View>

        {/* ── Session History ─────────────────────────────────────────────── */}
        <View style={{
          marginHorizontal: 16, marginBottom: 32,
          backgroundColor: theme.bgCard, borderRadius: 14,
          borderWidth: 1, borderColor: theme.border,
        }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}
            onPress={() => setSessionHistoryExpanded(e => !e)}>
            <Text style={{ color: theme.accent, fontSize: 14 }}>◷</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600', flex: 1 }}>SESSION HISTORY</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>{sessionHistoryExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {sessionHistoryExpanded && (
            sessions.length === 0 ? (
              <View style={{ padding: 16, paddingTop: 0 }}>
                <Text style={{ color: theme.textSub, fontSize: 13 }}>No sessions yet</Text>
              </View>
            ) : sessions.map(s => (
              <View key={s.id} style={{
                paddingHorizontal: 16, paddingVertical: 12,
                borderTopWidth: 1, borderTopColor: theme.borderLight,
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <View>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                    {new Date(s.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  <Text style={{ color: theme.textSub, fontSize: 12, marginTop: 2 }}>
                    {Math.round((s.duration_seconds || 0) / 60)}m active · {s.selected_zone || 'sweet-spot'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.accent, fontSize: 20, fontWeight: '800' }}>{s.knock_count}</Text>
                  <Text style={{ color: theme.textSub, fontSize: 11 }}>knocks</Text>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
