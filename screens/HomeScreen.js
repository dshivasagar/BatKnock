import React, { useState, useCallback, useEffect } from 'react';
import { BlurView } from 'expo-blur';
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, Modal, TouchableWithoutFeedback, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { getBats, getSessions, getOverallStats } from '../storage/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePro } from '../contexts/ProContext';
import AdBanner from '../components/AdBanner';

// ── DEVELOPER TESTING FLAG ─────────────────────────────────────────────────
// Set to false before App Store / Play Store submission to hide the
// Pro testing controls from users.
const DEV_MODE = true;

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
  const { theme, mode, fs } = useTheme();
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
  const { isPro, showUpgrade, activatePro, deactivatePro } = usePro();
  const resetToPro = deactivatePro;
  const [stats, setStats] = useState({ totalBats: 0, totalSessions: 0, totalKnocks: 0 });
  const [bats, setBats] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showKnockGuide, setShowKnockGuide] = useState(false);
  const [showChooseGuide, setShowChooseGuide] = useState(false);
  const [chooseCardIndex, setChooseCardIndex] = useState(0);
  const [cardIndex, setCardIndex] = useState(0);
  const [showMyBats, setShowMyBats] = useState(true);

  // Weather — fetched from wttr.in (free, no API key needed)
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => { fetchWeather(); }, []);

  const fetchWeather = async () => {
    setWeatherLoading(true);
    try {
      // wttr.in provides free weather data by location name or coords.
      // Using a fixed location query here; swap to expo-location coords
      // once expo-location is installed for precise device location.
      const res = await fetch('https://wttr.in/?format=j1', { timeout: 5000 });
      const data = await res.json();
      const current = data.current_condition?.[0];
      if (current) {
        setWeather({
          temp:      parseInt(current.temp_C),
          humidity:  parseInt(current.humidity),
          feelsLike: parseInt(current.FeelsLikeC),
          desc:      current.weatherDesc?.[0]?.value || '',
          icon:      getWeatherIcon(parseInt(current.weatherCode)),
        });
      }
    } catch (e) {
      // Silently fail — weather is supplementary info, not critical
    } finally {
      setWeatherLoading(false);
    }
  };

  const getWeatherIcon = (code) => {
    if (code === 113) return '☀️';
    if (code <= 116) return '⛅';
    if (code <= 122) return '☁️';
    if (code <= 143) return '🌫️';
    if (code <= 176) return '🌦️';
    if (code <= 260) return '🌧️';
    if (code <= 299) return '⛈️';
    if (code <= 395) return '❄️';
    return '🌡️';
  };
  const [shortcuts, setShortcuts] = useState(['profile', 'mybats', null]);
  const [showShortcutPicker, setShowShortcutPicker] = useState(false);
  const [editingSlot, setEditingSlot] = useState(0);
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showLinksSection, setShowLinksSection] = useState(true);
  const [showHowToUse, setShowHowToUse] = useState(false);

  const loadData = async () => {
    const s = await getOverallStats();
    setStats(s);
    const savedShortcuts = await AsyncStorage.getItem('batknock_shortcuts');
    if (savedShortcuts) {
      setShortcuts(JSON.parse(savedShortcuts));
    }
    const savedShowBats = await AsyncStorage.getItem('batknock_show_mybats');
    if (savedShowBats !== null) setShowMyBats(JSON.parse(savedShowBats));
    const allBats = await getBats();
    setBats([...allBats].reverse());
    // If bats exist, ensure My Bats section is visible
    if (allBats.length > 0) setShowMyBats(true);
    const allSessions = await getSessions();
    setRecentSessions(allSessions.reverse());
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

  // "How to Choose the Right Cricket Bat" — written in our own words, our
  // own structure, summarising the same five factors that genuinely matter
  // when picking a bat (size, weight/pickup, sweet spot, willow, profile).
  const chooseBatSteps = [
    {
      num: '1', icon: '📏', title: 'Get the Size Right First',
      text: 'Size is the foundation — get it wrong and nothing else matters. A bat that\u2019s too big slows your swing and tires your arms over a long innings. Quick check: stand the bat upright beside you — the top of the handle should sit roughly level with your hip bone. If it sits noticeably higher, size down.',
    },
    {
      num: '2', icon: '⚖️', title: 'Weight & Pickup',
      text: 'The number on the label matters less than how the bat actually feels in your hands. Pickup is how light or heavy a bat swings based on where the weight sits through the blade — a well-balanced 2lb 10oz bat can feel lighter than a poorly balanced 2lb 7oz one. Shadow swing it 15–20 times: if your wrists strain or your backlift drops, it\u2019s too heavy for you.',
    },
    {
      num: '3', icon: '🎯', title: 'Sweet Spot Position',
      text: 'Most modern bats hit well across a similar zone, so sweet spot position mostly affects balance and feel rather than power. A lower sweet spot tends to feel easier to manoeuvre and suits front-foot play. A higher sweet spot favours back-foot, aggressive batting on bouncier pitches. A mid sweet spot is the safest all-round starting point.',
    },
    {
      num: '4', icon: '🌿', title: 'English vs Kashmir Willow',
      text: 'English willow is softer and more fibrous, giving better rebound and that distinctive sound off the bat — it\u2019s the standard for serious leather-ball cricket. Kashmir willow is denser and tougher, making it a solid, affordable choice for beginners and heavy net use. Both need knocking in before match use.',
    },
    {
      num: '5', icon: '🏏', title: 'Bat Profile — Power vs Control',
      text: 'Profile is the physical shape of the blade. Thicker edges and a higher spine put more wood behind the ball for raw power, suiting white-ball cricket. Thinner edges and a flatter spine give better control and a lighter, more manoeuvrable feel, suiting classical technique and the longer format.',
    },
    {
      num: '6', icon: '✅', title: 'Putting It All Together',
      text: 'No single spec makes a bat right for you — it\u2019s the combination. Correct size, a pickup that feels natural, a sweet spot that matches how you play, the right willow for your level, and a profile suited to your game. When in doubt, the feel in your hands always tells you more than the numbers on the label.',
    },
  ];

  // App-level workflow guide — how to use Knockmate itself, distinct from
  // the bat-knocking technique guide above.
  const howToUseSteps = [
    { icon: '🏏', text: 'Add a new bat with all the necessary info — brand, willow type, size, weight, grain count and your knocking target.' },
    { icon: '📐', text: 'Define zone boundaries on the Heatmap screen so knock tracking maps accurately to your bat\u2019s actual photo.' },
    { icon: '🛢️', text: 'Move to the Bat Preparation Journey — start with Oiling, then knocking.' },
    { icon: '🔨', text: 'Cover all areas of the bat with the right knocking force for that phase, so the willow compresses evenly across the whole blade.' },
    { icon: '✅', text: 'Once complete, the Heatmap will show you whether the bat is ready.' },
    { icon: '🔄', text: 'Repeat the process based on the age and type of wood — older bats or different willow grades may need extra rounds for the best result.' },
  ];

  const ALL_SHORTCUTS = [
    { id: 'activity',  label: 'Recent Sessions', icon: '📋', bg: '#1a1a2a', screen: 'ActivityLog' },
    { id: 'trends',    label: 'Trends',          icon: '📈', bg: '#1a2a1a', screen: 'Trends' },
    { id: 'knockin',   label: 'How to Knock',    icon: '📖', bg: '#2a1a3a', action: 'guide' },
    { id: 'profile',   label: 'Profile',         icon: '👤', bg: '#2a1a2a', screen: 'Profile' },
    { id: 'choosebat', label: 'Choose Your Bat', icon: '🧭', bg: '#3a2a1a', action: 'chooseguide' },
    { id: 'batsearch', label: 'Bat Search',      icon: '🔍', bg: '#1a2a3a', screen: 'BatSearch' },
    { id: 'batcare',   label: 'Bat Care',        icon: '📚', bg: '#1e3a5f', screen: 'Guide' },
    { id: 'mybats',    label: 'My Bats',         icon: '🏏', bg: '#1e3a5f', screen: 'Bats' },
    { id: 'season',    label: 'Season Guide',    icon: '🌍', bg: '#1a2a2a', screen: 'SeasonGuide' },
  ];

  const saveShortcuts = async (newShortcuts) => {
    setShortcuts(newShortcuts);
    await AsyncStorage.setItem('batknock_shortcuts', JSON.stringify(newShortcuts));
  };

  const toggleMyBats = async () => {
    const next = !showMyBats;
    setShowMyBats(next);
    await AsyncStorage.setItem('batknock_show_mybats', JSON.stringify(next));
  };

  const F = {
    xs: fs(12), sm: fs(14), md: fs(16),
    lg: fs(18), xl: fs(22), xxl: fs(30),
  };

  const S = StyleSheet.create({
    sectionLabel: {
      color: theme.textMuted, fontSize: F.xs,
      fontWeight: '700', letterSpacing: 1.2,
      marginBottom: 10, marginTop: 4,
    },
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <View style={{
        backgroundColor: theme.bgHeader,
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12,
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
              Knockmate
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: F.sm, marginTop: 2 }}>
              All in One Cricket Bat Prep and Companion
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowThemeModal(true)}
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
        contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
      >



        {/* ── WEATHER STRIP ────────────────────────────────────────────────── */}
        {(weather || weatherLoading) && (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={{
              backgroundColor: theme.bgCard, borderRadius: 16,
              borderWidth: 1, borderColor: theme.border,
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 16, paddingVertical: 12, gap: 0,
            }}>
              {weatherLoading ? (
                <Text style={{ color: theme.textMuted, fontSize: F.sm }}>Loading weather…</Text>
              ) : weather ? (
                <>
                  {/* Icon + description */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 28 }}>{weather.icon}</Text>
                    <View>
                      <Text style={{ color: theme.text, fontSize: F.xs, fontWeight: '600' }}>
                        {weather.desc}
                      </Text>
                      <Text style={{ color: theme.textMuted, fontSize: F.xs }}>
                        Feels like {weather.feelsLike}°C
                      </Text>
                    </View>
                  </View>
                  {/* Temperature gauge */}
                  <View style={{ alignItems: 'center', paddingHorizontal: 14,
                                 borderLeftWidth: 1, borderLeftColor: theme.border }}>
                    <Text style={{ color: theme.accent, fontSize: F.lg, fontWeight: '800' }}>
                      {weather.temp}°
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '600' }}>TEMP</Text>
                  </View>
                  {/* Humidity gauge */}
                  <View style={{ alignItems: 'center', paddingHorizontal: 14,
                                 borderLeftWidth: 1, borderLeftColor: theme.border }}>
                    <Text style={{ color: '#60a5fa', fontSize: F.lg, fontWeight: '800' }}>
                      {weather.humidity}%
                    </Text>
                    <Text style={{ color: theme.textMuted, fontSize: 10, fontWeight: '600' }}>HUMIDITY</Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
        )}

        {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={S.sectionLabel}>QUICK ACTIONS</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: 'Choose Your Bat', icon: '🧭', bg: '#3a2a1a', action: 'chooseguide' },
              { label: 'Bat Search',      icon: '🔍', bg: '#1a2a3a', screen: 'BatSearch' },
              { label: 'Bat Care',        icon: '📚', bg: '#1e3a5f', screen: 'Guide' },
            ].map(item => (
              <GradientCard key={item.label} style={{ flex: 1 }}
                onPress={() => {
                  if (item.action === 'chooseguide') { setChooseCardIndex(0); setShowChooseGuide(true); }
                  else navigation.navigate(item.screen);
                }}>
                <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                  <View style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 24 }}>{item.icon}</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: F.sm, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                </View>
              </GradientCard>
            ))}
          </View>
        </View>

        {/* ── ADD NEW BAT ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={{
              borderRadius: 14, paddingVertical: 16,
              backgroundColor: theme.accent,
              alignItems: 'center', flexDirection: 'row',
              justifyContent: 'center', gap: 8,
            }}
            onPress={() => {
                if (!isPro && bats.length >= 2) { showUpgrade(); return; }
                navigation.navigate('CreateBat');
              }}>
            <Text style={{ color: '#fff', fontSize: F.xl, fontWeight: '800', lineHeight: F.xl }}>+</Text>
            <Text style={{ color: '#fff', fontSize: F.md, fontWeight: '700' }}>Add New Bat</Text>
          </TouchableOpacity>
        </View>

        {/* ── CUSTOMISABLE SHORTCUTS ──────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={S.sectionLabel}>MY SHORTCUTS</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {shortcuts.map((shortcutId, idx) => {
              const item = ALL_SHORTCUTS.find(s => s.id === shortcutId);
              return item ? (
                <GradientCard key={idx} style={{ flex: 1 }}
                  onPress={() => {
                    if (item.action === 'guide') { setCardIndex(0); setShowKnockGuide(true); }
                    else if (item.action === 'chooseguide') { setChooseCardIndex(0); setShowChooseGuide(true); }
                    else navigation.navigate(item.screen);
                  }}>
                  <View style={{ paddingVertical: 18, alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 14,
                                   backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                    </View>
                    <Text style={{ color: theme.text, fontSize: F.sm, fontWeight: '700', textAlign: 'center' }}>{item.label}</Text>
                    <TouchableOpacity onPress={() => { setEditingSlot(idx); setShowShortcutPicker(true); }}
                      style={{ position: 'absolute', top: 6, right: 6,
                               width: 20, height: 20, borderRadius: 10,
                               backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center',
                               borderWidth: 1, borderColor: theme.border }}>
                      <Text style={{ color: theme.textMuted, fontSize: 10 }}>✎</Text>
                    </TouchableOpacity>
                  </View>
                </GradientCard>
              ) : (
                <TouchableOpacity key={idx} style={{ flex: 1 }}
                  onPress={() => { setEditingSlot(idx); setShowShortcutPicker(true); }}>
                  <View style={{ borderRadius: 20, borderWidth: 1.5, borderColor: theme.border,
                                 borderStyle: 'dashed', paddingVertical: 22,
                                 alignItems: 'center', justifyContent: 'center', gap: 6,
                                 backgroundColor: theme.bgCard }}>
                    <Text style={{ color: theme.textMuted, fontSize: 28 }}>+</Text>
                    <Text style={{ color: theme.textMuted, fontSize: F.xs, fontWeight: '700' }}>Add Shortcut</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>



        {/* ── HOW TO USE THIS APP ─────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <GradientCard onPress={() => setShowHowToUse(s => !s)}
            style={{ borderBottomLeftRadius: showHowToUse ? 0 : 20, borderBottomRightRadius: showHowToUse ? 0 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e3a5f', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>❔</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700', flex: 1 }}>How to Use This App</Text>
              <Text style={{ color: theme.textMuted, fontSize: F.sm }}>{showHowToUse ? '▲' : '▼'}</Text>
            </View>
          </GradientCard>
          {showHowToUse && (
            <View style={{
              backgroundColor: theme.bgCard, borderWidth: 1, borderTopWidth: 0,
              borderColor: theme.border,
              borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
              padding: 16,
            }}>
              {howToUseSteps.map((step, idx) => (
                <View key={idx} style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 12,
                  marginBottom: idx === howToUseSteps.length - 1 ? 0 : 14,
                }}>
                  <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: theme.bgInput,
                                 alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
                    <Text style={{ fontSize: 14 }}>{step.icon}</Text>
                  </View>
                  <Text style={{ color: theme.textSub, fontSize: F.sm, lineHeight: 20, flex: 1 }}>
                    {step.text}
                  </Text>
                </View>
              ))}

              {/* Guidance disclaimer */}
              <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: theme.border }}>
                <Text style={{ color: theme.textMuted, fontSize: F.xs, lineHeight: 17, fontStyle: 'italic' }}>
                  Note: Knockmate is for guidance purposes only. Real-world readiness can vary based on your own knocking technique and the quality of the willow — use these tools as a helpful estimate, not a guarantee.
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── SETTINGS ─────────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <GradientCard onPress={() => setShowLinksSection(s => !s)}
            style={{ borderBottomLeftRadius: showLinksSection ? 0 : 20, borderBottomRightRadius: showLinksSection ? 0 : 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#2a2a1a', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
              </View>
              <Text style={{ color: theme.text, fontSize: F.md, fontWeight: '700', flex: 1 }}>Settings</Text>
              <Text style={{ color: theme.textMuted, fontSize: F.sm }}>{showLinksSection ? '▲' : '▼'}</Text>
            </View>
          </GradientCard>
          {showLinksSection && (
            <View style={{
              backgroundColor: theme.bgCard, borderWidth: 1, borderTopWidth: 0,
              borderColor: theme.border,
              borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
            }}>
              {[
                { label: 'My Bats',           icon: '🏏', bg: '#1e3a5f', screen: 'Bats' },
                { label: 'Recent Sessions',  icon: '📋', bg: '#1a1a2a', screen: 'ActivityLog' },
                { label: 'Profile',          icon: '👤', bg: '#2a1a2a', screen: 'Profile' },
                { label: 'Trends & History', icon: '📈', bg: '#1a2a1a', screen: 'Trends' },
                { label: 'Activity Log',     icon: '📋', bg: '#1a1a2a', screen: 'ActivityLog' },
                { label: 'Season Guide',     icon: '🌍', bg: '#1a2a2a', screen: 'SeasonGuide' },
                { label: 'Bat Search',         icon: '🔍', bg: '#2a1a1a', screen: 'BatSearch' },
              ].map((link, idx, arr) => (
                <TouchableOpacity key={link.label} activeOpacity={0.7}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
                    borderTopWidth: 1, borderTopColor: theme.border,
                    borderBottomLeftRadius: idx === arr.length - 1 ? 20 : 0,
                    borderBottomRightRadius: idx === arr.length - 1 ? 20 : 0,
                  }}
                  onPress={() => { setShowLinksSection(false); navigation.navigate(link.screen); }}>
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
          Knockmate v1.3.0
        </Text>

      </ScrollView>
      {/* ── Shortcut Picker Modal ──────────────────────────────────────── */}
      <Modal
        visible={showShortcutPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShortcutPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowShortcutPicker(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
            <TouchableWithoutFeedback>
              <View style={{
                backgroundColor: theme.bgCard,
                borderTopLeftRadius: 24, borderTopRightRadius: 24,
                padding: 24, paddingBottom: 44,
                borderWidth: 1, borderColor: theme.border,
              }}>
                <View style={{ width: 40, height: 4, borderRadius: 2,
                               backgroundColor: theme.border, alignSelf: 'center', marginBottom: 20 }} />
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: '800', marginBottom: 6 }}>
                  Choose Shortcut
                </Text>
                <Text style={{ color: theme.textSub, fontSize: 13, marginBottom: 20 }}>
                  Select what appears in slot {editingSlot + 1}
                </Text>
                {ALL_SHORTCUTS.map(item => (
                  <TouchableOpacity key={item.id}
                    onPress={() => {
                      const next = [...shortcuts];
                      next[editingSlot] = item.id;
                      saveShortcuts(next);
                      setShowShortcutPicker(false);
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 14,
                      padding: 14, borderRadius: 14, marginBottom: 8,
                      backgroundColor: shortcuts[editingSlot] === item.id ? theme.accentDim : theme.bgInput,
                      borderWidth: 1.5,
                      borderColor: shortcuts[editingSlot] === item.id ? theme.accent : theme.border,
                    }}>
                    <View style={{ width: 40, height: 40, borderRadius: 12,
                                   backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    </View>
                    <Text style={{
                      color: shortcuts[editingSlot] === item.id ? theme.accent : theme.text,
                      fontSize: 15, fontWeight: '600', flex: 1,
                    }}>{item.label}</Text>
                    {shortcuts[editingSlot] === item.id && (
                      <Text style={{ color: theme.accent, fontSize: 16 }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
                {shortcuts[editingSlot] && (
                  <TouchableOpacity
                    onPress={() => {
                      const next = [...shortcuts];
                      next[editingSlot] = null;
                      saveShortcuts(next);
                      setShowShortcutPicker(false);
                    }}
                    style={{ marginTop: 8, padding: 14, borderRadius: 14, alignItems: 'center',
                             backgroundColor: '#3a1a1a', borderWidth: 1, borderColor: theme.red }}>
                    <Text style={{ color: theme.red, fontSize: 14, fontWeight: '700' }}>Remove Shortcut</Text>
                  </TouchableOpacity>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Knock-In Guide Flashcard Modal ───────────────────────────── */}
      <Modal
        visible={showKnockGuide}
        transparent
        animationType="slide"
        onRequestClose={() => setShowKnockGuide(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
                       justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: theme.bgCard,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 24, paddingBottom: 44,
            borderWidth: 1, borderColor: theme.border,
            minHeight: '75%',
          }}>
            {/* Drag indicator */}
            <View style={{ width: 40, height: 4, borderRadius: 2,
                           backgroundColor: theme.border, alignSelf: 'center',
                           marginBottom: 20 }} />

            {/* Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center',
                           justifyContent: 'space-between', marginBottom: 24 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800' }}>
                How to Knock
              </Text>
              <TouchableOpacity onPress={() => setShowKnockGuide(false)}
                style={{ width: 32, height: 32, borderRadius: 16,
                         backgroundColor: theme.bgInput, borderWidth: 1,
                         borderColor: theme.border,
                         alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Step dots */}
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 28 }}>
              {guideSteps.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setCardIndex(i)}>
                  <View style={{
                    width: cardIndex === i ? 24 : 8, height: 8,
                    borderRadius: 4,
                    backgroundColor: cardIndex === i ? theme.accent : theme.border,
                  }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Flashcard */}
            <View style={{
              flex: 1, backgroundColor: theme.bgInput,
              borderRadius: 20, padding: 28,
              borderWidth: 1, borderColor: theme.border,
              alignItems: 'center', justifyContent: 'center',
              minHeight: 240,
            }}>
              {/* Step number */}
              <View style={{
                width: 56, height: 56, borderRadius: 18,
                backgroundColor: theme.accentDim,
                alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
              }}>
                <Text style={{ color: theme.accent, fontSize: 24, fontWeight: '800' }}>
                  {guideSteps[cardIndex]?.num}
                </Text>
              </View>
              {/* Step icon */}
              <Text style={{ fontSize: 36, marginBottom: 20 }}>
                {['🛢️', '🔨', '👊', '🏏', '🔄'][cardIndex] || '📖'}
              </Text>
              {/* Step text */}
              <Text style={{
                color: theme.text, fontSize: 16, fontWeight: '600',
                textAlign: 'center', lineHeight: 26,
              }}>
                {guideSteps[cardIndex]?.text}
              </Text>
              {/* Step label */}
              <Text style={{
                color: theme.textMuted, fontSize: 11, fontWeight: '700',
                letterSpacing: 1, marginTop: 20,
              }}>
                STEP {guideSteps[cardIndex]?.num} OF {guideSteps.length}
              </Text>
            </View>

            {/* Navigation buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setCardIndex(i => Math.max(0, i - 1))}
                disabled={cardIndex === 0}
                style={{
                  flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                  backgroundColor: theme.bgInput,
                  borderWidth: 1, borderColor: theme.border,
                  opacity: cardIndex === 0 ? 0.4 : 1,
                }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>← Previous</Text>
              </TouchableOpacity>

              {cardIndex < guideSteps.length - 1 ? (
                <TouchableOpacity
                  onPress={() => setCardIndex(i => Math.min(guideSteps.length - 1, i + 1))}
                  style={{
                    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                    backgroundColor: theme.accent,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowKnockGuide(false)}
                  style={{
                    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                    backgroundColor: theme.accent,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>✓ Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Choose the Right Bat Guide Flashcard Modal ───────────────────── */}
      <Modal
        visible={showChooseGuide}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChooseGuide(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
                       justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: theme.bgCard,
            borderTopLeftRadius: 28, borderTopRightRadius: 28,
            padding: 24, paddingBottom: 44,
            borderWidth: 1, borderColor: theme.border,
            minHeight: '78%',
          }}>
            <View style={{ width: 40, height: 4, borderRadius: 2,
                           backgroundColor: theme.border, alignSelf: 'center',
                           marginBottom: 20 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center',
                           justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: '800', flex: 1 }}>
                How to Choose the Right Bat
              </Text>
              <TouchableOpacity onPress={() => setShowChooseGuide(false)}
                style={{ width: 32, height: 32, borderRadius: 16,
                         backgroundColor: theme.bgInput, borderWidth: 1,
                         borderColor: theme.border,
                         alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.textMuted, fontSize: 16, fontWeight: '700' }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ color: theme.textSub, fontSize: 12, marginBottom: 20 }}>
              The five things that actually matter when picking a bat
            </Text>

            {/* Step dots */}
            <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
              {chooseBatSteps.map((_, i) => (
                <TouchableOpacity key={i} onPress={() => setChooseCardIndex(i)}>
                  <View style={{
                    width: chooseCardIndex === i ? 24 : 8, height: 8,
                    borderRadius: 4,
                    backgroundColor: chooseCardIndex === i ? theme.accent : theme.border,
                  }} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Flashcard */}
            <View style={{
              flex: 1, backgroundColor: theme.bgInput,
              borderRadius: 20, padding: 26,
              borderWidth: 1, borderColor: theme.border,
              alignItems: 'center', justifyContent: 'center',
              minHeight: 260,
            }}>
              <Text style={{ fontSize: 34, marginBottom: 14 }}>
                {chooseBatSteps[chooseCardIndex]?.icon}
              </Text>
              <Text style={{
                color: theme.accent, fontSize: 15, fontWeight: '800',
                textAlign: 'center', marginBottom: 14,
              }}>
                {chooseBatSteps[chooseCardIndex]?.title}
              </Text>
              <Text style={{
                color: theme.text, fontSize: 14, fontWeight: '500',
                textAlign: 'center', lineHeight: 22,
              }}>
                {chooseBatSteps[chooseCardIndex]?.text}
              </Text>
              <Text style={{
                color: theme.textMuted, fontSize: 11, fontWeight: '700',
                letterSpacing: 1, marginTop: 18,
              }}>
                {chooseCardIndex + 1} OF {chooseBatSteps.length}
              </Text>
            </View>

            {/* Navigation buttons */}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                onPress={() => setChooseCardIndex(i => Math.max(0, i - 1))}
                disabled={chooseCardIndex === 0}
                style={{
                  flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                  backgroundColor: theme.bgInput,
                  borderWidth: 1, borderColor: theme.border,
                  opacity: chooseCardIndex === 0 ? 0.4 : 1,
                }}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>← Previous</Text>
              </TouchableOpacity>

              {chooseCardIndex < chooseBatSteps.length - 1 ? (
                <TouchableOpacity
                  onPress={() => setChooseCardIndex(i => Math.min(chooseBatSteps.length - 1, i + 1))}
                  style={{
                    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                    backgroundColor: theme.accent,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setShowChooseGuide(false)}
                  style={{
                    flex: 1, padding: 16, borderRadius: 14, alignItems: 'center',
                    backgroundColor: theme.accent,
                  }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>✓ Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal — full-screen overlay, not inline */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowThemeModal(false)}>
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

                {/* ── DEV TESTING — remove before submission ── */}
                {DEV_MODE && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700',
                                   letterSpacing: 1, marginBottom: 12 }}>
                      🧪 DEVELOPER TESTING
                    </Text>
                    <View style={{ backgroundColor: '#1a1200', borderRadius: 14,
                                   borderWidth: 1, borderColor: '#f59e0b44',
                                   padding: 14, gap: 10 }}>
                      <Text style={{ color: '#f59e0b', fontSize: 11,
                                     marginBottom: 4, lineHeight: 16 }}>
                        Toggle Pro status locally. No payment is taken.{'\n'}
                        Set DEV_MODE = false in HomeScreen.js before submitting to stores.
                      </Text>
                      <TouchableOpacity
                        onPress={() => activatePro()}
                        style={{ backgroundColor: '#16a34a22', borderRadius: 10,
                                 padding: 12, alignItems: 'center',
                                 borderWidth: 1, borderColor: '#16a34a' }}>
                        <Text style={{ color: '#16a34a', fontSize: 14,
                                       fontWeight: '700' }}>🔓 Unlock Pro (Test)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => resetToPro(false)}
                        style={{ backgroundColor: '#dc262622', borderRadius: 10,
                                 padding: 12, alignItems: 'center',
                                 borderWidth: 1, borderColor: '#dc2626' }}>
                        <Text style={{ color: '#dc2626', fontSize: 14,
                                       fontWeight: '700' }}>🔒 Reset to Free (Test)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Done button */}
                <TouchableOpacity onPress={() => setShowThemeModal(false)}
                  style={{ backgroundColor: theme.accent, borderRadius: 14,
                           padding: 16, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Done</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <AdBanner />
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
