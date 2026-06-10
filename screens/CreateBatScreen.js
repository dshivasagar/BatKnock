import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Alert,
} from 'react-native';
import { saveBat, generateId } from '../storage/database';
import { useTheme } from '../ThemeContext';
import NavBar, { NavButton } from '../components/NavBar';
import AppText from '../components/AppText';

const BAT_SIZES = ['Size 4', 'Size 5', 'Size 6', 'Harrow', 'SH', 'LH'];
const WILLOW_TYPES = ['English', 'Kashmir'];

export default function CreateBatScreen({ navigation, route }) {
  const { theme } = useTheme();
  const editing = route.params?.bat;

  const [name,          setName]          = useState(editing?.name || '');
  const [brand,         setBrand]         = useState(editing?.brand || '');
  const [willowType,    setWillowType]    = useState(editing?.willow_type || 'English');
  const [batSize,       setBatSize]       = useState(editing?.bat_size || 'SH');
  const [weight,        setWeight]        = useState(editing?.weight?.toString() || '');
  const [grains,        setGrains]        = useState(editing?.grains?.toString() || '');
  const [notes,         setNotes]         = useState(editing?.notes || '');
  const [targetType,    setTargetType]    = useState(editing?.target_type || 'knock_count');
  const [targetKnocks,  setTargetKnocks]  = useState(editing?.target_knocks?.toString() || '5000');
  const [targetMinutes, setTargetMinutes] = useState(editing?.target_minutes?.toString() || '120');
  const [saving,        setSaving]        = useState(false);

  const handleSave = async () => {
    if (!name.trim())  { Alert.alert('Required', 'Please enter a bat name'); return; }
    if (!brand.trim()) { Alert.alert('Required', 'Please enter the brand');  return; }
    setSaving(true);
    const bat = {
      id:           editing?.id || generateId(),
      name:         name.trim(),
      brand:        brand.trim(),
      willow_type:  willowType,
      bat_size:     batSize,
      weight:       weight  ? parseInt(weight)  : null,
      grains:       grains  ? parseInt(grains)  : null,
      notes:        notes.trim(),
      target_type:  targetType,
      target_knocks:   targetType === 'knock_count' ? parseInt(targetKnocks)  : null,
      target_minutes:  targetType === 'time_based'  ? parseInt(targetMinutes) : null,
      total_knocks: editing?.total_knocks || 0,
      created_at:   editing?.created_at  || new Date().toISOString(),
    };
    await saveBat(bat);
    setSaving(false);
    navigation.goBack();
  };

  const chip = (active) => ({
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1.5,
    backgroundColor: active ? theme.accentDim : theme.bgInput,
    borderColor:     active ? theme.accent    : theme.border,
  });
  const chipTxt = (active) => ({
    fontSize: 13, fontWeight: '700',
    color: active ? theme.accent : theme.textSub,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title={editing ? 'Edit Bat' : 'New Bat'}
        right={
          <TouchableOpacity onPress={handleSave} disabled={saving}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                     backgroundColor: theme.accentDim, borderWidth: 1, borderColor: theme.accent }}>
            <AppText style={{ color: theme.accent, fontSize: 15, fontWeight: '700' }}>
              {saving ? 'Saving…' : 'Save'}
            </AppText>
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 20 }}>

        {/* Bat Name */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 8 }}>
          BAT NAME *
        </AppText>
        <TextInput
          style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                   color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
          value={name} onChangeText={setName}
          placeholder="e.g. My SG Scorer"
          placeholderTextColor={theme.textMuted} />

        {/* Brand */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
          BRAND *
        </AppText>
        <TextInput
          style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                   color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
          value={brand} onChangeText={setBrand}
          placeholder="e.g. SG, GM, Kookaburra"
          placeholderTextColor={theme.textMuted} />

        {/* Willow Type */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
          WILLOW TYPE
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {WILLOW_TYPES.map(w => (
            <TouchableOpacity key={w} style={chip(willowType === w)}
              onPress={() => setWillowType(w)}>
              <AppText style={chipTxt(willowType === w)}>{w}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bat Size */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
          BAT SIZE
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {BAT_SIZES.map(s => (
            <TouchableOpacity key={s} style={chip(batSize === s)}
              onPress={() => setBatSize(s)}>
              <AppText style={chipTxt(batSize === s)}>{s}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weight + Grains */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
          <View style={{ flex: 1 }}>
            <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                           letterSpacing: 0.5, marginBottom: 8 }}>WEIGHT (g)</AppText>
            <TextInput
              style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                       color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
              value={weight} onChangeText={setWeight}
              placeholder="1200" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                           letterSpacing: 0.5, marginBottom: 8 }}>GRAIN COUNT</AppText>
            <TextInput
              style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                       color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
              value={grains} onChangeText={setGrains}
              placeholder="8" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </View>
        </View>

        {/* Target Type */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
          TARGET TYPE
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {[['knock_count','Knock Count'],['time_based','Time Based']].map(([val, lbl]) => (
            <TouchableOpacity key={val} style={chip(targetType === val)}
              onPress={() => setTargetType(val)}>
              <AppText style={chipTxt(targetType === val)}>{lbl}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {targetType === 'knock_count' ? (
          <>
            <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                           letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
              TARGET KNOCKS
            </AppText>
            <TextInput
              style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                       color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
              value={targetKnocks} onChangeText={setTargetKnocks}
              placeholder="5000" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </>
        ) : (
          <>
            <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                           letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
              TARGET MINUTES
            </AppText>
            <TextInput
              style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                       color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border }}
              value={targetMinutes} onChangeText={setTargetMinutes}
              placeholder="120" placeholderTextColor={theme.textMuted}
              keyboardType="numeric" />
          </>
        )}

        {/* Notes */}
        <AppText style={{ color: theme.textMuted, fontSize: 12, fontWeight: '700',
                       letterSpacing: 0.5, marginBottom: 8, marginTop: 20 }}>
          NOTES
        </AppText>
        <TextInput
          style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                   color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border,
                   height: 80, textAlignVertical: 'top' }}
          value={notes} onChangeText={setNotes}
          placeholder="Any notes about this bat…"
          placeholderTextColor={theme.textMuted}
          multiline numberOfLines={3} />

        {/* Save button */}
        <TouchableOpacity
          style={{ backgroundColor: theme.accent, borderRadius: 14, padding: 16,
                   alignItems: 'center', marginTop: 30 }}
          onPress={handleSave} disabled={saving}>
          <AppText style={{ color: '#000', fontSize: 16, fontWeight: '800' }}>
            {saving ? 'Saving…' : editing ? 'Update Bat' : 'Save Bat'}
          </AppText>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
