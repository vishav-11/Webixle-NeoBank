/**
 * src/screens/CryptoLoans/tabs/HistoryTab.tsx
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from "@/styles/theme";
import loanService from "@/services/loanService";
import type { LoanData, LoanStats } from "@/types/loanType";

const ASSET_COLORS: Record<string, { bg: string; text: string }> = {
  BTC:   { bg: "#f7931a", text: "#fff" },
  ETH:   { bg: "#627eea", text: "#fff" },
  USDT:  { bg: "#26a17b", text: "#fff" },
  USDC:  { bg: "#2775ca", text: "#fff" },
  BNB:   { bg: "#f3ba2f", text: "#000" },
  SOL:   { bg: "#9945ff", text: "#fff" },
  TRX:   { bg: "#ef0027", text: "#fff" },
  XRP:   { bg: "#23292f", text: "#fff" },
  ADA:   { bg: "#0033ad", text: "#fff" },
  DOT:   { bg: "#e6007a", text: "#fff" },
  MATIC: { bg: "#8247e5", text: "#fff" },
};

const assetColor = (sym: string) =>
  ASSET_COLORS[sym?.toUpperCase()] ?? { bg: "#3D6170", text: "#fff" };

// ✅ Status config — theme colors se nahi, apne fixed colors hain kyunki ye
// status indicator hain (har theme me same dikhna chahiye)
const STATUS_CFG = {
  ACTIVE:     { label: "Active",     colorKey: "accent"  },
  REPAID:     { label: "Repaid",     colorKey: "primary" },
  LIQUIDATED: { label: "Liquidated", colorKey: "red"     },
  CLOSED:     { label: "Closed",     colorKey: "text3"   },
} as const;

type FilterTab = "ALL" | "ACTIVE" | "COMPLETED";

const fmt = (n?: number | string | null, prefix = "") => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${prefix}${(v / 1e3).toFixed(1)}k`;
  return `${prefix}${v.toFixed(2)}`;
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, "0")}/${dt.getFullYear()}`;
};

const collSymbol = (loan: LoanData) =>
  typeof loan.collateralAsset === "object"
    ? (loan.collateralAsset as any).symbol ?? "?" : "?";

const borSymbol = (loan: LoanData) =>
  typeof loan.borrowAsset === "object"
    ? (loan.borrowAsset as any).symbol ?? "?" : "?";

// ─── Loan Card ────────────────────────────────────────────────────────────────
function LoanCard({
  loan, colors, selected, onPress,
}: {
  loan: LoanData;
  colors: ColorScheme;
  selected: boolean;
  onPress: () => void;
}) {
  const cSym   = collSymbol(loan);
  const bSym   = borSymbol(loan);
  const cClr   = assetColor(cSym);
  const bClr   = assetColor(bSym);

  const statusCfg = STATUS_CFG[loan.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.CLOSED;
  const statusColor = colors[statusCfg.colorKey as keyof ColorScheme] as string;
  const statusDimColor = colors[`${statusCfg.colorKey}Dim` as keyof ColorScheme] as string 
    ?? `${statusColor}20`;

  return (
    <TouchableOpacity
      style={[
        h.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.accentBorder : colors.border,
        },
        selected && { backgroundColor: colors.accentDim },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Top row: assets + status */}
      <View style={h.cardRow}>
        <View style={h.assetIcons}>
          <View style={[h.assetBadge, { backgroundColor: cClr.bg }]}>
            <Text style={[h.assetBadgeText, { color: cClr.text }]}>{cSym}</Text>
          </View>
          <View style={[h.assetBadge, h.assetBadgeRight, { backgroundColor: bClr.bg }]}>
            <Text style={[h.assetBadgeText, { color: bClr.text }]}>{bSym}</Text>
          </View>
          <View style={[h.swapIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="swap-horizontal" size={IconSize.xs} color={colors.text2} />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: Spacing[2] }}>
          <Text style={[h.pairTitle, { color: colors.text }]}>{cSym} — {bSym}</Text>
          <Text style={[h.pairDate, { color: colors.text2 }]}>{fmtDate(loan.createdAt)}</Text>
        </View>

        <View style={[h.statusBadge, { 
          borderColor: statusColor, 
          backgroundColor: statusDimColor,
        }]}>
          <Text style={[h.statusText, { color: statusColor }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Collateral / Borrowed */}
      <View style={[h.dividerRow, { borderTopColor: colors.borderSoft }]}>
        <View style={h.halfCol}>
          <Text style={[h.miniLabel, { color: colors.text3 }]}>Collateral</Text>
          <Text style={[h.bigVal, { color: colors.text }]}>
            {Number(loan.collateralAmount).toFixed(4)} {cSym}
          </Text>
          <Text style={[h.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.collateralUsd, "$")}
          </Text>
        </View>
        <View style={[h.vertDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={[h.halfCol, { alignItems: "flex-end" }]}>
          <Text style={[h.miniLabel, { color: colors.text3 }]}>Borrowed</Text>
          <Text style={[h.bigVal, { color: colors.text }]}>
            {Number(loan.borrowedAmount).toFixed(4)} {bSym}
          </Text>
          <Text style={[h.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.borrowedUsd, "$")}
          </Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={[h.statsRow, { borderTopColor: colors.borderSoft }]}>
        <View style={h.statItem}>
          <Text style={[h.statLabel, { color: colors.text3 }]}>APR</Text>
          <Text style={[h.statVal, { color: colors.text }]}>{loan.interestRate}%</Text>
        </View>
        <View style={[h.statDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={h.statItem}>
          <Text style={[h.statLabel, { color: colors.text3 }]}>LTV</Text>
          <Text style={[h.statVal, { color: colors.text }]}>{loan.ltv}%</Text>
        </View>
        <View style={[h.statDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={h.statItem}>
          <Text style={[h.statLabel, { color: colors.text3 }]}>Interest</Text>
          <Text style={[h.statVal, { color: colors.text }]}>
            {Number(loan.totalInterestAccrued).toFixed(4)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { paddingBottom: number; }

// ─── Main ─────────────────────────────────────────────────────────────────────
const HistoryTab: React.FC<Props> = ({ paddingBottom }) => {
  const { colors } = useTheme();
  const router = useRouter();

  const [loans,      setLoans]      = useState<LoanData[]>([]);
  const [stats,      setStats]      = useState<LoanStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState<FilterTab>("ALL");
  const [selLoan,    setSelLoan]    = useState<LoanData | null>(null);

const load = useCallback(async (isRefresh = false) => {
  if (isRefresh) setRefreshing(true);
  else setLoading(true);
  try {
    const [active, completed, statsData] = await Promise.allSettled([
      loanService.getMyLoans(),
      loanService.getCompleted(),
      loanService.getStats(),
    ]);
    
    // ✅ Merge + deduplicate by _id
    const activeLoans = active.status === "fulfilled" ? active.value : [];
    const completedLoans = completed.status === "fulfilled" ? completed.value : [];
    
    const allLoans = [...activeLoans, ...completedLoans];
    const uniqueLoans = Array.from(
      new Map(allLoans.map(loan => [loan._id, loan])).values()
    );
    
    setLoans(uniqueLoans);
    if (statsData.status === "fulfilled") setStats(statsData.value);
  } catch {
    setLoans([]);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, []);

  useEffect(() => { load(); }, [load]);

  const activeCount    = loans.filter(l => l.status === "ACTIVE").length;
  const completedCount = loans.filter(l => l.status !== "ACTIVE").length;
  const allCount       = loans.length;

  const filtered = loans.filter(l => {
    if (filter === "ACTIVE")    return l.status === "ACTIVE";
    if (filter === "COMPLETED") return l.status !== "ACTIVE";
    return true;
  });

  const handleCardPress = (loan: LoanData) => {
    router.push({ pathname: "/loanDetails", params: { loanId: loan._id } });
  };

  if (loading) {
    return (
      <View style={h.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={h.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
        {/* ── Stats Banner ── */}
        <View style={[h.statsBanner, { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
        }]}>
          <View style={h.bannerItem}>
            <Text style={[h.bannerLabel, { color: colors.text2 }]}>Total Borrowed</Text>
            <Text style={[h.bannerVal, { color: colors.text }]}>
              {fmt(stats?.totalBorrowedUsd, "$")}
            </Text>
          </View>
          <View style={[h.bannerDivider, { backgroundColor: colors.borderSoft }]} />
          <View style={h.bannerItem}>
            <Text style={[h.bannerLabel, { color: colors.text2 }]}>Active Loans</Text>
            <Text style={[h.bannerVal, { color: colors.text }]}>
              {stats?.activeLoans ?? 0}
            </Text>
          </View>
          <View style={[h.bannerDivider, { backgroundColor: colors.borderSoft }]} />
          <View style={h.bannerItem}>
            <Text style={[h.bannerLabel, { color: colors.text2 }]}>Avg APR</Text>
            <Text style={[h.bannerVal, { color: colors.text }]}>
              {(stats?.avgInterestRate ?? 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        <View style={[h.section, { paddingHorizontal: Spacing[4] }]}>
          <Text style={[h.sectionTitle, { color: colors.text }]}>Loan History</Text>

          {/* ── Filter Tabs ── */}
          <View style={h.tabRow}>
            {([
              { key: "ALL",       label: `All (${allCount})`             },
              { key: "ACTIVE",    label: `Active (${activeCount})`       },
              { key: "COMPLETED", label: `Completed (${completedCount})` },
            ] as { key: FilterTab; label: string }[]).map(t => {
              const isActive = filter === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    h.tabBtn,
                    { borderColor: isActive ? colors.accentBorder : colors.border },
                    isActive && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => { setFilter(t.key); setSelLoan(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[h.tabTxt, { 
                    color: isActive ? colors.accent : colors.text2 
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Loan List ── */}
          {filtered.length === 0 ? (
            <View style={h.empty}>
              <View style={[h.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="document-outline" size={IconSize.xl} color={colors.accent} />
              </View>
              <Text style={[h.emptyTitle, { color: colors.text }]}>No loans found</Text>
              <Text style={[h.emptyText, { color: colors.text2 }]}>
                Your loan history will appear here
              </Text>
            </View>
          ) : (
            filtered.map(loan => (
              <LoanCard
                key={loan._id}
                loan={loan}
                colors={colors}
                selected={selLoan?._id === loan._id}
                onPress={() => handleCardPress(loan)}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default HistoryTab;

const h = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // ── Stats Banner ──
  statsBanner: {
    flexDirection: "row",
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
  },
  bannerItem:    { flex: 1, alignItems: "center" },
  bannerLabel:   { fontSize: Typography.xs, fontWeight: "500", marginBottom: 4 },
  bannerVal:     { fontSize: Typography.md, fontWeight: "700" },
  bannerDivider: { width: 1, alignSelf: "stretch" },

  // ── Section ──
  section:      { paddingTop: Spacing[5] },
  sectionTitle: { 
    fontSize: Typography["2xl"], 
    fontWeight: "700", 
    marginBottom: Spacing[4],
  },

  // ── Filter Tabs ──
  tabRow: { flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[4] },
  tabBtn: { 
    paddingHorizontal: Spacing[3], 
    paddingVertical: Spacing[2], 
    borderRadius: Radius.full, 
    borderWidth: 1.5,
  },
  tabTxt: { fontSize: Typography.sm, fontWeight: "600" },

  // ── Loan Card ──
  card:    { 
    borderRadius: Radius["2xl"], 
    borderWidth: 1, 
    marginBottom: Spacing[3], 
    overflow: "hidden",
  },
  cardRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    padding: Spacing[4],
  },

  // Asset badges
  assetIcons:      { flexDirection: "row", alignItems: "center", position: "relative" },
  assetBadge:      { 
    width: 44, height: 44, borderRadius: 22, 
    alignItems: "center", justifyContent: "center",
  },
  assetBadgeRight: { marginLeft: -10 },
  assetBadgeText:  { fontSize: Typography.xs, fontWeight: "700" },
  swapIcon: {
    position: "absolute", bottom: -4, right: -4,
    width: 18, height: 18, borderRadius: 9,
    alignItems: "center", justifyContent: "center",
  },

  pairTitle: { fontSize: Typography.base, fontWeight: "700" },
  pairDate:  { fontSize: Typography.xs, marginTop: 2 },

  statusBadge: { 
    paddingHorizontal: Spacing[3], 
    paddingVertical: Spacing[1], 
    borderRadius: Radius.full, 
    borderWidth: 1.5,
  },
  statusText: { fontSize: Typography.xs, fontWeight: "700" },

  // Divider row
  dividerRow: { 
    flexDirection: "row", 
    borderTopWidth: 1, 
    padding: Spacing[4],
  },
  halfCol:    { flex: 1 },
  vertDivider:{ width: 1, marginHorizontal: Spacing[3] },
  miniLabel:  { fontSize: Typography.xs, marginBottom: 4 },
  bigVal:     { fontSize: Typography.md, fontWeight: "700" },
  subVal:     { fontSize: Typography.xs, marginTop: 2 },

  // Stats row
  statsRow: { 
    flexDirection: "row", 
    borderTopWidth: 1, 
    paddingVertical: Spacing[3], 
    paddingHorizontal: Spacing[4],
    alignItems: "center",
  },
  statItem:    { flex: 1, alignItems: "center" },
  statDivider: { width: 1, height: 28 },
  statLabel:   { 
    fontSize: Typography.xs, 
    fontWeight: "600", 
    marginBottom: 3, 
    textTransform: "uppercase", 
    letterSpacing: 0.5,
  },
  statVal: { fontSize: Typography.base, fontWeight: "700" },

  // Empty state
  empty:        { alignItems: "center", paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyIconBox: { 
    width: 72, height: 72, borderRadius: Radius["2xl"], 
    alignItems: "center", justifyContent: "center",
    marginBottom: Spacing[2],
  },
  emptyTitle: { fontSize: Typography.base, fontWeight: "700" },
  emptyText:  { fontSize: Typography.sm, fontWeight: "500" },
});