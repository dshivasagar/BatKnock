import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import { getBatPoints, saveBatPoints, generateId } from '../storage/database';

const ZONES = [
  { id: 'sweet-spot', label: 'Sweet Spot', desc: 'Main hitting area — face of bat', color: '#00a884' },
  { id: 'edge', label: 'Edge', desc: 'Longer side edges', color: '#53bdeb' },
  { id: 'toe', label: 'Toe', desc: 'Bottom of the bat', color: '#ffd279' },
  { id: 'top-edge', label: 'Top Edge', desc: 'Top of the bat face', color: '#f15c6d' },
];

export default function BatMapScreen({ navigation, route }) {
  const { theme, fs } = useTheme();
  const bat = route.params?.bat;
  const initialZone = route.params?.selectedZone || 'sweet-spot';
  const [points, setPoints] = useState([]);
  const [activeZone, setActiveZone] = useState(initialZone);

  useFocusEffect(useCallback(() => {
    if (bat?.id) getBatPoints(bat.id).then(p => setPoints(p || []));
  }, []));

  const addHit = async () => {
    const existing = points.find(p => p.zone === activeZone);
    let updated;
    if (existing) {
      updated = points.map(p => p.zone === activeZone ? { ...p, hit_count: p.hit_count + 1 } : p);
    } else {
      updated = [...points, { id: generateId(), zone: activeZone, hit_count: 1 }];
    }
    setPoints(updated);
    await saveBatPoints(bat?.id, updated);
  };

  const reset = () => Alert.alert('Reset Map', 'Clear all hit points?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Reset', style: 'destructive', onPress: async () => { setPoints([]); await saveBatPoints(bat?.id, []); } },
  ]);

  const getCount = (zone) => points.find(p => p.zone === zone)?.hit_count || 0;
  const totalHits = points.reduce((s, p) => s + (p.hit_count || 0), 0);
  const activeColor = ZONES.find(z => z.id === activeZone)?.color || theme.accent;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.text, fontSize: 16 }}>‹</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: theme.text, fontSize: 17, fontWeight: '700' }}>Hit Map</Text>
          <Text style={{ color: theme.textSub, fontSize: 12 }}>{bat?.name} · {totalHits} total hits</Text>
        </View>
        <TouchableOpacity onPress={reset} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bgCard, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.red, fontSize: 11, fontWeight: '700' }}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* Zone Selector */}
        <View style={{ backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 }}>SELECT ZONE TO RECORD HITS</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {ZONES.map(zone => (
              <TouchableOpacity
                key={zone.id}
                onPress={() => setActiveZone(zone.id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, backgroundColor: activeZone === zone.id ? zone.color + '22' : theme.bgInput, borderColor: activeZone === zone.id ? zone.color : theme.border }}>
                <Text style={{ color: activeZone === zone.id ? zone.color : theme.textSub, fontSize: 13, fontWeight: '700' }}>{zone.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Big Record Hit Button */}
        <TouchableOpacity
          onPress={addHit}
          style={{ backgroundColor: activeColor, borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 }}>+ Record Hit</Text>
          <Text style={{ color: '#fff', fontSize: 14, opacity: 0.85 }}>
            {ZONES.find(z => z.id === activeZone)?.label} — {getCount(activeZone)} hits recorded
          </Text>
        </TouchableOpacity>

        {/* Zone breakdown */}
        <Text style={{ color: theme.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 }}>ALL ZONES</Text>
        {ZONES.map(zone => {
          const count = getCount(zone.id);
          const pct = totalHits > 0 ? Math.round(count / totalHits * 100) : 0;
          const isActive = zone.id === activeZone;
          return (
            <TouchableOpacity
              key={zone.id}
              onPress={() => setActiveZone(zone.id)}
              style={{ backgroundColor: theme.bgCard, borderRadius: 16, padding: 18, marginBottom: 10, borderWidth: isActive ? 2 : 1, borderColor: isActive ? zone.color : theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: zone.color }} />
                  <View>
                    <Text style={{ color: theme.text, fontSize: 15, fontWeight: '700' }}>{zone.label}</Text>
                    <Text style={{ color: theme.textSub, fontSize: 12 }}>{zone.desc}</Text>
                  </View>
                </View>
                <Text style={{ color: zone.color, fontSize: 26, fontWeight: '800' }}>{count}</Text>
              </View>
              {count > 0 && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2 }}>
                    <View style={{ height: 4, width: pct + '%', backgroundColor: zone.color, borderRadius: 2 }} />
                  </View>
                  <Text style={{ color: theme.textSub, fontSize: 11, marginTop: 4 }}>{pct}% of total hits</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
