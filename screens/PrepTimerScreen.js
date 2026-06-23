/**
 * PrepTimerScreen.js — Knockmate v2
 *
 * Added: bat selector + zone selector when accessed without bat context.
 * When accessed from BatProfileScreen, bat is pre-selected.
 * Timers and notifications are per-bat, per-zone.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import AppText from '../components/AppText';
import { getBats } from '../storage/database';

const STORAGE_KEY     = 'knockmate_prep_timers';
const LAST_BAT_KEY    = 'knockmate_prep_last_bat';
const LAST_ZONE_KEY   = 'knockmate_prep_last_zone';

const ZONES = [
  { id: 'sweet-spot', label: 'Sweet Spot', icon: '🎯' },
  { id: 'edge',       label: 'Edge',       icon: '⚡' },
  { id: 'toe',        label: 'Toe',        icon: '🦶' },
  { id: 'top-edge',   label: 'Top Edge',   icon: '🔝' },
];

const PHASES = [
  {
    id: 'oiling', phase: 1, icon: '🛢️', title: 'Oiling',
    desc: 'Apply raw linseed oil to the bat face, edges and back. Leave to soak in.',
    duration: 24 * 60 * 60, durationLabel: '24 hours',
    notifyTitle: '🏏 Bat Ready to Start Knocking',
    notifyBody: (bat, zone) => `${bat} has soaked for 24 hours. Time to start Phase 1 knocking on the ${zone}!`,
    color: '#fb923c',
  },
  {
    id: 'phase1', phase: 2, icon: '🔨', title: 'Phase 1 Knocking',
    desc: 'Light knocking with a mallet across the face and edges. Gradually increasing force.',
    duration: 60 * 60, durationLabel: '60 minutes',
    notifyTitle: '🏏 Phase 1 Complete',
    notifyBody: (bat, zone) => `${bat} Phase 1 done! Rest 30 mins then start Phase 2 on the ${zone}.`,
    color: '#60a5fa',
  },
  {
    id: 'phase2', phase: 3, icon: '💪', title: 'Phase 2 Knocking',
    desc: 'Medium force knocking. Focus on edges and toe. Oil again lightly if needed.',
    duration: 90 * 60, durationLabel: '90 minutes',
    notifyTitle: '🏏 Phase 2 Complete',
    notifyBody: (bat, zone) => `${bat} Phase 2 done! Rest overnight then complete Phase 3.`,
    color: '#a78bfa',
  },
  {
    id: 'phase3', phase: 4, icon: '🏏', title: 'Phase 3 Knocking',
    desc: 'Full force knocking. Test with an old ball. Bat is nearly ready to play.',
    duration: 120 * 60, durationLabel: '120 minutes',
    notifyTitle: '🏏 Bat Ready to Play!',
    notifyBody: (bat, zone) => `${bat} is fully knocked in and ready for action!`,
    color: '#34d399',
  },
];

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleNotification(phase, startTime, batName, zoneName) {
  const triggerTime = new Date(startTime + phase.duration * 1000);
  if (triggerTime <= new Date()) return null;
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: phase.notifyTitle,
      body: phase.notifyBody(batName, zoneName),
      sound: true,
    },
    trigger: { date: triggerTime },
  });
  return id;
}

export default function PrepTimerScreen({ navigation, route }) {
  const { theme, fs } = useTheme();

  // Bat from route (when opened from BatProfileScreen)
  const routeBat = route.params?.bat;

  const [allBats,       setAllBats]       = useState([]);
  const [selectedBat,   setSelectedBat]   = useState(routeBat || null);
  const [selectedZone,  setSelectedZone]  = useState('sweet-spot');
  const [showBatPicker, setShowBatPicker] = useState(false);
  const [timers,        setTimers]        = useState({});
  const [now,           setNow]           = useState(Date.now());

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(useCallback(() => {
    loadAllBats();
  }, []));

  // Reload timers when bat changes
  useEffect(() => {
    if (selectedBat?.id) loadTimers(selectedBat.id);
  }, [selectedBat]);

  const loadAllBats = async () => {
    const bats = await getBats();
    setAllBats(bats);

    // If no route bat, try to restore last used bat
    if (!routeBat) {
      const lastBatId  = await AsyncStorage.getItem(LAST_BAT_KEY);
      const lastZoneId = await AsyncStorage.getItem(LAST_ZONE_KEY);
      if (lastBatId && bats.length > 0) {
        const found = bats.find(b => b.id === lastBatId);
        if (found) setSelectedBat(found);
      } else if (bats.length > 0) {
        setSelectedBat(bats[0]);
      }
      if (lastZoneId) setSelectedZone(lastZoneId);
    }
  };

  const loadTimers = async (batId) => {
    const key = `${STORAGE_KEY}_${batId}`;
    const raw = await AsyncStorage.getItem(key);
    if (raw) setTimers(JSON.parse(raw));
    else setTimers({});
  };

  const saveTimers = async (updated) => {
    const key = `${STORAGE_KEY}_${selectedBat?.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setTimers(updated);
  };

  const selectBat = async (bat) => {
    setSelectedBat(bat);
    setShowBatPicker(false);
    await AsyncStorage.setItem(LAST_BAT_KEY, bat.id);
  };

  const selectZone = async (zoneId) => {
    setSelectedZone(zoneId);
    await AsyncStorage.setItem(LAST_ZONE_KEY, zoneId);
  };

  const startPhase = async (phase) => {
    if (!selectedBat) {
      Alert.alert('Select a bat', 'Please select which bat you are preparing first.');
      return;
    }
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Notifications Disabled',
        'Enable notifications in Settings so Knockmate can remind you when each phase is complete.');
    }
    const startTime = Date.now();
    const zone = ZONES.find(z => z.id === selectedZone);
    const notifId = granted
      ? await scheduleNotification(phase, startTime, selectedBat.name || selectedBat.brand, zone?.label || 'Sweet Spot')
      : null;
    const updated = { ...timers, [phase.id]: { startTime, notifId, completed: false } };
    await saveTimers(updated);
  };

  const markComplete = async (phase) => {
    const timer = timers[phase.id];
    if (timer?.notifId) {
      await Notifications.cancelScheduledNotificationAsync(timer.notifId);
    }
    const updated = { ...timers, [phase.id]: { ...timer, completed: true, completedAt: Date.now() } };
    await saveTimers(updated);
  };

  const resetPhase = async (phase) => {
    Alert.alert('Reset Phase', `Reset ${phase.title}? This will cancel the reminder.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: async () => {
        const timer = timers[phase.id];
        if (timer?.notifId) await Notifications.cancelScheduledNotificationAsync(timer.notifId);
        const updated = { ...timers };
        delete updated[phase.id];
        await saveTimers(updated);
      }},
    ]);
  };

  const formatCountdown = (startTime, durationSecs) => {
    const elapsed   = (now - startTime) / 1000;
    const remaining = Math.max(0, durationSecs - elapsed);
    const hrs  = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = Math.floor(remaining % 60);
    if (hrs  > 0) return `${hrs}h ${mins}m remaining`;
    if (mins > 0) return `${mins}m ${secs}s remaining`;
    return `${secs}s remaining`;
  };

  const getProgress  = (startTime, durationSecs) => Math.min((now - startTime) / 1000 / durationSecs, 1);
  const isExpired    = (startTime, durationSecs) => (now - startTime) / 1000 >= durationSecs;

  const selectedZoneObj = ZONES.find(z => z.id === selectedZone);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Prep Phases"
        subtitle={selectedBat ? `${selectedBat.name || selectedBat.brand} · ${selectedZoneObj?.label}` : 'Select a bat to start'}
        showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* ── Bat Selector ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 12 }}>
          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                            letterSpacing: 0.5, marginBottom: 8 }}>
            WHICH BAT
          </AppText>
          <TouchableOpacity onPress={() => setShowBatPicker(true)}
            style={{ backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
                     borderWidth: 1.5, borderColor: selectedBat ? theme.accent : theme.border,
                     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <AppText style={{ fontSize: 22 }}>🏏</AppText>
              <View>
                <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700' }}>
                  {selectedBat ? (selectedBat.name || selectedBat.brand) : 'Select a bat'}
                </AppText>
                {selectedBat && (
                  <AppText style={{ color: theme.textSub, fontSize: fs(12), marginTop: 2 }}>
                    {selectedBat.brand}{selectedBat.willow_type ? ` · ${selectedBat.willow_type}` : ''}
                  </AppText>
                )}
              </View>
            </View>
            <AppText style={{ color: theme.accent, fontSize: fs(13), fontWeight: '700' }}>
              {selectedBat ? 'Change ›' : 'Select ›'}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* ── Zone Selector ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: 20 }}>
          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                            letterSpacing: 0.5, marginBottom: 8 }}>
            TARGET ZONE
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {ZONES.map(zone => (
              <TouchableOpacity key={zone.id} onPress={() => selectZone(zone.id)}
                style={{ flex: 1, borderRadius: 12, padding: 10, alignItems: 'center',
                         backgroundColor: selectedZone === zone.id ? theme.accentDim : theme.bgCard,
                         borderWidth: 1.5, borderColor: selectedZone === zone.id ? theme.accent : theme.border }}>
                <AppText style={{ fontSize: 18 }}>{zone.icon}</AppText>
                <AppText style={{ color: selectedZone === zone.id ? theme.accent : theme.textSub,
                                  fontSize: fs(10), fontWeight: '700', marginTop: 4, textAlign: 'center' }}>
                  {zone.label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Intro card ────────────────────────────────────────────────── */}
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
                       marginBottom: 16, borderWidth: 1, borderColor: theme.border }}>
          <AppText style={{ color: theme.text, fontSize: fs(14), fontWeight: '700', marginBottom: 4 }}>
            🕐 Phase Reminders
          </AppText>
          <AppText style={{ color: theme.textSub, fontSize: fs(13), lineHeight: 20 }}>
            Start each phase and Knockmate will notify you when it's time to move on,
            even if the app is closed.
          </AppText>
        </View>

        {/* ── Phase cards ───────────────────────────────────────────────── */}
        {PHASES.map(phase => {
          const timer       = timers[phase.id];
          const isStarted   = !!timer && !timer.completed;
          const isCompleted = timer?.completed;
          const isDone      = isStarted && isExpired(timer.startTime, phase.duration);
          const progress    = isStarted ? getProgress(timer.startTime, phase.duration) : 0;

          return (
            <View key={phase.id} style={{
              backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 12,
              borderWidth: isStarted ? 2 : 1,
              borderColor: isCompleted ? phase.color : isStarted ? phase.color : theme.border,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View style={{ width: 44, height: 44, borderRadius: 14,
                               backgroundColor: isCompleted || isStarted ? `${phase.color}22` : theme.bgInput,
                               alignItems: 'center', justifyContent: 'center',
                               borderWidth: 1, borderColor: isCompleted || isStarted ? phase.color : theme.border }}>
                  <AppText style={{ fontSize: 22 }}>{phase.icon}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700', letterSpacing: 0.5 }}>
                      PHASE {phase.phase}
                    </AppText>
                    {isCompleted && (
                      <View style={{ backgroundColor: `${phase.color}22`, paddingHorizontal: 8,
                                     paddingVertical: 2, borderRadius: 8 }}>
                        <AppText style={{ color: phase.color, fontSize: fs(10), fontWeight: '700' }}>✓ COMPLETE</AppText>
                      </View>
                    )}
                    {isDone && !isCompleted && (
                      <View style={{ backgroundColor: '#fb923c22', paddingHorizontal: 8,
                                     paddingVertical: 2, borderRadius: 8 }}>
                        <AppText style={{ color: '#fb923c', fontSize: fs(10), fontWeight: '700' }}>⏰ TIME UP</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700' }}>{phase.title}</AppText>
                  <AppText style={{ color: theme.textMuted, fontSize: fs(11) }}>{phase.durationLabel}</AppText>
                </View>
              </View>

              <AppText style={{ color: theme.textSub, fontSize: fs(13), lineHeight: 19, marginBottom: 12 }}>
                {phase.desc}
              </AppText>

              {isStarted && !isCompleted && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${progress * 100}%`,
                                   backgroundColor: phase.color, borderRadius: 3 }} />
                  </View>
                  <AppText style={{ color: phase.color, fontSize: fs(12), fontWeight: '700', marginTop: 6 }}>
                    {isDone ? 'Phase complete — mark as done below' : formatCountdown(timer.startTime, phase.duration)}
                  </AppText>
                </View>
              )}

              {!isStarted && !isCompleted && (
                <TouchableOpacity onPress={() => startPhase(phase)}
                  style={{ backgroundColor: phase.color, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <AppText style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>
                    ▶ Start {phase.title}
                  </AppText>
                </TouchableOpacity>
              )}

              {isStarted && !isCompleted && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => markComplete(phase)}
                    style={{ flex: 1, backgroundColor: phase.color, borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <AppText style={{ color: '#fff', fontSize: fs(14), fontWeight: '700' }}>✓ Mark Complete</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => resetPhase(phase)}
                    style={{ paddingHorizontal: 16, borderRadius: 12, padding: 12,
                             borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgInput, alignItems: 'center' }}>
                    <AppText style={{ color: theme.textMuted, fontSize: fs(14) }}>↺</AppText>
                  </TouchableOpacity>
                </View>
              )}

              {isCompleted && (
                <TouchableOpacity onPress={() => resetPhase(phase)}
                  style={{ borderRadius: 12, padding: 12, alignItems: 'center',
                           borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgInput }}>
                  <AppText style={{ color: theme.textMuted, fontSize: fs(13) }}>↺ Reset Phase</AppText>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── Bat Picker Modal ───────────────────────────────────────────── */}
      <Modal visible={showBatPicker} transparent animationType="slide"
        onRequestClose={() => setShowBatPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowBatPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{ backgroundColor: theme.bgCard, borderTopLeftRadius: 24,
                             borderTopRightRadius: 24, padding: 24, paddingBottom: 44,
                             borderWidth: 1, borderColor: theme.border }}>
                <View style={{ width: 40, height: 4, borderRadius: 2,
                               backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
                <AppText style={{ color: theme.text, fontSize: fs(17), fontWeight: '800', marginBottom: 16 }}>
                  Select Bat
                </AppText>
                {allBats.length === 0 ? (
                  <AppText style={{ color: theme.textSub, fontSize: fs(14), textAlign: 'center', padding: 20 }}>
                    No bats yet — add a bat first
                  </AppText>
                ) : allBats.map(bat => (
                  <TouchableOpacity key={bat.id} onPress={() => selectBat(bat)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14,
                             borderRadius: 14, marginBottom: 8,
                             backgroundColor: selectedBat?.id === bat.id ? theme.accentDim : theme.bgInput,
                             borderWidth: 1.5,
                             borderColor: selectedBat?.id === bat.id ? theme.accent : theme.border }}>
                    <AppText style={{ fontSize: 24 }}>🏏</AppText>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: selectedBat?.id === bat.id ? theme.accent : theme.text,
                                        fontSize: fs(15), fontWeight: '700' }}>
                        {bat.name || bat.brand}
                      </AppText>
                      <AppText style={{ color: theme.textSub, fontSize: fs(12), marginTop: 2 }}>
                        {bat.brand}{bat.willow_type ? ` · ${bat.willow_type}` : ''}
                      </AppText>
                    </View>
                    {selectedBat?.id === bat.id && (
                      <AppText style={{ color: theme.accent, fontSize: fs(16) }}>✓</AppText>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
