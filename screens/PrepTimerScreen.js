/**
 * PrepTimerScreen.js — Knockmate Phase 2 (Prep Notifications)
 *
 * Tracks bat preparation phases and sends local notifications
 * when each phase is complete. All timers run locally on device.
 *
 * Phases:
 *   1. Oiling — apply raw linseed oil, wait 24hrs → notify "Ready to start knocking"
 *   2. Phase 1 Knocking — light knocking (1-2hrs) → notify "Ready for Phase 2"
 *   3. Phase 2 Knocking — medium knocking (2-3hrs) → notify "Ready for Phase 3"
 *   4. Phase 3 Knocking — full knocking → notify "Bat is ready to play!"
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import AppText from '../components/AppText';

const STORAGE_KEY = 'knockmate_prep_timers';

const PHASES = [
  {
    id: 'oiling',
    phase: 1,
    icon: '🛢️',
    title: 'Oiling',
    desc: 'Apply raw linseed oil to the bat face, edges and back. Leave to soak in.',
    duration: 24 * 60, // 24 hours in minutes
    durationLabel: '24 hours',
    notifyTitle: '🏏 Bat Ready to Start Knocking',
    notifyBody: 'Your bat has soaked for 24 hours. Time to start Phase 1 knocking!',
    color: '#fb923c',
  },
  {
    id: 'phase1',
    phase: 2,
    icon: '🔨',
    title: 'Phase 1 Knocking',
    desc: 'Light knocking with a mallet across the face and edges. Gradually increasing force.',
    duration: 60 * 60, // 60 minutes
    durationLabel: '60 minutes',
    notifyTitle: '🏏 Phase 1 Complete',
    notifyBody: 'Light knocking done! Rest the bat for 30 mins then start Phase 2.',
    color: '#60a5fa',
  },
  {
    id: 'phase2',
    phase: 3,
    icon: '💪',
    title: 'Phase 2 Knocking',
    desc: 'Medium force knocking. Focus on edges and toe. Oil again lightly if needed.',
    duration: 90 * 60, // 90 minutes
    durationLabel: '90 minutes',
    notifyTitle: '🏏 Phase 2 Complete',
    notifyBody: 'Phase 2 done! Rest the bat overnight then complete Phase 3.',
    color: '#a78bfa',
  },
  {
    id: 'phase3',
    phase: 4,
    icon: '🏏',
    title: 'Phase 3 Knocking',
    desc: 'Full force knocking. Test with an old ball. Bat is nearly ready to play.',
    duration: 120 * 60, // 120 minutes
    durationLabel: '120 minutes',
    notifyTitle: '🏏 Bat Ready to Play!',
    notifyBody: 'All phases complete! Your bat is fully knocked in and ready for action.',
    color: '#34d399',
  },
];

// ── Request notification permissions ────────────────────────────────────────
async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ── Schedule a local notification ────────────────────────────────────────────
async function scheduleNotification(phase, startTime) {
  const triggerTime = new Date(startTime + phase.duration * 1000);
  const now = new Date();
  if (triggerTime <= now) return null; // already elapsed

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: phase.notifyTitle,
      body: phase.notifyBody,
      sound: true,
    },
    trigger: { date: triggerTime },
  });
  return id;
}

export default function PrepTimerScreen({ navigation, route }) {
  const { theme } = useTheme();
  const bat = route.params?.bat;
  const [timers, setTimers] = useState({});
  const [now, setNow] = useState(Date.now());

  // Tick every second for countdown display
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(useCallback(() => {
    loadTimers();
  }, []));

  const loadTimers = async () => {
    const key = `${STORAGE_KEY}_${bat?.id}`;
    const raw = await AsyncStorage.getItem(key);
    if (raw) setTimers(JSON.parse(raw));
  };

  const saveTimers = async (updated) => {
    const key = `${STORAGE_KEY}_${bat?.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    setTimers(updated);
  };

  const startPhase = async (phase) => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        'Notifications Disabled',
        'Enable notifications in Settings so Knockmate can remind you when each phase is complete.',
        [{ text: 'OK' }]
      );
    }

    const startTime = Date.now();
    const notifId = granted ? await scheduleNotification(phase, startTime) : null;

    const updated = {
      ...timers,
      [phase.id]: { startTime, notifId, completed: false },
    };
    await saveTimers(updated);
  };

  const markComplete = async (phase) => {
    // Cancel the notification if bat was completed early
    const timer = timers[phase.id];
    if (timer?.notifId) {
      await Notifications.cancelScheduledNotificationAsync(timer.notifId);
    }
    const updated = {
      ...timers,
      [phase.id]: { ...timer, completed: true, completedAt: Date.now() },
    };
    await saveTimers(updated);
  };

  const resetPhase = async (phase) => {
    Alert.alert('Reset Phase', `Reset ${phase.title}? This will cancel the reminder.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => {
          const timer = timers[phase.id];
          if (timer?.notifId) {
            await Notifications.cancelScheduledNotificationAsync(timer.notifId);
          }
          const updated = { ...timers };
          delete updated[phase.id];
          await saveTimers(updated);
        },
      },
    ]);
  };

  // ── Format countdown ────────────────────────────────────────────────────
  const formatCountdown = (startTime, durationSecs) => {
    const elapsed = (now - startTime) / 1000;
    const remaining = Math.max(0, durationSecs - elapsed);
    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    const secs = Math.floor(remaining % 60);
    if (hrs > 0) return `${hrs}h ${mins}m remaining`;
    if (mins > 0) return `${mins}m ${secs}s remaining`;
    return `${secs}s remaining`;
  };

  const getProgress = (startTime, durationSecs) => {
    const elapsed = (now - startTime) / 1000;
    return Math.min(elapsed / durationSecs, 1);
  };

  const isExpired = (startTime, durationSecs) => {
    return (now - startTime) / 1000 >= durationSecs;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Prep Phases"
        subtitle={bat?.name || 'Bat preparation timer'} showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Intro */}
        <View style={{
          backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
          marginBottom: 20, borderWidth: 1, borderColor: theme.border,
        }}>
          <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 6 }}>
            🕐 Phase Reminders
          </AppText>
          <AppText style={{ color: theme.textSub, fontSize: 13, lineHeight: 20 }}>
            Start each phase and Knockmate will notify you when it's time to move on.
            You'll get a reminder even if the app is closed.
          </AppText>
        </View>

        {/* Phase cards */}
        {PHASES.map((phase, index) => {
          const timer = timers[phase.id];
          const isStarted = !!timer && !timer.completed;
          const isCompleted = timer?.completed;
          const isDone = isStarted && isExpired(timer.startTime, phase.duration);
          const progress = isStarted ? getProgress(timer.startTime, phase.duration) : 0;

          return (
            <View key={phase.id} style={{
              backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
              marginBottom: 12, borderWidth: isStarted ? 2 : 1,
              borderColor: isCompleted ? phase.color :
                           isStarted   ? phase.color :
                           theme.border,
            }}>
              {/* Phase header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: isCompleted || isStarted ? `${phase.color}22` : theme.bgInput,
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: isCompleted || isStarted ? phase.color : theme.border,
                }}>
                  <AppText style={{ fontSize: 22 }}>{phase.icon}</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>
                      PHASE {phase.phase}
                    </AppText>
                    {isCompleted && (
                      <View style={{ backgroundColor: `${phase.color}22`, paddingHorizontal: 8,
                                     paddingVertical: 2, borderRadius: 8 }}>
                        <AppText style={{ color: phase.color, fontSize: 10, fontWeight: '700' }}>✓ COMPLETE</AppText>
                      </View>
                    )}
                    {isDone && !isCompleted && (
                      <View style={{ backgroundColor: '#fb923c22', paddingHorizontal: 8,
                                     paddingVertical: 2, borderRadius: 8 }}>
                        <AppText style={{ color: '#fb923c', fontSize: 10, fontWeight: '700' }}>⏰ TIME UP</AppText>
                      </View>
                    )}
                  </View>
                  <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>
                    {phase.title}
                  </AppText>
                  <AppText style={{ color: theme.textMuted, fontSize: 11 }}>
                    {phase.durationLabel}
                  </AppText>
                </View>
              </View>

              {/* Description */}
              <AppText style={{ color: theme.textSub, fontSize: 13, lineHeight: 19, marginBottom: 12 }}>
                {phase.desc}
              </AppText>

              {/* Progress bar (when running) */}
              {isStarted && !isCompleted && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3 }}>
                    <View style={{
                      height: 6, width: `${progress * 100}%`,
                      backgroundColor: phase.color, borderRadius: 3,
                    }} />
                  </View>
                  <AppText style={{ color: phase.color, fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                    {isDone ? 'Phase complete — mark as done below' :
                     formatCountdown(timer.startTime, phase.duration)}
                  </AppText>
                </View>
              )}

              {/* Action buttons */}
              {!isStarted && !isCompleted && (
                <TouchableOpacity onPress={() => startPhase(phase)}
                  style={{
                    backgroundColor: phase.color, borderRadius: 12,
                    padding: 12, alignItems: 'center',
                  }}>
                  <AppText style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    ▶ Start {phase.title}
                  </AppText>
                </TouchableOpacity>
              )}

              {isStarted && !isCompleted && (
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity onPress={() => markComplete(phase)}
                    style={{
                      flex: 1, backgroundColor: phase.color,
                      borderRadius: 12, padding: 12, alignItems: 'center',
                    }}>
                    <AppText style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓ Mark Complete</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => resetPhase(phase)}
                    style={{
                      paddingHorizontal: 16, borderRadius: 12, padding: 12,
                      borderWidth: 1, borderColor: theme.border,
                      backgroundColor: theme.bgInput, alignItems: 'center',
                    }}>
                    <AppText style={{ color: theme.textMuted, fontSize: 14 }}>↺</AppText>
                  </TouchableOpacity>
                </View>
              )}

              {isCompleted && (
                <TouchableOpacity onPress={() => resetPhase(phase)}
                  style={{
                    borderRadius: 12, padding: 12, alignItems: 'center',
                    borderWidth: 1, borderColor: theme.border,
                    backgroundColor: theme.bgInput,
                  }}>
                  <AppText style={{ color: theme.textMuted, fontSize: 13 }}>↺ Reset Phase</AppText>
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
