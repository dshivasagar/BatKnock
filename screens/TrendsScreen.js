import React, { useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { getSessions, getBats } from '../storage/database';
import AppText from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentPhase } from '../components/PrepJourneyCard';
import { getPhaseTargetMinutes } from '../utils/targets';
import { usePro } from '../contexts/ProContext';

const PHASE_META = {
  light:  { label: 'Light',  icon: '🔨', color: '#60a5fa' },
  medium: { label: 'Medium', icon: '💪', color: '#a78bfa' },
  full:   { label: 'Full',   icon: '🏏', color: '#34d399' },
};

const CURRENT_PHASE_BADGE = {
  oiling: { label: 'Oiling',  icon: '🛢️', color: '#fb923c' },
  light:  { label: 'Light',   icon: '🔨', color: '#60a5fa' },
  medium: { label: 'Medium',  icon: '💪', color: '#a78bfa' },
  full:   { label: 'Full',    icon: '🏏', color: '#34d399' },
};

export default function TrendsScreen({ navigation }) {
  const { theme, fs } = useTheme();
  const { isPro, showUpgrade } = usePro();
  const [sessions, setSessions]   = useState([]);
  const [bats, setBats]           = useState([]);
  const [batPhases, setBatPhases] = useState({});
  const [expandedBats, setExpandedBats] = useState({});

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const s = await getSessions();
    const b = await getBats();
    setSessions(s.reverse());
    setBats(b);
    const phases = {};
    for (const bat of b) {
      const { phase } = await getCurrentPhase(bat.id, bat);
      phases[bat.id] = phase;
    }
    setBatPhases(phases);
  };

  const getBatProgress = (bat, batSessions) => {
    const totalMins = batSessions.reduce((s, x) => s + (x.duration_seconds || 0), 0) / 60;
    if (bat.target_minutes) return Math.min((totalMins / bat.target_minutes) * 100, 100);
    const totalKnocks = batSessions.reduce((s, x) => s + (x.knock_count || 0), 0);
    if (bat.target_knocks)  return Math.min((totalKnocks / bat.target_knocks) * 100, 100);
    return 0;
  };

  const getPhaseMinutes = (bat, batSessions) => {
    const targets = getPhaseTargetMinutes(bat.target_minutes);
    return ['light', 'medium', 'full'].map(p => {
      const mins = batSessions.filter(s => s.phase_type === p)
        .reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / 60;
      return { id: p, logged: Math.round(mins), target: targets[p], ...PHASE_META[p] };
    });
  };

  const toggleBat = (id) =>
    setExpandedBats(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Trends & History" showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* Bats Tracked */}
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 16, padding: 16,
                       borderWidth: 1, borderColor: theme.border, marginBottom: 16,
                       alignItems: 'center' }}>
          <AppText style={{ color: theme.text, fontSize: fs(36), fontWeight: '900' }}>
            {bats.length}
          </AppText>
          <AppText style={{ color: theme.textSub, fontSize: fs(13), marginTop: 2 }}>
            Bats Tracked
          </AppText>
        </View>

        {/* Per-bat cards */}
        <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                          letterSpacing: 0.5, marginBottom: 10 }}>YOUR BATS</AppText>

        {/* Per-bat cards — Pro only */}
        {!isPro ? (
          <TouchableOpacity onPress={showUpgrade}
            style={{ backgroundColor: theme.bgCard, borderRadius: 16,
                     borderWidth: 1, borderColor: theme.border, padding: 24,
                     alignItems: 'center', marginBottom: 10 }}>
            <AppText style={{ fontSize: 32, marginBottom: 10 }}>🔒</AppText>
            <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '800',
                              textAlign: 'center', marginBottom: 6 }}>
              Detailed History is a Pro Feature
            </AppText>
            <AppText style={{ color: theme.textSub, fontSize: fs(13), textAlign: 'center',
                              marginBottom: 16, lineHeight: 20 }}>
              Upgrade to see per-bat phase progress, session history and zone breakdowns.
            </AppText>
            <View style={{ backgroundColor: theme.accent, borderRadius: 12,
                           paddingHorizontal: 20, paddingVertical: 10 }}>
              <AppText style={{ color: '#fff', fontSize: fs(13), fontWeight: '700' }}>
                Unlock Knockmate Pro — £2.99
              </AppText>
            </View>
          </TouchableOpacity>
        ) : (
          bats.map(bat => {
          const batSessions  = sessions.filter(s => s.bat_id === bat.id);
          const batKnocks    = batSessions.reduce((sum, s) => sum + (s.knock_count || 0), 0);
          const batTime      = batSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
          const pct          = getBatProgress(bat, batSessions);
          const phaseRows    = getPhaseMinutes(bat, batSessions);
          const currentPhase = batPhases[bat.id];
          const isExpanded   = expandedBats[bat.id];
          const badge        = currentPhase ? CURRENT_PHASE_BADGE[currentPhase.id] : null;

          return (
            <View key={bat.id} style={{ backgroundColor: theme.bgCard, borderRadius: 16,
                                        marginBottom: 10, borderWidth: 1, borderColor: theme.border,
                                        overflow: 'hidden' }}>
              <View style={{ padding: 16 }}>
                {/* Name + phase badge */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                               alignItems: 'center', marginBottom: 8 }}>
                  <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700', flex: 1 }}>
                    {bat.name || bat.brand}
                  </AppText>
                  {badge ? (
                    <View style={{ backgroundColor: `${badge.color}22`, paddingHorizontal: 10,
                                   paddingVertical: 4, borderRadius: 10,
                                   borderWidth: 1, borderColor: badge.color }}>
                      <AppText style={{ color: badge.color, fontSize: fs(11), fontWeight: '700' }}>
                        {badge.icon} {badge.label}
                      </AppText>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#34d39922', paddingHorizontal: 10,
                                   paddingVertical: 4, borderRadius: 10, borderWidth: 1,
                                   borderColor: '#34d399' }}>
                      <AppText style={{ color: '#34d399', fontSize: fs(11), fontWeight: '700' }}>
                        ✅ Complete
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Overall progress */}
                <View style={{ height: 5, backgroundColor: theme.border, borderRadius: 3, marginBottom: 6 }}>
                  <View style={{ height: 5, width: `${pct}%`,
                                 backgroundColor: theme.accent, borderRadius: 3 }} />
                </View>
                <AppText style={{ color: theme.textMuted, fontSize: fs(11), marginBottom: 12 }}>
                  {pct < 1 ? '0' : pct >= 100 ? '100' : pct.toFixed(0)}% ready ·{' '}
                  {batKnocks.toLocaleString()} knocks · {(batTime / 3600).toFixed(1)} hrs
                </AppText>

                {/* Phase breakdown */}
                <View style={{ gap: 8 }}>
                  {phaseRows.map(p => {
                    const phasePct = p.target > 0
                      ? Math.min((p.logged / p.target) * 100, 100) : 0;
                    return (
                      <View key={p.id}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between',
                                       marginBottom: 3 }}>
                          <AppText style={{ color: theme.textSub, fontSize: fs(11) }}>
                            {p.icon} {p.label}
                          </AppText>
                          <AppText style={{ color: phasePct >= 100 ? p.color : theme.textSub,
                                           fontSize: fs(11), fontWeight: '700' }}>
                            {p.logged}/{p.target} min {phasePct >= 100 ? '✓' : `(${Math.round(phasePct)}%)`}
                          </AppText>
                        </View>
                        <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2 }}>
                          <View style={{ height: 4, width: `${phasePct}%`,
                                         backgroundColor: p.color, borderRadius: 2 }} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Session history toggle */}
              <TouchableOpacity
                style={{ borderTopWidth: 1, borderTopColor: theme.border, padding: 12,
                         alignItems: 'center', flexDirection: 'row',
                         justifyContent: 'center', gap: 6 }}
                onPress={() => toggleBat(bat.id)}>
                <AppText style={{ color: theme.textSub, fontSize: fs(13) }}>
                  {isExpanded ? '▲ Hide' : '▼ Show'} sessions ({batSessions.length})
                </AppText>
              </TouchableOpacity>

              {/* Session rows */}
              {isExpanded && batSessions.map(s => {
                const meta  = s.phase_type ? PHASE_META[s.phase_type] : null;
                const isExt = s.source === 'external';
                return (
                  <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: theme.border,
                                            paddingHorizontal: 16, paddingVertical: 10,
                                            flexDirection: 'row', justifyContent: 'space-between',
                                            alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ color: theme.text, fontSize: fs(13), fontWeight: '600' }}>
                        {new Date(s.created_at).toLocaleDateString('en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' })}
                        {isExt ? '  🤖' : ''}
                      </AppText>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 3, alignItems: 'center' }}>
                        {meta && (
                          <View style={{ backgroundColor: `${meta.color}22`, paddingHorizontal: 6,
                                         paddingVertical: 2, borderRadius: 6 }}>
                            <AppText style={{ color: meta.color, fontSize: fs(10), fontWeight: '700' }}>
                              {meta.icon} {meta.label}
                            </AppText>
                          </View>
                        )}
                        <AppText style={{ color: theme.textSub, fontSize: fs(11) }}>
                          {Math.round((s.duration_seconds || 0) / 60)}m
                        </AppText>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText style={{ color: theme.accent, fontSize: fs(16), fontWeight: '800' }}>
                        {(s.knock_count || 0).toLocaleString()}
                      </AppText>
                      <AppText style={{ color: theme.textSub, fontSize: fs(11) }}>knocks</AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })
        )}

        {bats.length === 0 && (
          <AppText style={{ color: theme.textSub, textAlign: 'center', paddingVertical: 30 }}>
            No bats yet — add one to start tracking
          </AppText>
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
