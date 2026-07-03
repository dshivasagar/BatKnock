/**
 * components/AdBanner.js
 *
 * Placeholder banner shown to free users at the bottom of key screens.
 * Returns null for Pro users — completely invisible.
 *
 * TODO: Replace the inner View with AdMob <BannerAd /> when keys are ready:
 *   import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
 *   <BannerAd unitId={AD_UNIT_ID} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} />
 */
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../ThemeContext';
import AppText from './AppText';
import { usePro } from '../contexts/ProContext';

export default function AdBanner() {
  const { isPro, showUpgrade } = usePro();
  const { theme, fs } = useTheme();

  if (isPro) return null;

  return (
    <TouchableOpacity onPress={showUpgrade} activeOpacity={0.85}>
      <View style={{
        backgroundColor: theme.bgCard,
        borderTopWidth: 1, borderTopColor: theme.border,
        paddingVertical: 10, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', gap: 12,
      }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ color: theme.textSub, fontSize: fs(11), lineHeight: 16 }}>
            📣 Ad placeholder — AdMob banner goes here
          </AppText>
          <AppText style={{ color: theme.textMuted, fontSize: fs(10) }}>
            Upgrade to Pro to remove ads
          </AppText>
        </View>
        <View style={{ backgroundColor: `${theme.accent}22`, paddingHorizontal: 10,
                       paddingVertical: 5, borderRadius: 8,
                       borderWidth: 1, borderColor: theme.accent }}>
          <AppText style={{ color: theme.accent, fontSize: fs(11), fontWeight: '700' }}>
            Go Pro
          </AppText>
        </View>
      </View>
    </TouchableOpacity>
  );
}
