/**
 * contexts/ProContext.js
 *
 * Single source of truth for Knockmate Pro status throughout the app.
 * Currently backed by AsyncStorage (local flag) — swap activatePro and
 * restorePro bodies for RevenueCat SDK calls when API keys are ready.
 *
 * The UpgradeModal is rendered globally here so any screen/component
 * can trigger it with a single showUpgrade() call — no prop drilling.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import UpgradeModal from '../components/UpgradeModal';

const PRO_KEY = 'knockmate_is_pro';

const ProContext = createContext({
  isPro: false,
  showUpgrade:  () => {},
  activatePro:  async () => {},
  deactivatePro: async () => {},
  restorePro:   async () => {},
});

export function ProProvider({ children }) {
  const [isPro,          setIsPro]          = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(PRO_KEY).then(v => {
      setIsPro(v === 'true');
      setLoading(false);
    });
  }, []);

  // ── TODO: Replace body with Purchases.purchaseProduct('knockmate_pro') ──
  const activatePro = async () => {
    await AsyncStorage.setItem(PRO_KEY, 'true');
    setIsPro(true);
    setUpgradeVisible(false);
    Alert.alert(
      '🎉 Welcome to Knockmate Pro!',
      'All features are now unlocked. Thank you for your support.',
    );
  };

  // ── TODO: Replace body with Purchases.restorePurchases() ───────────────
  const restorePro = async () => {
    const val = await AsyncStorage.getItem(PRO_KEY);
    const restored = val === 'true';
    if (restored) { setIsPro(true); setUpgradeVisible(false); }
    Alert.alert(
      restored ? '✅ Pro Restored' : 'No Purchase Found',
      restored
        ? 'Knockmate Pro has been restored successfully.'
        : 'No previous purchase was found for this account.',
    );
  };

  const deactivatePro = async () => {
    await AsyncStorage.setItem(PRO_KEY, 'false');
    setIsPro(false);
  };

  const showUpgrade = () => setUpgradeVisible(true);
  const hideUpgrade = () => setUpgradeVisible(false);

  if (loading) {
    // Still render children during load so the app tree (and ThemeProvider
    // context) is always available. UpgradeModal just won't show yet.
    return (
      <ProContext.Provider value={{ isPro: false, showUpgrade: () => {}, activatePro, deactivatePro, restorePro }}>
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
