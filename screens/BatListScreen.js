import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../ThemeContext';
import NavBar, { NavButton } from '../components/NavBar';
import { getBats, deleteBat } from '../storage/database';
import AppText from '../components/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BatListScreen({ navigation }) {
  const { theme } = useTheme();
  const [bats, setBats] = useState([]);

  const loadBats = async () => { const data = await getBats(); setBats(data.reverse()); };
  useFocusEffect(useCallback(() => { loadBats(); }, []));

  const handleDelete = (bat) => {
    Alert.alert('Delete Bat', `Delete "${bat.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteBat(bat.id); loadBats(); } },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <NavBar navigation={navigation} title="My Bats"
        right={
          <NavButton type="custom" onPress={() => navigation.navigate('CreateBat')} accent>
            <AppText style={{ color: '#000', fontSize: 20, fontWeight: '800', lineHeight: 24 }}>+</AppText>
          </NavButton>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {bats.length === 0 ? (
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <AppText style={{ fontSize: 48, marginBottom: 16 }}>🏏</AppText>
            <AppText style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>No bats yet</AppText>
            <AppText style={{ color: theme.textSub, fontSize: 14, marginTop: 8 }}>Add your first bat to start tracking</AppText>
            <TouchableOpacity onPress={() => navigation.navigate('CreateBat')}
              style={{ backgroundColor: theme.accent, borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12, marginTop: 24 }}>
              <AppText style={{ color: '#000', fontWeight: '800', fontSize: 15 }}>Add First Bat</AppText>
            </TouchableOpacity>
          </View>
        ) : (
          bats.map(bat => {
            const pct = bat.target_knocks ? Math.min((bat.total_knocks || 0) / bat.target_knocks * 100, 100) : 0;
            return (
              <TouchableOpacity key={bat.id}
                style={{ backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.border }}
                onPress={() => navigation.navigate('BatProfile', { bat })}
                onLongPress={() => handleDelete(bat)}>
                <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: theme.bgInput, alignItems: 'center', justifyContent: 'center', marginRight: 14, borderWidth: 1, borderColor: theme.border }}>
                  <AppText style={{ fontSize: 24 }}>🏏</AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <AppText style={{ color: theme.text, fontSize: 17, fontWeight: '800' }}>{bat.name}</AppText>
                    <AppText style={{ color: theme.accent, fontSize: 16, fontWeight: '800' }}>{bat.total_knocks || 0}</AppText>
                  </View>
                  <AppText style={{ color: theme.textSub, fontSize: 14, marginTop: 3 }}>{bat.brand}{bat.willow_type ? ` · ${bat.willow_type}` : ''}</AppText>
                  <View style={{ height: 3, backgroundColor: theme.border, borderRadius: 2, marginTop: 8 }}>
                    <View style={{ height: 3, width: `${pct}%`, backgroundColor: theme.accent, borderRadius: 2 }} />
                  </View>
                  <AppText style={{ color: theme.textSub, fontSize: 11, marginTop: 4 }}>
                    {Math.round(pct)}% · {bat.total_knocks || 0} / {bat.target_knocks || 10000} knocks
                  </AppText>
                </View>
                <AppText style={{ color: theme.textMuted, fontSize: 18, marginLeft: 8 }}>›</AppText>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
