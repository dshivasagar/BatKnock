import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import { saveBat, generateId } from '../storage/database';
import {
  getLearnedRateKPM, resolveTarget,
  knocksToMinutes, minutesToKnocks, formatMinutesAsHours,
} from '../utils/targets';

const BAT_SIZES    = ['Size 4', 'Size 5', 'Size 6', 'Harrow', 'SH', 'LH'];
const WILLOW_TYPES = ['Grade 1', 'Grade 2', 'Grade 3', 'Kashmir', 'English'];

export default function CreateBatScreen({ navigation, route }) {
  const { theme, fs } = useTheme();
  const editing = route.params?.bat;

  const [brand,         setBrand]         = useState(editing?.brand         || '');
  const [willowType,    setWillowType]    = useState(editing?.willow_type   || 'Grade 2');
  const [batSize,       setBatSize]       = useState(editing?.bat_size      || 'SH');
  const [weight,        setWeight]        = useState(editing?.weight?.toString()        || '');
  const [grains,        setGrains]        = useState(editing?.grains?.toString()        || '');
  const [notes,         setNotes]         = useState(editing?.notes         || '');
  const [batPurpose,    setBatPurpose]    = useState(editing?.bat_purpose   || 'new_bat');
  const [targetType,    setTargetType]    = useState(editing?.target_type   || 'knock_count');
  const [targetKnocks,  setTargetKnocks]  = useState(editing?.target_knocks?.toString()  || '5000');
  const [targetMinutes, setTargetMinutes] = useState(editing?.target_minutes?.toString() || '120');
  const [saving,        setSaving]        = useState(false);

  // Learned knocks/min, used only to convert the target into the "other"
  // unit for the preview line below the input — never shown as a raw stat.
  const [rateKPM, setRateKPM] = useState(null);
  useEffect(() => {
    getLearnedRateKPM().then(setRateKPM);
  }, []);

  const handleSave = async () => {
    if (!brand.trim()) { Alert.alert('Required', 'Please enter the brand'); return; }
    setSaving(true);
    const rate = rateKPM || (await getLearnedRateKPM());
    const resolved = targetType === 'knock_count'
      ? resolveTarget({ knocks: parseInt(targetKnocks) || 0, rateKPM: rate })
      : resolveTarget({ minutes: parseInt(targetMinutes) || 0, rateKPM: rate });
    const bat = {
      id:            editing?.id || generateId(),
      name:          brand.trim(),
      brand:         brand.trim(),
      willow_type:   willowType,
      bat_size:      batSize,
      weight:        weight  ? parseInt(weight)  : null,
      grains:        grains  ? parseInt(grains)  : null,
      notes:         notes.trim(),
      bat_purpose:      batPurpose,
      target_type:      targetType,
      target_knocks:    resolved.target_knocks,
      target_minutes:   resolved.target_minutes,
      target_rate_used: resolved.target_rate_used,
      total_knocks:  editing?.total_knocks  || 0,
      created_at:    editing?.created_at    || new Date().toISOString(),
    };
    await saveBat(bat);
    setSaving(false);
    navigation.goBack();
  };

  // ── Shared styles (inline — depend on theme) ────────────────────────────
  const label = {
    color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
    marginBottom: 8, marginTop: 18, letterSpacing: 0.8,
  };
  const input = {
    backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
    color: theme.text, fontSize: fs(15), borderWidth: 1, borderColor: theme.border,
  };
  const chip = (active) => ({
    backgroundColor: active ? theme.accentDim : theme.bgCard,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1.5, borderColor: active ? theme.accent : theme.border,
  });
  const chipText = (active) => ({
    color: active ? theme.accent : theme.textSub,
    fontSize: fs(13), fontWeight: active ? '700' : '500',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation}
        title={editing ? 'Edit Bat' : 'Add New Bat'}
        right={
          <TouchableOpacity onPress={handleSave} disabled={saving}
            style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
              backgroundColor: theme.accent,
            }}>
            <Text style={{ color: '#fff', fontSize: fs(14), fontWeight: '800' }}>
              {saving ? 'Saving…' : 'Save'}
            </Text>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Brand */}
        <Text style={label}>BRAND *</Text>
        <TextInput style={input} value={brand} onChangeText={setBrand}
          placeholder="e.g. SG, GM, Kookaburra"
          placeholderTextColor={theme.textMuted} />

        {/* Willow type */}
        <Text style={label}>WILLOW TYPE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {WILLOW_TYPES.map(w => (
            <TouchableOpacity key={w} style={chip(willowType === w)}
              onPress={() => setWillowType(w)}>
              <Text style={chipText(willowType === w)}>{w}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bat size */}
        <Text style={label}>BAT SIZE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BAT_SIZES.map(s => (
            <TouchableOpacity key={s} style={chip(batSize === s)}
              onPress={() => setBatSize(s)}>
              <Text style={chipText(batSize === s)}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weight + grains */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={label}>WEIGHT (G)</Text>
            <TextInput style={input} value={weight} onChangeText={setWeight}
              placeholder="1200" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={label}>GRAIN COUNT</Text>
            <TextInput style={input} value={grains} onChangeText={setGrains}
              placeholder="8" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </View>
        </View>

        {/* Bat purpose — drives which journey phases are shown */}
        <Text style={label}>BAT PURPOSE</Text>
        <View style={{ gap: 8 }}>
          {[
            { id: 'new_bat',       icon: '🏏', title: 'New Bat',        desc: 'Full prep journey — Oiling → Light → Medium → Full knocking' },
            { id: 'season_old',    icon: '🔄', title: 'Season Old Bat', desc: 'Re-season an existing bat — full oiling + knocking journey' },
            { id: 'knocking_only', icon: '🔨', title: 'Knocking Only',  desc: 'No phase guidance — just knock. No oiling, no force targets, no journey steps.' },
          ].map(opt => (
            <TouchableOpacity key={opt.id}
              onPress={() => setBatPurpose(opt.id)}
              style={{
                backgroundColor: batPurpose === opt.id ? theme.accentDim : theme.bgCard,
                borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center',
                borderWidth: 1.5, borderColor: batPurpose === opt.id ? theme.accent : theme.border,
                gap: 12,
              }}>
              <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: batPurpose === opt.id ? theme.accent : theme.text,
                               fontSize: fs(14), fontWeight: '700' }}>{opt.title}</Text>
                <Text style={{ color: theme.textSub, fontSize: fs(11), marginTop: 2 }}>{opt.desc}</Text>
              </View>
              {batPurpose === opt.id && (
                <View style={{ width: 20, height: 20, borderRadius: 10,
                               backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Target type */}
        <Text style={label}>TARGET TYPE</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['knock_count', 'Knock Count'], ['time_based', 'Time Based']].map(([val, lbl]) => (
            <TouchableOpacity key={val} style={chip(targetType === val)}
              onPress={() => setTargetType(val)}>
              <Text style={chipText(targetType === val)}>{lbl}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Target value */}
        {targetType === 'knock_count' ? (
          <>
            <Text style={label}>TARGET KNOCKS</Text>
            <TextInput style={input} value={targetKnocks} onChangeText={setTargetKnocks}
              placeholder="5000" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
            {!!rateKPM && !!parseInt(targetKnocks) && (
              <Text style={{ color: theme.textSub, fontSize: fs(12), marginTop: 8 }}>
                ≈ {formatMinutesAsHours(knocksToMinutes(parseInt(targetKnocks), rateKPM))} at your typical pace
              </Text>
            )}
          </>
        ) : (
          <>
            <Text style={label}>TARGET MINUTES</Text>
            <TextInput style={input} value={targetMinutes} onChangeText={setTargetMinutes}
              placeholder="120" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
            {!!rateKPM && !!parseInt(targetMinutes) && (
              <Text style={{ color: theme.textSub, fontSize: fs(12), marginTop: 8 }}>
                ≈ {minutesToKnocks(parseInt(targetMinutes), rateKPM).toLocaleString()} knocks at your typical pace
              </Text>
            )}
          </>
        )}

        {/* Notes */}
        <Text style={label}>NOTES</Text>
        <TextInput style={[input, { height: 90, textAlignVertical: 'top' }]}
          value={notes} onChangeText={setNotes}
          placeholder="Any notes about this bat..."
          placeholderTextColor={theme.textMuted}
          multiline numberOfLines={3} />

        {/* Save button */}
        <TouchableOpacity onPress={handleSave} disabled={saving}
          style={{
            backgroundColor: theme.accent, borderRadius: 14,
            padding: 18, alignItems: 'center', marginTop: 28,
          }}>
          <Text style={{ color: '#fff', fontSize: fs(16), fontWeight: '800' }}>
            {saving ? 'Saving…' : editing ? 'Update Bat' : 'Create Bat'}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
