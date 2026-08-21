/**
 * app/(screens)/loan.tsx
 */

import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize } from "@/styles/theme";

import {
  useLoanPairs,
  useLoanStats,
  type LoanPair,
  type LoanStats,
} from "@/hooks/queires";

import LoanTabBar, { type TabKey } from "./components/LoanTabBar";
import DashboardTab from "./tabs/DashboardTab";
import AddTab from "./tabs/AddTab";
import RepayTab from "./tabs/RepayTab";
import HistoryTab from "./tabs/HistoryTab";

export default function LoanScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>("dashboard");

  const { 
    data: pairs = [], 
    isLoading: pairsLoading, 
    refetch: refetchPairs 
  } = useLoanPairs();

  const { 
    data: stats = null, 
    isLoading: statsLoading, 
    refetch: refetchStats 
  } = useLoanStats();

  const loading = pairsLoading && statsLoading;
  const paddingBottom = 40 + insets.bottom;

  const handleRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchPairs(), refetchStats()]);
    } catch (error) {
      console.error('Error refreshing loan data:', error);
    }
  }, [refetchPairs, refetchStats]);

  const handleTabPress = useCallback((key: TabKey) => {
    setTab(key);
  }, []);

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[s.iconBtn, { backgroundColor: colors.surface }]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Crypto Loans</Text>
          <View style={{ width: 38 }} />
        </View>
        <LoanTabBar activeTab={tab} onTabPress={handleTabPress} />
        <DashboardTab
          pairs={[]}
          stats={null}
          loading={true}
          refreshing={false}
          onRefresh={() => {}}
          paddingBottom={paddingBottom}
        />
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.canGoBack() ? router.back() : router.push("/")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Crypto Loans</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab Bar */}
      <LoanTabBar activeTab={tab} onTabPress={handleTabPress} />

      {/* Dashboard */}
      <View style={[s.tabContent, tab === "dashboard" ? s.show : s.hide]}>
        <DashboardTab
          pairs={pairs}
          stats={stats}
          loading={false}
          refreshing={false}
          onRefresh={handleRefresh}
          paddingBottom={paddingBottom}
        />
      </View>

      {/* Add */}
      <View style={[s.tabContent, tab === "add" ? s.show : s.hide]}>
        <AddTab paddingBottom={paddingBottom} />
      </View>

      {/* Repay */}
      <View style={[s.tabContent, tab === "repay" ? s.show : s.hide]}>
        <RepayTab paddingBottom={paddingBottom} />
      </View>

      {/* History */}
      <View style={[s.tabContent, tab === "history" ? s.show : s.hide]}>
        <HistoryTab paddingBottom={paddingBottom} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  tabContent: { flex: 1 },
  show: { display: "flex" },
  hide: { display: "none" },
});