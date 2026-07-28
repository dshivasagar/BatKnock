/**
 * components/AdBanner.js
 *
 * Real AdMob banner for free users. Returns null for Pro users.
 * Uses test IDs in development, real IDs in production.
 *
 * GDPR: requestNonPersonalizedAdsOnly is set to true by default.
 * The UMP consent flow in App.js handles personalised ads opt-in.
 */
import React, { useState } from 'react';
import { View, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { usePro } from '../contexts/ProContext';

const BANNER_ID = {
  ios:     __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-3077501095282358/1023021753',
  android: __DEV__ ? TestIds.ADAPTIVE_BANNER : 'ca-app-pub-3077501095282358/1023021753',
};

export default function AdBanner() {
  const { isPro } = usePro();
  const [adFailed, setAdFailed] = useState(false);

  if (isPro || adFailed) return null;

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <BannerAd
        unitId={BANNER_ID[Platform.OS] || BANNER_ID.ios}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
        onAdFailedToLoad={() => setAdFailed(true)}
      />
    </View>
  );
}
