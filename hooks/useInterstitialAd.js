/**
 * hooks/useInterstitialAd.js
 *
 * Loads and shows an interstitial ad after a knocking session ends.
 * Only shown to free users. Silently skipped if ad fails to load.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { usePro } from '../contexts/ProContext';

const INTERSTITIAL_ID = {
  ios:     __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3077501095282358/7282107109',
  android: __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-3077501095282358/7282107109',
};

export function useInterstitialAd() {
  const { isPro } = usePro();
  const [adLoaded, setAdLoaded] = useState(false);
  const adRef = useRef(null);

  useEffect(() => {
    if (isPro) return; // Don't load ads for Pro users

    const unitId = INTERSTITIAL_ID[Platform.OS] || INTERSTITIAL_ID.ios;
    const interstitial = InterstitialAd.createForAdRequest(unitId, {
      requestNonPersonalizedAdsOnly: true,
    });
    adRef.current = interstitial;

    const unsubLoad = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      setAdLoaded(true);
    });
    const unsubClose = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      setAdLoaded(false);
      // Preload next ad
      interstitial.load();
    });

    interstitial.load();

    return () => {
      unsubLoad();
      unsubClose();
    };
  }, [isPro]);

  const showAd = () => {
    if (!isPro && adLoaded && adRef.current) {
      adRef.current.show();
      return true;
    }
    return false;
  };

  return { showAd, adLoaded };
}
