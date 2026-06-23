/**
 * Prep Journey Card — embedded in BatProfileScreen
 *
 * Pure status display for Phases 2-4 — no action buttons here.
 * Phase 1 (Oiling) keeps its own start/confirm buttons since it's a
 * standalone soak period, not a knocking session.
 *
 * The single "Start Knocking Session" button lower on BatProfileScreen
 * reads the current active phase and launches KnockingSessionScreen
 * with phaseType pre-set — that's the only knocking entry point.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from '@react-navigation/native';
import AppText from './AppText';
import { getPhaseTargetMinutes } from '../utils/targets';

const JOURNEY_KEY = 'knockmate_journey';

// Oiling is a fixed 24h soak regardless of bat — doesn't depend on target.
const OILING_DURATION_SECONDS = 24 * 60 * 60;

/**
 * Returns the 4-phase journey for a specific bat. Light/Medium/Full minute
 * targets are derived from the bat's own target_minutes (set in Create/Edit
 * Bat), split 20/30/50 — previously these were a fixed 60/90/120 for every
 * bat regardless of what target was set.
 */
function getPhases(bat) {
  const t = getPhaseTargetMinutes(bat?.target_minutes);
  return [
    {
      id: 'oiling', num: 1, icon: '🛢️', title: 'Oiling',
      type: 'soak', duration: OILING_DURATION_SECONDS,
      desc: 'Apply raw linseed oil to the face, edges and back. Leave to soak in — no knocking yet.',
      color: '#fb923c',
    },
    {
      id: 'light', num: 2, icon: '🔨', title: 'Light Force Knocking',
      type: 'session', phaseType: 'light', targetMinutes: t.light,
      desc: 'Tap gently — let the willow fibres compress slowly. No hard strikes yet.',
      color: '#60a5fa',
    },
    {
      id: 'medium', num: 3, icon: '💪', title: 'Medium Force Knocking',
      type: 'session', phaseType: 'medium', targetMinutes: t.medium,
      desc: 'Increase to medium force. Focus on edges and toe.',
      color: '#a78bfa',
    },
    {
      id: 'full', num: 4, icon: '🏏', title: 'Full Force Knocking',
      type: 'session', phaseType: 'full', targetMinutes: t.full,
      desc: 'Full force knocking. Test with an old ball before match use.',
      color: '#34d399',
    },
  ];
}

async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleOilingNotification(startTime, batName) {
  const triggerTime = new Date(startTime + OILING_DURATION_SECONDS * 1000);
  if (triggerTime <= new Date()) return null;
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: '🏏 Bat Ready to Start Knocking',
      body: `${batName} has soaked for 24 hours. Time to start Light Force Knocking!`,
      sound: true,
    },
    trigger: { date: triggerTime },
  });
}

// ── Exported helper: get the bat's current active phase ───────────────────
// Used by BatProfileScreen to drive the single Start Knocking Session button.
// `bat` is now required (not just batId) since phase targets are per-bat.
export async function getCurrentPhase(batId, bat) {
  const raw = await AsyncStorage.getItem(`${JOURNEY_KEY}_${batId}`);
  const journey = raw ? JSON.parse(raw) : {};
  const phases = getPhases(bat);
  for (let i = 0; i < phases.length; i++) {
    if (!journey[phases[i].id]?.completed) {
      return { phase: phases[i], index: i, journey };
    }
  }
  return { phase: null, index: phases.length, journey }; // all complete
}

