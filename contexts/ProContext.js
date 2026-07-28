/**
 * contexts/ProContext.js
 *
 * RevenueCat integration for Knockmate Pro.
 * Falls back to AsyncStorage if RevenueCat native module isn't available
 * (e.g. Expo Go during development — use DEV_MODE in HomeScreen to test).
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import UpgradeModal from '../components/UpgradeModal';

const REVENUECAT_IOS_KEY     = 'appl_pOZOoJvqkneHGkhLcpmsgNLILDn';
const REVENUECAT_ANDROID_KEY = 'goog_QGRBjVJpTsnCmFSFPeksAlItJjO';
const ENTITLEMENT_ID         = 'pro';
const PRO_FALLBACK_KEY       = 'knockmate_is_pro'; // AsyncStorage fallback for Expo Go

const ProContext = createContext({
  isPro:         false,
  showUpgrade:   () => {},
  activatePro:   async () => {},
  deactivatePro: async () => {},
  restorePro:    async () => {},
});

export function ProProvider({ children }) {
  const [isPro,          setIsPro]          = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [rcAvailable,    setRcAvailable]    = useState(false);

  useEffect(() => {
    initRevenueCat();
  }, []);

  const initRevenueCat = async () => {
    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
      await Purchases.configure({
        apiKey: Platform.OS === 'ios' ? REVENUECAT_IOS_KEY : REVENUECAT_ANDROID_KEY,
      });
      setRcAvailable(true);
      await checkProStatus(true);
    } catch (e) {
      // Native module not available (Expo Go) — fall back to AsyncStorage
      console.log('RevenueCat not available, using AsyncStorage fallback:', e.message);
      setRcAvailable(false);
      const val = await AsyncStorage.getItem(PRO_FALLBACK_KEY);
      setIsPro(val === 'true');
    } finally {
      setLoading(false);
    }
  };

  const checkProStatus = async (isRevenueCatReady = rcAvailable) => {
    if (isRevenueCatReady) {
      try {
        const customerInfo = await Purchases.getCustomerInfo();
        setIsPro(customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined);
      } catch (e) {
        console.error('RevenueCat getCustomerInfo error:', e);
      }
    } else {
      const val = await AsyncStorage.getItem(PRO_FALLBACK_KEY);
      setIsPro(val === 'true');
    }
  };

  // ── Purchase ──────────────────────────────────────────────────────────
  const activatePro = async () => {
    if (!rcAvailable) {
      // DEV fallback — no real payment
      await AsyncStorage.setItem(PRO_FALLBACK_KEY, 'true');
      setIsPro(true);
      setUpgradeVisible(false);
      Alert.alert('🎉 Welcome to Knockmate Pro!',
        'All features unlocked. (Dev mode — no payment taken)');
      return;
    }

    try {
      const offerings = await Purchases.getOfferings();
      if (!offerings.current || offerings.current.availablePackages.length === 0) {
        Alert.alert('Not Available',
          'Knockmate Pro is not available right now. Please try again later.');
        return;
      }
      const pkg = offerings.current.availablePackages[0];
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const pro = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(pro);
      if (pro) {
        setUpgradeVisible(false);
        Alert.alert('🎉 Welcome to Knockmate Pro!',
          'All features are now unlocked. Thank you for your support!');
      }
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Failed',
          e.message || 'Something went wrong. Please try again.');
      }
    }
  };

  // ── Restore ───────────────────────────────────────────────────────────
  const restorePro = async () => {
    if (!rcAvailable) {
      const val = await AsyncStorage.getItem(PRO_FALLBACK_KEY);
      const restored = val === 'true';
      if (restored) { setIsPro(true); setUpgradeVisible(false); }
      Alert.alert(
        restored ? '✅ Pro Restored' : 'No Purchase Found',
        restored ? 'Knockmate Pro has been restored.' :
                   'No previous purchase was found for this account.',
      );
      return;
    }

    try {
      const customerInfo = await Purchases.restorePurchases();
      const restored = customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
      setIsPro(restored);
      if (restored) setUpgradeVisible(false);
      Alert.alert(
        restored ? '✅ Pro Restored' : 'No Purchase Found',
        restored ? 'Knockmate Pro has been restored successfully.' :
                   'No previous purchase was found for this account.',
      );
    } catch (e) {
      Alert.alert('Restore Failed', e.message || 'Something went wrong. Please try again.');
    }
  };

  // ── Dev reset (DEV_MODE only) ─────────────────────────────────────────
  const deactivatePro = async () => {
    await AsyncStorage.setItem(PRO_FALLBACK_KEY, 'false');
    setIsPro(false);
  };

  const showUpgrade = () => setUpgradeVisible(true);
  const hideUpgrade = () => setUpgradeVisible(false);

  if (loading) {
    return (
      <ProContext.Provider value={{
        isPro: false, showUpgrade: () => {}, activatePro,
        deactivatePro, restorePro,
      }}>
        {children}
      </ProContext.Provider>
    );
  }

  return (
    <ProContext.Provider value={{ isPro, showUpgrade, activatePro, deactivatePro, restorePro }}>
      {children}
      <UpgradeModal
        visible={upgradeVisible}
        onClose={hideUpgrade}
        onPurchase={activatePro}
        onRestore={restorePro}
      />
    </ProContext.Provider>
  );
}

export const usePro = () => useContext(ProContext);
