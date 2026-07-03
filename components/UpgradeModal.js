/**
 * components/UpgradeModal.js
 *
 * Global upgrade prompt shown when a free user tries to access a Pro feature.
 * Rendered by ProProvider so any screen can trigger it via showUpgrade().
 *
 * TODO: Connect onPurchase to RevenueCat when API keys are ready.
 */
import React from 'react';
import {
  View, Modal, TouchableOpacity, ScrollView, Text,
} from 'react-native';
import { useTheme } from '../ThemeContext';
import AppText from './AppText';

const PRO_FEATURES = [
  { icon: '🏏', label: 'Unlimited bats',             sub: 'Free plan limited to 2 bats' },
  { icon: '📈', label: 'Full Trends & History',       sub: 'Detailed session history per bat' },
  { icon: '🔥', label: 'Heatmap zone editing',        sub: 'Customise zone boundaries on your photo' },
  { icon: '🤖', label: 'Machine knocking logger',     sub: 'Log externally knocked sessions' },
  { icon: '⏭️', label: 'Phase skip controls',         sub: 'Jump to any prep phase instantly' },
  { icon: '📋', label: 'PDF Preparation Report',      sub: 'Shareable bat certificate for buyers' },
  { icon: '🚫', label: 'No ads — ever',               sub: 'Completely ad-free experience' },
  { icon: '⭐', label: 'All future features',         sub: 'Every update included for free' },
];

export default function UpgradeModal({ visible, onClose, onPurchase, onRestore }) {
  const { theme, fs } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)',
                     justifyContent: 'flex-end' }}>

        {/* Tap outside to dismiss */}
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />

        <View style={{
          backgroundColor: theme.bgCard,
          borderTopLeftRadius: 28, borderTopRightRadius: 28,
          borderWidth: 1, borderColor: theme.border,
          paddingBottom: 44, maxHeight: '88%',
        }}>
          {/* Drag handle */}
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: theme.border,
                         alignSelf: 'center', marginTop: 16, marginBottom: 20 }} />

          <ScrollView showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24 }}>

            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ width: 64, height: 64, borderRadius: 20,
                             backgroundColor: theme.accent,
                             alignItems: 'center', justifyContent: 'center',
                             marginBottom: 14 }}>
                <Text style={{ fontSize: 32 }}>🏏</Text>
              </View>
              <AppText style={{ color: theme.text, fontSize: fs(22),
                                fontWeight: '900', textAlign: 'center' }}>
                Knockmate Pro
              </AppText>
              <View style={{ backgroundColor: `${theme.accent}22`, paddingHorizontal: 14,
                             paddingVertical: 5, borderRadius: 10, marginTop: 8,
                             borderWidth: 1, borderColor: theme.accent }}>
                <AppText style={{ color: theme.accent, fontSize: fs(13), fontWeight: '700' }}>
                  One-time purchase · Not a subscription
                </AppText>
              </View>
            </View>

            {/* Feature list */}
            <View style={{ backgroundColor: theme.bgInput, borderRadius: 16,
                           borderWidth: 1, borderColor: theme.border, marginBottom: 20,
                           overflow: 'hidden' }}>
              {PRO_FEATURES.map((f, i) => (
                <View key={f.label} style={{
                  flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: theme.border,
                }}>
                  <View style={{ width: 36, height: 36, borderRadius: 10,
                                 backgroundColor: `${theme.accent}18`,
                                 alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ color: theme.text, fontSize: fs(14),
                                      fontWeight: '700' }}>{f.label}</AppText>
                    <AppText style={{ color: theme.textSub, fontSize: fs(11),
                                      marginTop: 1 }}>{f.sub}</AppText>
                  </View>
                  <Text style={{ color: '#22c55e', fontSize: fs(14),
                                 fontWeight: '800' }}>✓</Text>
                </View>
              ))}
            </View>

            {/* Purchase button */}
            <TouchableOpacity
              onPress={onPurchase}
              style={{ backgroundColor: theme.accent, borderRadius: 16,
                       padding: 18, alignItems: 'center', marginBottom: 12 }}>
              <AppText style={{ color: '#fff', fontSize: fs(17), fontWeight: '900' }}>
                Unlock Pro — £2.99
              </AppText>
              <AppText style={{ color: 'rgba(255,255,255,0.75)', fontSize: fs(11),
                                marginTop: 3 }}>
                One-time · Pay once, own it forever
              </AppText>
            </TouchableOpacity>

            {/* Restore + dismiss */}
            <TouchableOpacity onPress={onRestore}
              style={{ alignItems: 'center', padding: 12 }}>
              <AppText style={{ color: theme.textMuted, fontSize: fs(13),
                                fontWeight: '600' }}>
                Restore previous purchase
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose}
              style={{ alignItems: 'center', padding: 10, marginBottom: 4 }}>
              <AppText style={{ color: theme.textMuted, fontSize: fs(12) }}>
                Maybe later
              </AppText>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