export default function PrepJourneyCard({ theme, fs, bat, sessions, navigation, route }) {
  const [journey, setJourney] = useState({});
  const [now, setNow] = useState(Date.now());
  const phases = getPhases(bat);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(useCallback(() => {
    loadJourney();
    const autoComplete = route?.params?.phaseAutoComplete;
    if (autoComplete) handleAutoComplete(autoComplete);
  }, [bat?.id, route?.params?.phaseAutoComplete]));

  const loadJourney = async () => {
    if (!bat?.id) return;
    const raw = await AsyncStorage.getItem(`${JOURNEY_KEY}_${bat.id}`);
    if (raw) setJourney(JSON.parse(raw));
  };

  const saveJourney = async (updated) => {
    await AsyncStorage.setItem(`${JOURNEY_KEY}_${bat.id}`, JSON.stringify(updated));
    setJourney(updated);
  };

  const handleAutoComplete = async (phaseId) => {
    const raw = await AsyncStorage.getItem(`${JOURNEY_KEY}_${bat.id}`);
    const current = raw ? JSON.parse(raw) : {};
    if (current[phaseId]?.completed) return;
    const updated = { ...current, [phaseId]: { completed: true, completedAt: Date.now() } };
    await saveJourney(updated);
  };

  const getPhaseStatus = (phase, index) => {
    const data = journey[phase.id];
    if (data?.completed) return 'complete';
    if (index === 0) return data?.startTime ? 'active' : 'ready';
    const prevPhase = phases[index - 1];
    if (!journey[prevPhase.id]?.completed) return 'locked';
    return 'active';
  };

  const startOiling = async () => {
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert('Notifications Disabled', 'Enable notifications so Knockmate can remind you when oiling is done.');
    }
    const startTime = Date.now();
    const notifId = granted ? await scheduleOilingNotification(startTime, bat.name || bat.brand) : null;
    const updated = { ...journey, oiling: { startTime, notifId, completed: false } };
    await saveJourney(updated);
  };

  const markOilingComplete = async () => {
    const data = journey.oiling;
    if (data?.notifId) await Notifications.cancelScheduledNotificationAsync(data.notifId);
    const updated = { ...journey, oiling: { ...data, completed: true, completedAt: Date.now() } };
    await saveJourney(updated);
  };

  const getPhaseProgress = (phase) => {
    const phaseSessions = (sessions || []).filter(s => s.phase_type === phase.phaseType);
    const totalMinutes = phaseSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
    return { minutes: Math.round(totalMinutes), sessionCount: phaseSessions.length };
  };

  const formatOilingStatus = () => {
    const data = journey.oiling;
    if (!data?.startTime) return null;
    const elapsed = (now - data.startTime) / 1000;
    const remaining = Math.max(0, OILING_DURATION_SECONDS - elapsed);
    if (remaining <= 0) return null;
    const hrs = Math.floor(remaining / 3600);
    const mins = Math.floor((remaining % 3600) / 60);
    return `Soaking — ready in ${hrs}h ${mins}m`;
  };

  const oilingExpired = () => {
    const data = journey.oiling;
    if (!data?.startTime || data.completed) return false;
    return (now - data.startTime) / 1000 >= OILING_DURATION_SECONDS;
  };

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.bgCard,
                   borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
      <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                        letterSpacing: 0.5, marginBottom: 14 }}>
        BAT PREPARATION JOURNEY
      </AppText>

      {phases.map((phase, index) => {
        const status = getPhaseStatus(phase, index);
        const isLocked   = status === 'locked';
        const isComplete = status === 'complete';
        const isActive   = status === 'active' || status === 'ready';

        return (
          <View key={phase.id} style={{
            marginBottom: index < phases.length - 1 ? 14 : 0,
            opacity: isLocked ? 0.45 : 1,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: isLocked ? 0 : 8 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 12,
                backgroundColor: isComplete || isActive ? `${phase.color}22` : theme.bgInput,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: isComplete || isActive ? phase.color : theme.border,
              }}>
                <AppText style={{ fontSize: 17 }}>{isLocked ? '🔒' : phase.icon}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ color: theme.textMuted, fontSize: fs(10), fontWeight: '700', letterSpacing: 0.5 }}>
                  PHASE {phase.num}
                </AppText>
                <AppText style={{ color: theme.text, fontSize: fs(14), fontWeight: '700' }}>
                  {phase.title}
                </AppText>
              </View>
              {isComplete && (
                <View style={{ backgroundColor: `${phase.color}22`, paddingHorizontal: 8,
                               paddingVertical: 3, borderRadius: 8 }}>
                  <AppText style={{ color: phase.color, fontSize: fs(10), fontWeight: '700' }}>✓ COMPLETE</AppText>
                </View>
              )}
            </View>

            {/* Phase 1 — Oiling: only phase with its own action button */}
            {phase.id === 'oiling' && !isLocked && !isComplete && (
              <View style={{ marginLeft: 46 }}>
                <AppText style={{ color: theme.textSub, fontSize: fs(12), lineHeight: 18, marginBottom: 10 }}>
                  {phase.desc}
                </AppText>
                {journey.oiling?.startTime ? (
                  <>
                    <AppText style={{ color: phase.color, fontSize: fs(12), fontWeight: '700', marginBottom: 8 }}>
                      {oilingExpired() ? 'Ready! Tap below to confirm.' : formatOilingStatus()}
                    </AppText>
                    <TouchableOpacity onPress={markOilingComplete}
                      style={{ backgroundColor: phase.color, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <AppText style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>
                        ✓ Mark Oiling Complete
                      </AppText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={startOiling}
                    style={{ backgroundColor: phase.color, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <AppText style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>
                      Apply Oil — Start Soaking
                    </AppText>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Phases 2-4 — status only, no buttons. Knocking starts from the
                single Start Knocking Session button further down the page. */}
            {phase.type === 'session' && !isLocked && !isComplete && (
              <View style={{ marginLeft: 46 }}>
                <AppText style={{ color: theme.textSub, fontSize: fs(12), lineHeight: 18, marginBottom: 8 }}>
                  {phase.desc}
                </AppText>
                {(() => {
                  const progress = getPhaseProgress(phase);
                  const pct = Math.min(100, Math.round((progress.minutes / phase.targetMinutes) * 100));
                  return (
                    <>
                      <AppText style={{ color: theme.textMuted, fontSize: fs(11), marginBottom: 6 }}>
                        {progress.minutes}/{phase.targetMinutes} min logged
                      </AppText>
                      <View style={{ height: 5, backgroundColor: theme.border, borderRadius: 3 }}>
                        <View style={{ height: 5, width: `${pct}%`, backgroundColor: phase.color, borderRadius: 3 }} />
                      </View>
                    </>
                  );
                })()}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
