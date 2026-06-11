import React, { useState, useCallback } from 'react';
import { BlurView } from 'expo-blur';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Modal, TouchableWithoutFeedback,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { getBats, getSessions, getOverallStats } from '../storage/database';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Squircle icon component (Apple-style coloured icon tile) ─────────────────
function IconTile({ emoji, bg, size = 52 }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size * 0.25,
      backgroundColor: bg, alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.48 }}>{emoji}</Text>
    </View>
  );
}

// ── Glass/Gradient card — uses BlurView in clear mode ────────────────────────
function GradientCard({ children, style, onPress }) {
  const { theme, mode } = useTheme();
  const Inner = onPress ? TouchableOpacity : View;

  if (mode === 'clear') {
    return (
      <Inner activeOpacity={0.75} onPress={onPress}
        style={[{ borderRadius: 20, overflow: 'hidden', borderWidth: 1,
                  borderColor: theme.border }, style]}>
        <BlurView intensity={60} tint="dark"
          style={{ flex: 1 }}>
          <View style={{ flex: 1, backgroundColor: theme.bgCard }}>
            {/* Top highlight shimmer */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                           backgroundColor: 'rgba(255,255,255,0.25)' }} />
            {children}
          </View>
        </BlurView>
      </Inner>
    );
  }

  return (
    <Inner activeOpacity={0.75} onPress={onPress}
      style={[{
        backgroundColor: theme.bgCard,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.border,
        overflow: 'hidden',
      }, style]}>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1,
                     backgroundColor: theme.borderLight, opacity: 0.6 }} />
      {children}
    </Inner>
  );
}

export default function HomeScreen({ navigation }) {
  const { theme, mode, setMode, fs, fontScale, setFontScale } = useTheme();
  const [stats, setStats] = useState({ totalBats: 0, totalSessions: 0, totalKnocks: 0 });
  const [bats, setBats] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [guideExpanded, setGuideExpanded] = useState(false);
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = async () => {
    const s = await getOverallStats();
    setStats(s);
    const allBats = await getBats();
    setBats(allBats.reverse());
    const allSessions = await getSessions();
    setRecentSessions(allSessions.slice(-5).reverse());
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));
  const onRefresh = async () => { setRefreshing(true); await loadData(); setRefreshing(false); };

  const guideSteps = [
    { num: '1', text: 'Oil the bat face, edges and back with raw linseed oil. Let it soak for 24 hours.' },
    { num: '2', text: 'Use a knocking mallet to gently tap the edges at 45° to round them.' },
    { num: '3', text: 'Work the face inward from edges, gradually increasing force over sessions.' },
    { num: '4', text: 'After 2–3 sessions, test against an old leather ball.' },
    { num: '5', text: 'Repeat oiling and knocking 4–6 times before using in a match.' },
  ];

  const F = {
    xs: fs(12), sm: fs(14), md: fs(16),
    lg: fs(18), xl: fs(22), xxl: fs(30),
  };

  const S = StyleSheet.create({
    sectionLabel: {
      color: theme.textMuted, fontSize: F.xs,
      fontWeight: '700', letterSpacing: 1.2,
      marginBottom: 12,
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: theme.bgHeader,
        paddingHorizontal: 20, paddingTop: 18, paddingBottom: 18,
        borderBottomWidth: 1, borderBottomColor: theme.border,
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.accent }} />
              <Text style={{ color: theme.accent, fontSize: F.xs, fontWeight: '800', letterSpacing: 1.5 }}>
                CRICKET BAT PREP
              </Text>
            </View>
            <Text style={{ color: '#ffffff', fontSize: F.xxl, fontWeight: '800', letterSpacing: -0.5 }}>
              BatKnock
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: F.sm, marginTop: 2 }}>
              Prepare your bat with precision
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowSettings(s => !s)}
            style={{
              width: 44, height: 44, borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.12)',
              alignItems: 'center', justifyContent: 'center',
            }}>
            <Text style={{ color: '#fff', fontSize: F.lg }}>⋯</Text>
          </TouchableOpacity>
        </View>

