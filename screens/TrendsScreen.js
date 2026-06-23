import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { getSessions, getBats } from '../storage/database';
import AppText from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

const W = Dimensions.get('window').width;

export default function TrendsScreen({ navigation }) {
  const { theme, fs } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [bats, setBats] = useState([]);
  const [expandedBats, setExpandedBats] = useState({});
  const [dailyExpanded, setDailyExpanded] = useState(false);
  const [durationExpanded, setDurationExpanded] = useState(false);

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const s = await getSessions(); setSessions(s.reverse());
    const b = await getBats(); setBats(b.reverse());
  };

  const totalKnocks = sessions.reduce((s, x) => s + (x.knock_count || 0), 0);
  const totalTime = sessions.reduce((s, x) => s + (x.duration_seconds || 0), 0);
  const avgKnocks = sessions.length > 0 ? Math.round(totalKnocks / sessions.length) : 0;

  // Daily knocks for last 30 days
  const dailyData = (() => {
    const days = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      days[key] = 0;
    }
    sessions.forEach(s => {
      const key = new Date(s.created_at).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
      if (days[key] !== undefined) days[key] += s.knock_count || 0;
    });
    return Object.entries(days);
  })();

  const maxKnocks = Math.max(...dailyData.map(d => d[1]), 1);

  const CollapsibleChart = ({ title, expanded, onToggle, children, summary }) => (
    <View style={{ backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={onToggle}
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <View>
          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700', letterSpacing: 0.5 }}>{title}</AppText>
          {!expanded && <AppText style={{ color: theme.textSub, fontSize: fs(13), marginTop: 2 }}>{summary}</AppText>}
        </View>
        <AppText style={{ color: theme.textMuted, fontSize: fs(14) }}>{expanded ? '▲' : '▼'}</AppText>
      </TouchableOpacity>
      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          {children}
        </View>
      )}
    </View>
  );

  const toggleBat = (id) => setExpandedBats(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Trends & History" subtitle="Last 30 days across all bats" showHome />

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {/* 4 Stat Cards */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Total Knocks', value: totalKnocks.toLocaleString(), color: theme.accent },
            { label: 'Sessions', value: sessions.length, sub: `avg ${avgKnocks}/session`, color: theme.accent },
            { label: 'Total Time', value: `${(totalTime / 3600).toFixed(1)} hrs`, color: theme.blue },
            { label: 'Bats Tracked', value: bats.length, color: theme.orange },
          ].map(card => (
            <View key={card.label} style={{ width: (W - 42) / 2, backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.border }}>
              <AppText style={{ color: theme.textSub, fontSize: fs(12), marginBottom: 6 }}>{card.label}</AppText>
              <AppText style={{ color: theme.text, fontSize: fs(22), fontWeight: '800' }}>{card.value}</AppText>
              {card.sub && <AppText style={{ color: theme.textSub, fontSize: fs(11), marginTop: 2 }}>{card.sub}</AppText>}
            </View>
          ))}
        </View>

        {/* Daily Knocks Chart — COLLAPSED by default */}
        <CollapsibleChart
          title="DAILY KNOCKS (30 DAYS)"
          expanded={dailyExpanded}
          onToggle={() => setDailyExpanded(e => !e)}
          summary={`Peak: ${maxKnocks} knocks · Tap to expand`}
        >
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 100 }}>
            {dailyData.map((d, i) => (
              <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <View style={{ width: '100%', height: Math.max((d[1] / maxKnocks) * 90, d[1] > 0 ? 3 : 0), backgroundColor: theme.accent, borderRadius: 2 }} />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
            {[dailyData[0], dailyData[7], dailyData[14], dailyData[21], dailyData[29]].filter(Boolean).map((d, i) => (
              <AppText key={i} style={{ color: theme.textMuted, fontSize: 9 }}>{d[0]}</AppText>
            ))}
          </View>
        </CollapsibleChart>

        {/* Session Duration Chart — COLLAPSED by default */}
        <CollapsibleChart
          title="SESSION DURATION (MIN)"
          expanded={durationExpanded}
          onToggle={() => setDurationExpanded(e => !e)}
          summary={sessions.length > 0 ? `${sessions.length} sessions recorded · Tap to expand` : 'No sessions yet'}
        >
          {sessions.length === 0 ? (
            <AppText style={{ color: theme.textMuted, fontSize: fs(13), textAlign: 'center', padding: 20 }}>No sessions yet</AppText>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 4 }}>
                {sessions.slice(0, 20).reverse().map((s, i) => {
                  const dur = Math.round((s.duration_seconds || 0) / 60);
                  const maxDur = Math.max(...sessions.map(x => Math.round((x.duration_seconds || 0) / 60)), 1);
                  return (
                    <View key={i} style={{ flex: 1, backgroundColor: theme.blue, borderRadius: 3, height: Math.max((dur / maxDur) * 80, dur > 0 ? 3 : 0), opacity: 0.85 }} />
                  );
                })}
              </View>
              <AppText style={{ color: theme.textMuted, fontSize: fs(11), marginTop: 6 }}>Last {Math.min(sessions.length, 20)} sessions</AppText>
            </>
          )}
        </CollapsibleChart>

        {/* Per Bat */}
        <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700', letterSpacing: 0.5, marginBottom: 10 }}>PER BAT</AppText>
        {bats.map(bat => {
          const batSessions = sessions.filter(s => s.bat_id === bat.id);
          const batKnocks = batSessions.reduce((sum, s) => sum + (s.knock_count || 0), 0);
          const batTime = batSessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
          const avgPerSession = batSessions.length > 0 ? Math.round(batKnocks / batSessions.length) : 0;
          const pct = bat.target_knocks ? Math.min(batKnocks / bat.target_knocks * 100, 100) : 0;
          const isExpanded = expandedBats[bat.id];
          return (
            <View key={bat.id} style={{ backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' }}>
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700' }}>{bat.name}</AppText>
                  <AppText style={{ color: theme.accent, fontSize: fs(13), fontWeight: '700' }}>{pct.toFixed(0)}% ready</AppText>
                </View>
                <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, marginBottom: 10 }}>
                  <View style={{ height: 4, width: `${pct}%`, backgroundColor: theme.accent, borderRadius: 2 }} />
                </View>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <AppText style={{ color: theme.textSub, fontSize: fs(12) }}>{batKnocks} knocks</AppText>
                  <AppText style={{ color: theme.textSub, fontSize: fs(12) }}>{batSessions.length} sessions</AppText>
                  <AppText style={{ color: theme.textSub, fontSize: fs(12) }}>{(batTime / 3600).toFixed(1)} hrs</AppText>
                  <AppText style={{ color: theme.textSub, fontSize: fs(12) }}>avg {avgPerSession}/session</AppText>
                </View>
              </View>
              <TouchableOpacity
                style={{ borderTopWidth: 1, borderTopColor: theme.borderLight, padding: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                onPress={() => toggleBat(bat.id)}>
                <AppText style={{ color: theme.textSub, fontSize: fs(13) }}>{isExpanded ? '▲ Hide' : '▼ Show'} session history</AppText>
              </TouchableOpacity>
              {isExpanded && batSessions.map(s => (
                <View key={s.id} style={{ borderTopWidth: 1, borderTopColor: theme.borderLight, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View>
                    <AppText style={{ color: theme.text, fontSize: fs(13), fontWeight: '600' }}>
                      {new Date(s.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </AppText>
                    <AppText style={{ color: theme.textSub, fontSize: fs(12) }}>{Math.round((s.duration_seconds || 0) / 60)}m session</AppText>
                  </View>
                  <AppText style={{ color: theme.accent, fontSize: fs(16), fontWeight: '800' }}>{s.knock_count}</AppText>
                </View>
              ))}
            </View>
          );
        })}
        {bats.length === 0 && <AppText style={{ color: theme.textSub, textAlign: 'center', paddingVertical: 30 }}>No data yet</AppText>}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
