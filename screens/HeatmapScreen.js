/**
 * HeatmapScreen.js — BatKnock v1.1.2
 *
 * Bat silhouette heatmap with zone colour logic:
 *   Selected zone:    green → yellow → orange → red based on knock progress
 *   Unselected zones: solid green (not worked on this session)
 *
 *   0–50%   = 🟢 green  (needs more knocking)
 *   50–80%  = 🟡 yellow (good progress)
 *   80–100% = 🟠 orange (almost ready)
 *   100%+   = 🔴 red    (fully knocked in)
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { getBatPoints } from '../storage/database';
import AppText from '../components/AppText';

const ZONE_LABELS = {
  'sweet-spot': 'Sweet Spot',
  'edge':       'Edge',
  'toe':        'Toe',
  'top-edge':   'Top Edge',
};

function heatColour(pct) {
  if (pct >= 100) return '#e53935'; // red
  if (pct >= 80)  return '#fb8c00'; // orange
  if (pct >= 50)  return '#fdd835'; // yellow
  return '#43a047';                  // green
}

const UNSELECTED = '#43a047';

export default function HeatmapScreen({ navigation, route }) {
  const { theme }    = useTheme();
  const bat          = route.params?.bat;
  const selectedZone = route.params?.selectedZone || 'sweet-spot';
  const overallPct   = route.params?.pct || 0;
  const [points, setPoints] = useState([]);

  useFocusEffect(useCallback(() => {
    if (bat?.id) getBatPoints(bat.id).then(p => setPoints(p || []));
  }, []));

  const getCount   = (z) => points.find(p => p.zone === z)?.hit_count || 0;
  const totalTarget = bat?.target_knocks || 5000;
  const zonePct    = (z) => Math.min((getCount(z) / totalTarget) * 100, 100);

  const selPct    = zonePct(selectedZone);
  const selColour = heatColour(selPct);
  const selCount  = getCount(selectedZone);

  const readinessLabel =
    selPct >= 100 ? '✅ Zone Ready'          :
    selPct >= 80  ? '🟠 Almost Ready'        :
    selPct >= 50  ? '🟡 Good Progress'       :
                    '🟢 Needs More Knocking';

  const readinessDesc =
    selPct >= 100 ? 'This zone has been fully knocked in.' :
    selPct >= 80  ? 'A few more sessions will complete this zone.' :
    selPct >= 50  ? 'Keep going — you\'re over halfway.' :
                    'Continue knocking to build up the willow fibres.';

  const zoneOverlay = (zone) => zone === selectedZone
    ? { backgroundColor: selColour,  opacity: 0.80 }
    : { backgroundColor: UNSELECTED, opacity: 0.20 };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>

      <NavBar navigation={navigation} title="Heatmap" subtitle={`${bat?.name} · ${ZONE_LABELS[selectedZone]}`} showHome />

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>

        {/* Readiness card */}
        <View style={{ width: '100%', backgroundColor: theme.bgCard, borderRadius: 16,
                       padding: 18, marginBottom: 24, borderWidth: 2, borderColor: selColour }}>
          <AppText style={{ color: selColour, fontSize: 20, fontWeight: '800' }}>
            {readinessLabel}
          </AppText>
          <AppText style={{ color: theme.textSub, fontSize: 13, marginTop: 4 }}>
            {readinessDesc}
          </AppText>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <AppText style={{ color: theme.textMuted, fontSize: 13 }}>Zone progress</AppText>
            <AppText style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
              {selCount} knocks · {selPct.toFixed(0)}%
            </AppText>
          </View>
          <View style={{ height: 8, backgroundColor: theme.border, borderRadius: 4, marginTop: 8 }}>
            <View style={{ height: 8, width: `${selPct}%`,
                           backgroundColor: selColour, borderRadius: 4 }} />
          </View>
        </View>

        {/* Bat silhouette */}
        <View style={{ alignItems: 'center', marginBottom: 28 }}>

          {/* Handle */}
          <View style={{ width: 22, height: 56, borderRadius: 11, alignSelf: 'center',
                         backgroundColor: theme.bgCard,
                         borderWidth: 1.5, borderColor: theme.border }} />

          {/* Blade */}
          <View style={{ width: 200, borderRadius: 24, overflow: 'hidden',
                         borderWidth: 1.5, borderColor: theme.border,
                         backgroundColor: theme.bgCard }}>

            {/* Top Edge */}
            <View style={{ height: 52, justifyContent: 'center', alignItems: 'center',
                           borderBottomWidth: 1, borderBottomColor: theme.border,
                           position: 'relative' }}>
              <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                            zoneOverlay('top-edge')]} />
              <AppText style={{ color: theme.text, fontSize: 11, fontWeight: '700', zIndex: 1 }}>
                Top Edge
              </AppText>
              {selectedZone === 'top-edge' && (
                <AppText style={{ color: theme.text, fontSize: 10, zIndex: 1 }}>
                  {selCount} knocks
                </AppText>
              )}
            </View>

            {/* Middle: Edge | Sweet Spot | Edge */}
            <View style={{ flexDirection: 'row', height: 200 }}>
              {/* Left edge */}
              <View style={{ width: 48, justifyContent: 'center', alignItems: 'center',
                             borderRightWidth: 1, borderRightColor: theme.border,
                             position: 'relative' }}>
                <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                              zoneOverlay('edge')]} />
                <AppText style={{ color: theme.text, fontSize: 9, fontWeight: '700', zIndex: 1,
                               transform: [{ rotate: '-90deg' }] }}>EDGE</AppText>
              </View>

              {/* Sweet Spot */}
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center',
                             position: 'relative' }}>
                <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                              zoneOverlay('sweet-spot')]} />
                <AppText style={{ color: theme.text, fontSize: 13, fontWeight: '800', zIndex: 1 }}>
                  Sweet Spot
                </AppText>
                <AppText style={{ color: theme.textSub, fontSize: 11, zIndex: 1, marginTop: 4 }}>
                  {selectedZone === 'sweet-spot'
                    ? `${selCount} knocks`
                    : ZONE_LABELS[selectedZone] + ' selected'}
                </AppText>
              </View>

              {/* Right edge */}
              <View style={{ width: 48, justifyContent: 'center', alignItems: 'center',
                             borderLeftWidth: 1, borderLeftColor: theme.border,
                             position: 'relative' }}>
                <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                              zoneOverlay('edge')]} />
                <AppText style={{ color: theme.text, fontSize: 9, fontWeight: '700', zIndex: 1,
                               transform: [{ rotate: '90deg' }] }}>EDGE</AppText>
              </View>
            </View>

            {/* Toe */}
            <View style={{ height: 52, justifyContent: 'center', alignItems: 'center',
                           borderTopWidth: 1, borderTopColor: theme.border,
                           position: 'relative' }}>
              <View style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
                            zoneOverlay('toe')]} />
              <AppText style={{ color: theme.text, fontSize: 11, fontWeight: '700', zIndex: 1 }}>
                Toe
              </AppText>
              {selectedZone === 'toe' && (
                <AppText style={{ color: theme.text, fontSize: 10, zIndex: 1 }}>
                  {selCount} knocks
                </AppText>
              )}
            </View>
          </View>
        </View>

        {/* Colour guide */}
        <View style={{ width: '100%', marginBottom: 24 }}>
          <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700',
                         letterSpacing: 0.5, marginBottom: 10 }}>ZONE COLOUR GUIDE</AppText>
          {[
            { colour: '#43a047', label: 'Green',  range: '0–50%',   desc: 'Needs more knocking' },
            { colour: '#fdd835', label: 'Yellow', range: '50–80%',  desc: 'Good progress' },
            { colour: '#fb8c00', label: 'Orange', range: '80–100%', desc: 'Almost ready' },
            { colour: '#e53935', label: 'Red',    range: '100%+',   desc: 'Fully knocked in' },
          ].map(({ colour, label, range, desc }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12,
                                       marginBottom: 8, backgroundColor: theme.bgCard,
                                       borderRadius: 12, padding: 12,
                                       borderWidth: 1, borderColor: theme.border }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colour }} />
              <View>
                <AppText style={{ color: theme.text, fontSize: 13, fontWeight: '700' }}>
                  {label} · {range}
                </AppText>
                <AppText style={{ color: theme.textSub, fontSize: 12 }}>{desc}</AppText>
              </View>
            </View>
          ))}
        </View>

        {/* All zones summary */}
        <View style={{ width: '100%' }}>
          <AppText style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700',
                         letterSpacing: 0.5, marginBottom: 10 }}>ALL ZONES</AppText>
          {['top-edge', 'sweet-spot', 'edge', 'toe'].map(zone => {
            const count   = getCount(zone);
            const pct     = zonePct(zone);
            const colour  = zone === selectedZone ? heatColour(pct) : UNSELECTED;
            const isTarget = zone === selectedZone;
            return (
              <View key={zone} style={{ backgroundColor: theme.bgCard, borderRadius: 14,
                                        padding: 14, marginBottom: 8,
                                        flexDirection: 'row', alignItems: 'center',
                                        borderWidth: isTarget ? 2 : 1,
                                        borderColor: isTarget ? colour : theme.border }}>
                <View style={{ width: 12, height: 12, borderRadius: 6,
                               backgroundColor: colour, marginRight: 12,
                               opacity: isTarget ? 1 : 0.35 }} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ color: theme.text, fontSize: 14, fontWeight: '700' }}>
                    {ZONE_LABELS[zone]}{isTarget ? '  ← Selected' : ''}
                  </AppText>
                  <AppText style={{ color: theme.textSub, fontSize: 12, marginTop: 2 }}>
                    {isTarget
                      ? `${count} knocks · ${pct.toFixed(0)}% of target`
                      : 'Not selected for this session'}
                  </AppText>
                </View>
                {isTarget && (
                  <AppText style={{ color: colour, fontSize: 18, fontWeight: '800' }}>
                    {pct.toFixed(0)}%
                  </AppText>
                )}
              </View>
            );
          })}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