{/* Settings modal is rendered at root level below */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >

        {/* ── STATS ROW ───────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 20, gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Bats',     value: stats.totalBats,     icon: '🏏', bg: '#1e3a5f' },
            { label: 'Sessions', value: stats.totalSessions, icon: '📋', bg: '#1a3a2a' },
            { label: 'Knocks',   value: (stats.totalKnocks || 0).toLocaleString(), icon: '💥', bg: '#3a1a1a' },
          ].map(s => (
            <GradientCard key={s.label} style={{ flex: 1, padding: 14, alignItems: 'center' }}>
              <View style={{
                width: 40, height: 40, borderRadius: 12,
                backgroundColor: s.bg, alignItems: 'center', justifyContent: 'center',
                marginBottom: 10,
              }}>
                <Text style={{ fontSize: 18 }}>{s.icon}</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: F.lg, fontWeight: '800' }}>{s.value}</Text>
              <Text style={{ color: theme.textMuted, fontSize: F.xs, marginTop: 2 }}>{s.label}</Text>
            </GradientCard>
          ))}
        </View>

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={S.sectionLabel}>QUICK ACTIONS</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Bat Care', icon: '📚', bg: '#1e3a5f', screen: 'Guide' },
              { label: 'Mic Test', icon: '🎙️', bg: '#1a2a3a', screen: 'MicTest' },
            ].map(item => (
              <GradientCard key={item.label} style={{ flex: 1 }} onPress={() => navigation.navigate(item.screen)}>
                <View style={{ paddingVertical: 20, alignItems: 'center', gap: 10 }}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 16,
                    backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 26 }}>{item.icon}</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: F.sm, fontWeight: '700' }}>{item.label}</Text>
                </View>
              </GradientCard>
            ))}
          </View>
        </View>

        {/* ── ADD / MY BATS ROW ────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 24 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              flex: 1, borderRadius: 20, paddingVertical: 18,
              backgroundColor: theme.accent,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8,
            }}
            onPress={() => navigation.navigate('CreateBat')}>
            <Text style={{ color: '#fff', fontSize: F.xl, fontWeight: '800', lineHeight: F.xl }}>+</Text>
            <Text style={{ color: '#fff', fontSize: F.md, fontWeight: '700' }}>Add New Bat</Text>
          </TouchableOpacity>
          <GradientCard style={{ flex: 1 }} onPress={() => navigation.navigate('Bats')}>
            <View style={{ paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Text style={{ color: theme.accent, fontSize: F.xl }}>🏏</Text>
              <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700' }}>My Bats</Text>
            </View>
          </GradientCard>
        </View>

        {/* ── MY BATS LIST ─────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={S.sectionLabel}>MY BATS</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bats')}>
              <Text style={{ color: theme.accent, fontSize: F.sm, fontWeight: '700' }}>View all</Text>
            </TouchableOpacity>
          </View>
          {bats.length === 0 ? (
            <GradientCard onPress={() => navigation.navigate('CreateBat')}>
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, marginBottom: 12 }}>🏏</Text>
                <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700' }}>No bats yet</Text>
                <Text style={{ color: theme.textSub, fontSize: F.sm, marginTop: 6 }}>Tap to add your first bat</Text>
              </View>
            </GradientCard>
          ) : bats.slice(0, 3).map(bat => {
            const pct = bat.target_knocks ? Math.min((bat.total_knocks || 0) / bat.target_knocks * 100, 100) : 0;
            return (
              <GradientCard key={bat.id} style={{ marginBottom: 10 }}
                onPress={() => navigation.navigate('BatProfile', { bat })}>
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                  <View style={{
                    width: 52, height: 52, borderRadius: 16,
                    backgroundColor: theme.bgInput, alignItems: 'center',
                    justifyContent: 'center', marginRight: 14,
                    borderWidth: 1, borderColor: theme.border,
                  }}>
                    <Text style={{ fontSize: 24 }}>🏏</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700' }}>{bat.name}</Text>
                    <Text style={{ color: theme.textSub, fontSize: F.sm, marginTop: 2 }}>
                      {bat.brand}{bat.willow_type ? ` · ${bat.willow_type}` : ''}
                    </Text>
                    <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, marginTop: 8 }}>
                      <View style={{ height: 4, width: `${pct}%`, backgroundColor: theme.accent, borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: theme.textMuted, fontSize: F.xs, marginTop: 4 }}>{Math.round(pct)}% prepared</Text>
                  </View>
                  <Text style={{ color: theme.textMuted, fontSize: F.lg, marginLeft: 8 }}>›</Text>
                </View>
              </GradientCard>
            );
          })}
        </View>

        {/* ── HOW TO KNOCK-IN ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <GradientCard onPress={() => setGuideExpanded(e => !e)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
              <View style={{
                width: 44, height: 44, borderRadius: 14,
                backgroundColor: '#2a1a3a', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>📖</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700' }}>How to Knock-In a Bat</Text>
                <Text style={{ color: theme.textSub, fontSize: F.sm, marginTop: 2 }}>Read before your first session</Text>
              </View>
              <Text style={{ color: theme.textMuted, fontSize: F.sm }}>{guideExpanded ? '▲' : '▼'}</Text>
            </View>
            {guideExpanded && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <View style={{ height: 1, backgroundColor: theme.border, marginBottom: 14 }} />
                {guideSteps.map(step => (
                  <View key={step.num} style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                    <View style={{
                      width: 28, height: 28, borderRadius: 8,
                      backgroundColor: theme.accentDim, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: theme.accent, fontSize: F.sm, fontWeight: '800' }}>{step.num}</Text>
                    </View>
                    <Text style={{ flex: 1, color: theme.textSub, fontSize: F.sm, lineHeight: F.sm * 1.6 }}>{step.text}</Text>
                  </View>
                ))}
              </View>
            )}
          </GradientCard>
        </View>

        {/* ── RECENT SESSIONS ──────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={S.sectionLabel}>RECENT SESSIONS</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ActivityLog')}>
              <Text style={{ color: theme.accent, fontSize: F.sm, fontWeight: '700' }}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentSessions.length === 0 ? (
            <GradientCard>
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
                <Text style={{ color: theme.textSub, fontSize: F.sm }}>No sessions yet</Text>
              </View>
            </GradientCard>
          ) : recentSessions.map(session => (
            <GradientCard key={session.id} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: theme.accentDim, alignItems: 'center', justifyContent: 'center',
                  marginRight: 14,
                }}>
                  <Text style={{ fontSize: 20 }}>🏏</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700' }}>
                    {session.bat_name || 'Unknown Bat'}
                  </Text>
                  <Text style={{ color: theme.textSub, fontSize: F.sm, marginTop: 2 }}>
                    {session.knock_count} knocks · {Math.round((session.duration_seconds || 0) / 60)}m
                  </Text>
                </View>
                <Text style={{ color: theme.textMuted, fontSize: F.xs }}>{getRelativeTime(session.created_at)}</Text>
              </View>
            </GradientCard>
          ))}
        </View>

        {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <GradientCard onPress={() => setShowSettings(s => !s)}
            style={{ borderBottomLeftRadius: showSettings ? 0 : 20, borderBottomRightRadius: showSettings ? 0 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#2a2a1a', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700', flex: 1 }}>Settings</Text>
              <Text style={{ color: theme.textMuted, fontSize: F.sm }}>{showSettings ? '▲' : '▼'}</Text>
            </View>
          </GradientCard>
          {showSettings && (
            <View style={{
              backgroundColor: theme.bgCard, borderWidth: 1, borderTopWidth: 0,
              borderColor: theme.border,
              borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
            }}>
              {[
                { label: 'Trends & History', icon: '📈', bg: '#1a2a1a', screen: 'Trends' },
                { label: 'Activity Log',     icon: '📋', bg: '#1a1a2a', screen: 'ActivityLog' },
                { label: 'Mic Test',         icon: '🎙️', bg: '#2a1a1a', screen: 'MicTest' },
              ].map((link, idx, arr) => (
                <TouchableOpacity key={link.label} activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                    borderTopWidth: 1, borderTopColor: theme.border,
                    borderBottomLeftRadius: idx === arr.length - 1 ? 20 : 0,
                    borderBottomRightRadius: idx === arr.length - 1 ? 20 : 0,
                  }}
                  onPress={() => { setShowSettings(false); navigation.navigate(link.screen); }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: link.bg, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{link.icon}</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '600', flex: 1 }}>{link.label}</Text>
                  <Text style={{ color: theme.textMuted, fontSize: F.lg }}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <Text style={{ color: theme.textMuted, fontSize: F.xs, textAlign: 'center', marginBottom: 8 }}>
          BatKnock v1.1.2
        </Text>

      </ScrollView>
      {/* Settings Modal — full-screen overlay, not inline */}
      <Modal
        visible={showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}>
        <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
                         justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: theme.bgCard,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: 24, paddingBottom: 40,
                borderWidth: 1, borderColor: theme.border,
              }}>
                {/* Drag indicator */}
                <View style={{ width: 40, height: 4, borderRadius: 2,
                               backgroundColor: theme.border, alignSelf: 'center',
                               marginBottom: 20 }} />

                <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800',
                               marginBottom: 20 }}>Settings</Text>

                {/* Theme selector */}
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700',
                               letterSpacing: 1, marginBottom: 12 }}>THEME</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  {[
                    { key: 'light',  label: 'Light', icon: '☀️' },
                    { key: 'dark',   label: 'Dark',  icon: '🌙' },
                    { key: 'system', label: 'Auto',  icon: '📱' },
                  ].map(t => (
                    <TouchableOpacity key={t.key} onPress={() => setMode(t.key)}
                      style={{
                        flex: 1, borderRadius: 14, paddingVertical: 12,
                        alignItems: 'center',
                        backgroundColor: mode === t.key ? theme.accentDim : theme.bgInput,
                        borderWidth: 1.5,
                        borderColor: mode === t.key ? theme.accent : theme.border,
                      }}>
                      <Text style={{ fontSize: 20 }}>{t.icon}</Text>
                      <Text style={{ color: mode === t.key ? theme.accent : theme.textSub,
                                     fontSize: 11, fontWeight: '700', marginTop: 6 }}>
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Text size selector */}
                <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700',
                               letterSpacing: 1, marginBottom: 12 }}>TEXT SIZE</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 24 }}>
                  {[
                    { key: 0.85, label: 'A', size: 14 },
                    { key: 1.0,  label: 'A', size: 18 },
                    { key: 1.15, label: 'A', size: 22 },
                    { key: 1.3,  label: 'A', size: 26 },
                  ].map(f => (
                    <TouchableOpacity key={f.key} onPress={() => setFontScale(f.key)}
                      style={{
                        flex: 1, borderRadius: 14, paddingVertical: 12,
                        alignItems: 'center',
                        backgroundColor: fontScale === f.key ? theme.accentDim : theme.bgInput,
                        borderWidth: 1.5,
                        borderColor: fontScale === f.key ? theme.accent : theme.border,
                      }}>
                      <Text style={{ color: fontScale === f.key ? theme.accent : theme.textSub,
                                     fontSize: f.size, fontWeight: '800' }}>{f.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Done button */}
                <TouchableOpacity onPress={() => setShowSettings(false)}
                  style={{ backgroundColor: theme.accent, borderRadius: 14,
                           padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </SafeAreaView>
  );
}

function getRelativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}
