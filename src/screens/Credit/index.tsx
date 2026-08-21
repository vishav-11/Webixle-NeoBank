import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { BOTTOM_TAB_H, Spacing, Typography } from '@/styles/theme';

import {
  useCreditOverview,
  useSupportedCreditAssets,
  useCreditCollateral,
  useCreditRisk,
  useActivateCredit,    
  type CreditAccount,
  type SupportedAsset,
  type CollateralItem,
  type CreditRisk,
} from '@/hooks/queires';

import CreditTabBar, { CreditTab } from './components/CreditTabBar';
import DashboardTab                from './components/DashboardTab';
import AddCollateralTab            from './components/AddCollateralTab';
import RepayTab                    from './components/RepayTab';
import HistoryTab                  from './components/HistoryTab';

export default function CreditScreen() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const router     = useRouter();

  const [activeTab, setActiveTab] = useState<CreditTab>('dashboard');

  // ✅ Track karo ke activate ho chuka hai ya nahi
  const hasActivated = useRef(false);

  const { 
    data: account = null, 
    isLoading: accountLoading, 
    refetch: refetchAccount 
  } = useCreditOverview();

  const { 
    data: assets = [], 
    isLoading: assetsLoading, 
    refetch: refetchAssets 
  } = useSupportedCreditAssets();

  const { 
    data: collaterals = [], 
    isLoading: collateralsLoading, 
    refetch: refetchCollaterals 
  } = useCreditCollateral();

  const { 
    data: risk = null, 
    isLoading: riskLoading, 
    refetch: refetchRisk 
  } = useCreditRisk();

  // ✅ Activate mutation

  // ✅ Core Logic: Sirf ek baar, jab account null ho aur loading khatam ho
  const { mutate: activateCredit } = useActivateCredit();

  // ✅ Sirf ek baar - component mount hote hi hit karo
  useEffect(() => {
    activateCredit();
  }, []);
  const loading = accountLoading && assetsLoading && collateralsLoading && riskLoading;

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchAccount(),
        refetchAssets(),
        refetchCollaterals(),
        refetchRisk(),
      ]);
    } catch (error) {
      console.error('Error refreshing credit data:', error);
    }
  }, [refetchAccount, refetchAssets, refetchCollaterals, refetchRisk]);

  const handleSuccess = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const bottomPad = insets.bottom + BOTTOM_TAB_H + Spacing[4];

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      <LinearGradient
        colors={colors.bgGradient as any}
        locations={colors.bgGradientPos as any}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Credit</Text>
        <View style={s.iconBtn} />
      </View>

      <View style={s.tabWrap}>
        <CreditTabBar active={activeTab} onChange={setActiveTab} />
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' && (
          <DashboardTab
            account={account}
            assets={assets}
            risk={risk}
            loading={loading}
            refreshing={false}
            onRefresh={handleRefresh}
            onAddAsset={() => setActiveTab('add')}
            bottomPad={bottomPad}
          />
        )}
        {activeTab === 'add' && (
          <AddCollateralTab
            assets={assets}
            collaterals={collaterals}
            onSuccess={handleSuccess}
            bottomPad={bottomPad}
          />
        )}
        {activeTab === 'repay' && (
          <RepayTab
            totalOwed={account?.usedCredit ?? 0}
            onSuccess={handleSuccess}
            bottomPad={bottomPad}
          />
        )}
        {activeTab === 'history' && (
          <HistoryTab bottomPad={bottomPad} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  tabWrap:     { paddingTop: Spacing[2] },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontWeight: '700' },
  iconBtn:     { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});