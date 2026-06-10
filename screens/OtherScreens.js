import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { useTheme } from '../ThemeContext';
import NavBar, { NavButton } from '../components/NavBar';
import { getSessions } from '../storage/database';
import AppText from '../components/AppText';

// ─── ACTIVITY LOG ────────────────────────────────────────────
export function ActivityLogScreen({ navigation }) {
  const { theme } = useTheme();
  const [sessions, setSessions] = useState([]);

  useFocusEffect(useCallback(() => {
    getSessions().then(s => setSessions(s.reverse()));
  }, []));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Activity Log" subtitle="All changes across your bats" showHome />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {sessions.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AppText style={{ fontSize: 40, marginBottom: 12 }}>📋</AppText>
            <AppText style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>No activity yet</AppText>
            <AppText style={{ color: theme.textSub, fontSize: 14, marginTop: 8 }}>Sessions will appear here</AppText>
          </View>
        ) : (
          sessions.map((session, i) => (
            <View key={session.id} style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
              {/* Timeline dot */}
              <View style={{ alignItems: 'center', width: 36 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.accent }}>
                  <AppText style={{ color: theme.accent, fontSize: 16, fontWeight: '800' }}>+</AppText>
                </View>
                {i < sessions.length - 1 && (
                  <View style={{ width: 1, flex: 1, backgroundColor: theme.borderLight, marginTop: 4 }} />
                )}
              </View>
              {/* Card */}
              <View style={{ flex: 1, backgroundColor: theme.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <View style={{ backgroundColor: theme.accentDim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                    <AppText style={{ color: theme.accent, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>CREATED</AppText>
                  </View>
                  <AppText style={{ color: theme.textSub, fontSize: 12 }}>KnockingSession</AppText>
                </View>
                <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{session.bat_name || 'Unknown Bat'}</AppText>
                <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 3 }}>
                  {session.knock_count} knocks · {Math.round((session.duration_seconds || 0) / 60)}m · zone: middle
                </AppText>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.borderLight }}>
                  <AppText style={{ color: theme.textMuted, fontSize: 12 }}>unknown</AppText>
                  <AppText style={{ color: theme.textMuted, fontSize: 12 }}>{getRelativeTime(session.created_at)}</AppText>
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── BAT CARE LIBRARY ────────────────────────────────────────
export function BatCareScreen({ navigation }) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const guides = [
    {
      id: 'oiling', icon: '🛢️', title: 'Bat Oiling',
      subtitle: 'Essential before first use — feeds the willow and prevents cracking.',
      sections: [
        { title: 'WHY OIL YOUR BAT?', content: 'Raw willow is porous and prone to cracking. Linseed oil penetrates the fibres, keeping them supple and allowing the bat to absorb the impact of a cricket ball without splitting.' },
        { title: 'WHAT OIL TO USE', content: 'Use raw (not boiled) linseed oil. Raw linseed is thinner and penetrates deeper. Boiled linseed can seal the surface, trapping moisture inside over time.' },
        { title: 'HOW TO OIL', content: '1. Lay the bat face up on a flat surface.\n2. Apply a thin, even coat of raw linseed oil.\n3. Work it into the face, edges, and back — avoid the splice and handle.\n4. Let it soak for 24 hours horizontally.\n5. Wipe off any excess.\n6. Repeat 3-4 times before first use.' },
        { title: 'COMMON MISTAKES', content: '✗ Too much oil — the bat becomes heavy and waterlogged.\n✗ Oiling the splice — can weaken the glue.\n✗ Using the bat before oil is absorbed — leads to cracks on first impact.' },
      ]
    },
    {
      id: 'toe', icon: '🛡️', title: 'Toe Guard Application',
      subtitle: 'Protects the most vulnerable part of the bat from ground moisture and yorkers.',
      sections: [
        { title: 'WHY A TOE GUARD?', content: 'The bat toe absorbs ground impact, fielding slides, and moisture when resting on damp grass. A toe guard extends the bat life significantly.' },
        { title: 'HOW TO APPLY', content: '1. Lightly sand the toe surface for adhesion.\n2. Apply a thin layer of bat repair adhesive or super glue to the toe.\n3. Stretch the rubber guard over the toe from underneath.\n4. Press firmly and hold for 60 seconds.\n5. Leave to cure for 4-6 hours before use.' },
      ]
    },
    {
      id: 'scuff', icon: '📋', title: 'Anti-Scuff Sheet',
      subtitle: 'A protective film that preserves the bat face without affecting performance.',
      sections: [
        { title: 'WHAT IS AN ANTI-SCUFF SHEET?', content: 'An anti-scuff sheet is a thin, self-adhesive protective film applied to the face of the bat. It absorbs surface abrasion from ball impacts, prolonging the life of the willow.' },
        { title: 'WHEN TO APPLY', content: 'Apply after oiling and initial knocking-in (approximately 2,000-3,000 knocks). Applying too early can trap oil beneath the sheet and reduce effectiveness.' },
      ]
    },
    {
      id: 'storage', icon: '📦', title: 'Bat Storage & Transport',
      subtitle: 'Store correctly to avoid warping, cracking, and moisture damage.',
      sections: [
        { title: 'IDEAL STORAGE CONDITIONS', content: 'Store the bat upright in a cool, dry environment away from direct sunlight. Ideal temperature is 15-20°C with moderate humidity. Avoid leaving bats in car boots or near radiators.' },
        { title: 'BETWEEN SEASONS', content: '1. Clean the bat face with a dry cloth.\n2. Apply a light coat of linseed oil.\n3. Wrap loosely in a cloth (not plastic — needs to breathe).\n4. Store horizontally to prevent warping.\n5. Inspect for cracks before the next season.' },
      ]
    },
    {
      id: 'cracks', icon: '🔧', title: 'Crack Repair & Maintenance',
      subtitle: 'Surface cracks are normal — here\'s how to handle them safely.',
      sections: [
        { title: 'SURFACE VS STRUCTURAL CRACKS', content: 'Surface cracks (hairline, on the face grain) are normal and do not affect performance. Structural cracks (running through the edge or down the splice) require professional repair or bat replacement.' },
        { title: 'REPAIRING SURFACE CRACKS', content: '1. Clean the crack with a dry toothbrush.\n2. Apply a small amount of bat repair adhesive or PVA into the crack.\n3. Clamp gently with a cloth and elastic band.\n4. Let cure for 12 hours.\n5. Sand lightly and re-oil.' },
      ]
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Bat Care Library"
        subtitle="Guides for oiling, protection & repair" showHome />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Complete Care Guide badge */}
        <TouchableOpacity style={{ backgroundColor: theme.accentDim, borderRadius: 10, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.accent }}>
          <AppText style={{ color: theme.accent, fontSize: 13, fontWeight: '700' }}>✓ Complete Care Guide</AppText>
        </TouchableOpacity>
        <AppText style={{ color: theme.textSub, fontSize: 13, marginBottom: 14, lineHeight: 20 }}>
          Proper maintenance extends bat life 2-5x and improves performance. Follow these guides in order for best results.
        </AppText>

        {guides.map(guide => (
          <View key={guide.id} style={{ backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}
              onPress={() => toggle(guide.id)}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                <AppText style={{ fontSize: 20 }}>{guide.icon}</AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{guide.title}</AppText>
                <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 2 }}>{guide.subtitle}</AppText>
              </View>
              <AppText style={{ color: theme.textMuted, fontSize: 12 }}>{expanded[guide.id] ? '▲' : '▼'}</AppText>
            </TouchableOpacity>
            {expanded[guide.id] && guide.sections.map((sec, i) => (
              <View key={i} style={{ paddingHorizontal: 16, paddingBottom: 14, borderTopWidth: 1, borderTopColor: theme.borderLight }}>
                <AppText style={{ color: theme.accent, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 }}>{sec.title}</AppText>
                <AppText style={{ color: theme.textSub, fontSize: 13, lineHeight: 20 }}>{sec.content}</AppText>
              </View>
            ))}
          </View>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── MIC TEST ────────────────────────────────────────────────
export function MicTestScreen({ navigation }) {
  const { theme } = useTheme();
  const [level, setLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [knocks, setKnocks] = useState(0);
  const [dbValue, setDbValue] = useState(-60);
  const recordingRef = useRef(null);
  const lastKnockRef = useRef(0);
  const knocksRef = useRef(0);

  const meteringToLinear = (db) => Math.max(0, Math.min(1, (db + 60) / 60));

  const startListening = async () => {
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
      (s) => {
        if (s.metering !== undefined) {
          const l = meteringToLinear(s.metering);
          setLevel(l);
          setDbValue(Math.round(s.metering));
          if (l > 0.4) {
            const now = Date.now();
            if (now - lastKnockRef.current > 300) {
              lastKnockRef.current = now;
              knocksRef.current += 1;
              setKnocks(knocksRef.current);
            }
          }
        }
      }, 50
    );
    recordingRef.current = recording;
    setIsListening(true);
  };

  const stopListening = async () => {
    if (recordingRef.current) {
      try { await recordingRef.current.stopAndUnloadAsync(); } catch (e) {}
      recordingRef.current = null;
    }
    setIsListening(false);
    setLevel(0);
    setDbValue(-60);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                     paddingHorizontal: 16, paddingVertical: 12,
                     borderBottomWidth: 1, borderBottomColor: theme.border,
                     backgroundColor: theme.bgCard }}>
        <NavButton type="back" onPress={() => { stopListening(); navigation.goBack(); }} />
        <View style={{ alignItems: 'center', flex: 1, marginHorizontal: 8 }}>
          <AppText style={{ color: theme.text, fontSize: 16, fontWeight: '700' }}>Mic Test</AppText>
          <AppText style={{ color: theme.textSub, fontSize: 12 }}>Test microphone before a session</AppText>
        </View>
        <NavButton type="home" onPress={() => navigation.navigate('Main')} />
      </View>

      <View style={{ flex: 1, padding: 20 }}>
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}>
          {/* Mic icon */}
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: theme.border }}>
            <AppText style={{ fontSize: 32, color: isListening ? theme.accent : theme.textMuted }}>◎</AppText>
          </View>

          <AppText style={{ color: theme.text, fontSize: 17, fontWeight: '700', marginBottom: 8 }}>Real-Time Decibel Meter</AppText>
          <AppText style={{ color: theme.textSub, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 20 }}>
            Test that your microphone picks up knocking sounds before starting a session. You should see the meter jump each time you knock.
          </AppText>

          {/* Level meter */}
          {isListening && (
            <View style={{ width: '100%', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <AppText style={{ color: theme.textSub, fontSize: 12 }}>Level</AppText>
                <AppText style={{ color: theme.accent, fontSize: 12, fontWeight: '700' }}>{dbValue} dB</AppText>
              </View>
              <View style={{ height: 12, backgroundColor: theme.bgInput, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: theme.border }}>
                <View style={{ height: '100%', width: `${level * 100}%`, backgroundColor: level > 0.6 ? theme.accent : level > 0.3 ? theme.blue : theme.textMuted, borderRadius: 6 }} />
              </View>
              <AppText style={{ color: theme.textMuted, fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                {knocks} knocks detected
              </AppText>
            </View>
          )}

          <TouchableOpacity
            style={{ width: '100%', backgroundColor: isListening ? theme.red : theme.accent, borderRadius: 14, padding: 16, alignItems: 'center' }}
            onPress={isListening ? stopListening : startListening}>
            <AppText style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>
              {isListening ? 'Stop Mic Test' : 'Start Mic Test'}
            </AppText>
          </TouchableOpacity>

          {knocks > 0 && !isListening && (
            <TouchableOpacity onPress={() => { setKnocks(0); knocksRef.current = 0; }} style={{ marginTop: 14 }}>
              <AppText style={{ color: theme.textSub, fontSize: 13, textDecorationLine: 'underline' }}>Reset</AppText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function getRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

export default ActivityLogScreen;
