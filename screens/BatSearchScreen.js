import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../ThemeContext';
import NavBar from '../components/NavBar';
import AppText from '../components/AppText';

const SIZES    = ['SH', 'Harrow', '6', '5', '4', '3', '2', '1'];
const PICKUPS  = ['Low', 'Mid', 'High'];
const SPOTS    = ['Low', 'Mid', 'High'];
const WILLOWS  = ['English', 'Kashmir'];

export default function BatSearchScreen({ navigation }) {
  const { theme, fs } = useTheme();
  const [size,       setSize]       = useState('');
  const [weight,     setWeight]     = useState('');
  const [pickup,     setPickup]     = useState('');
  const [sweetSpot,  setSweetSpot]  = useState('');
  const [willowType, setWillowType] = useState('');
  const [batProfile, setBatProfile] = useState('');

  const buildQuery = () => {
    const parts = ['cricket bat'];
    if (size)       parts.push(size === 'SH' ? 'Short Handle' : `size ${size}`);
    if (weight)     parts.push(`${weight}g`);
    if (pickup)     parts.push(`${pickup.toLowerCase()} pickup`);
    if (sweetSpot)  parts.push(`${sweetSpot.toLowerCase()} sweet spot`);
    if (willowType) parts.push(`${willowType} willow`);
    if (batProfile) parts.push(batProfile);
    return parts.join(' ');
  };

  const canSearch = size || weight || pickup || sweetSpot || willowType || batProfile;

  const openGoogle = () => {
    if (!canSearch) { Alert.alert('Add details', 'Fill in at least one field to search.'); return; }
    const q = encodeURIComponent(buildQuery());
    Linking.openURL(`https://www.google.com/search?q=${q}`);
  };

  const openShopping = () => {
    if (!canSearch) { Alert.alert('Add details', 'Fill in at least one field to search.'); return; }
    const q = encodeURIComponent(buildQuery());
    Linking.openURL(`https://www.google.com/search?tbm=shop&q=${q}`);
  };

  const OptionRow = ({ label, options, value, onSelect }) => (
    <View style={{ marginBottom: 20 }}>
      <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                        letterSpacing: 0.5, marginBottom: 10 }}>{label}</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map(opt => (
          <TouchableOpacity key={opt} onPress={() => onSelect(value === opt ? '' : opt)}
            style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
                     backgroundColor: value === opt ? `${theme.accent}22` : theme.bgInput,
                     borderWidth: 1.5,
                     borderColor: value === opt ? theme.accent : theme.border }}>
            <AppText style={{ color: value === opt ? theme.accent : theme.text,
                              fontSize: fs(13), fontWeight: '600' }}>{opt}</AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="Bat Search" showHome />
      <ScrollView contentContainerStyle={{ padding: 16 }}>

        <AppText style={{ color: theme.textSub, fontSize: fs(13), marginBottom: 20, lineHeight: 20 }}>
          Fill in your preferences and search Google or Google Shopping to find the right bat.
        </AppText>

        {/* Bat Size */}
        <OptionRow label="BAT SIZE" options={SIZES} value={size} onSelect={setSize} />

        {/* Weight */}
        <View style={{ marginBottom: 20 }}>
          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                            letterSpacing: 0.5, marginBottom: 10 }}>WEIGHT (GRAMS)</AppText>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="e.g. 1180"
            placeholderTextColor={theme.textMuted}
            style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                     color: theme.text, fontSize: fs(15),
                     borderWidth: 1, borderColor: theme.border }} />
        </View>

        {/* Pickup */}
        <OptionRow label="PICKUP" options={PICKUPS} value={pickup} onSelect={setPickup} />

        {/* Sweet Spot */}
        <OptionRow label="SWEET SPOT" options={SPOTS} value={sweetSpot} onSelect={setSweetSpot} />

        {/* Willow Type */}
        <OptionRow label="WILLOW TYPE" options={WILLOWS} value={willowType} onSelect={setWillowType} />

        {/* Bat Profile */}
        <View style={{ marginBottom: 24 }}>
          <AppText style={{ color: theme.textMuted, fontSize: fs(11), fontWeight: '700',
                            letterSpacing: 0.5, marginBottom: 10 }}>BAT PROFILE (OPTIONAL)</AppText>
          <TextInput
            value={batProfile}
            onChangeText={setBatProfile}
            placeholder="e.g. all-round, power hitter, Grade 1"
            placeholderTextColor={theme.textMuted}
            style={{ backgroundColor: theme.bgInput, borderRadius: 12, padding: 14,
                     color: theme.text, fontSize: fs(14),
                     borderWidth: 1, borderColor: theme.border }} />
        </View>

        {/* Query preview */}
        {canSearch && (
          <View style={{ backgroundColor: theme.bgCard, borderRadius: 12, padding: 14,
                         marginBottom: 20, borderWidth: 1, borderColor: theme.border }}>
            <AppText style={{ color: theme.textMuted, fontSize: fs(10), fontWeight: '700',
                              letterSpacing: 0.5, marginBottom: 4 }}>SEARCH QUERY</AppText>
            <AppText style={{ color: theme.text, fontSize: fs(13) }}>{buildQuery()}</AppText>
          </View>
        )}

        {/* Search buttons */}
        <TouchableOpacity onPress={openShopping}
          style={{ backgroundColor: theme.accent, borderRadius: 14, padding: 16,
                   alignItems: 'center', marginBottom: 10 }}>
          <AppText style={{ color: '#fff', fontSize: fs(15), fontWeight: '800' }}>
            🛒 Search Google Shopping
          </AppText>
        </TouchableOpacity>

        <TouchableOpacity onPress={openGoogle}
          style={{ backgroundColor: theme.bgCard, borderRadius: 14, padding: 16,
                   alignItems: 'center', borderWidth: 1, borderColor: theme.border,
                   marginBottom: 30 }}>
          <AppText style={{ color: theme.text, fontSize: fs(15), fontWeight: '700' }}>
            🔍 Search Google
          </AppText>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
