/**
 * src/screens/CryptoLoans/tabs/RepayTab.tsx
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

// ✅ colorKey → theme se map hoga
const STATUS_CFG = {
  ACTIVE:     { label: "Active",     colorKey: "accent"   },
  REPAID:     { label: "Repaid",     colorKey: "primary"  },
  LIQUIDATED: { label: "Liquidated", colorKey: "red"      },
  CLOSED:     { label: "Closed",     colorKey: "text3"    },
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
  const cSym = collSymbol(loan);
  const bSym = borSymbol(loan);
  const cClr = assetColor(cSym);
  const bClr = assetColor(bSym);

  const statusCfg   = STATUS_CFG[loan.status as keyof typeof STATUS_CFG] ?? STATUS_CFG.CLOSED;
  const statusColor = colors[statusCfg.colorKey as keyof ColorScheme] as string;
  const statusDim   = colors[`${statusCfg.colorKey}Dim` as keyof ColorScheme] as string
    ?? `${statusColor}20`;

  return (
    <TouchableOpacity
      style={[
        r.card,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.accentBorder : colors.border,
        },
        selected && { backgroundColor: colors.accentDim },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Row 1 — assets + status */}
      <View style={r.cardRow}>
        <View style={r.assetIcons}>
          <View style={[r.assetBadge, { backgroundColor: cClr.bg }]}>
            <Text style={[r.assetBadgeText, { color: cClr.text }]}>{cSym}</Text>
          </View>
          <View style={[r.assetBadge, r.assetBadgeRight, { backgroundColor: bClr.bg }]}>
            <Text style={[r.assetBadgeText, { color: bClr.text }]}>{bSym}</Text>
          </View>
          <View style={[r.swapIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="swap-horizontal" size={IconSize.xs} color={colors.text2} />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: Spacing[2] }}>
          <Text style={[r.pairTitle, { color: colors.text }]}>{cSym} — {bSym}</Text>
          <Text style={[r.pairDate, { color: colors.text2 }]}>{fmtDate(loan.createdAt)}</Text>
        </View>

        <View style={[r.statusBadge, {
          borderColor: statusColor,
          backgroundColor: statusDim,
        }]}>
          <Text style={[r.statusText, { color: statusColor }]}>{statusCfg.label}</Text>
        </View>
      </View>

      {/* Row 2 — collateral / borrowed */}
      <View style={[r.dividerRow, { borderTopColor: colors.borderSoft }]}>
        <View style={r.halfCol}>
          <Text style={[r.miniLabel, { color: colors.text3 }]}>Collateral</Text>
          <Text style={[r.bigVal, { color: colors.text }]}>
            {Number(loan.collateralAmount).toFixed(4)} {cSym}
          </Text>
          <Text style={[r.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.collateralUsd, "$")}
          </Text>
        </View>
        <View style={[r.vertDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={[r.halfCol, { alignItems: "flex-end" }]}>
          <Text style={[r.miniLabel, { color: colors.text3 }]}>Borrowed</Text>
          <Text style={[r.bigVal, { color: colors.text }]}>
            {Number(loan.borrowedAmount).toFixed(4)} {bSym}
          </Text>
          <Text style={[r.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.borrowedUsd, "$")}
          </Text>
        </View>
      </View>

      {/* Row 3 — stats */}
      <View style={[r.statsRow, { borderTopColor: colors.borderSoft }]}>
        <View style={r.statItem}>
          <Text style={[r.statLabel, { color: colors.text3 }]}>APR</Text>
          <Text style={[r.statVal, { color: colors.text }]}>{loan.interestRate}%</Text>
        </View>
        <View style={[r.statDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={r.statItem}>
          <Text style={[r.statLabel, { color: colors.text3 }]}>LTV</Text>
          <Text style={[r.statVal, { color: colors.text }]}>{loan.ltv}%</Text>
        </View>
        <View style={[r.statDivider, { backgroundColor: colors.borderSoft }]} />
        <View style={r.statItem}>
          <Text style={[r.statLabel, { color: colors.text3 }]}>Interest</Text>
          <Text style={[r.statVal, { color: colors.text }]}>
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
const RepayTab: React.FC<Props> = ({ paddingBottom }) => {
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

  const handleManage = () => {
    if (!selLoan) return;
    router.push({ pathname: "/loanDetails", params: { loanId: selLoan._id } });
  };

  if (loading) {
    return (
      <View style={r.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={r.root}>
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
        <View style={[r.statsBanner, {
          backgroundColor: colors.card,
          borderColor: colors.border,
        }]}>
          <View style={r.bannerItem}>
            <Text style={[r.bannerLabel, { color: colors.text2 }]}>Total Borrowed</Text>
            <Text style={[r.bannerVal, { color: colors.text }]}>
              {fmt(stats?.totalBorrowedUsd, "$")}
            </Text>
          </View>
          <View style={[r.bannerDivider, { backgroundColor: colors.borderSoft }]} />
          <View style={r.bannerItem}>
            <Text style={[r.bannerLabel, { color: colors.text2 }]}>Active Loans</Text>
            <Text style={[r.bannerVal, { color: colors.text }]}>
              {stats?.activeLoans ?? 0}
            </Text>
          </View>
          <View style={[r.bannerDivider, { backgroundColor: colors.borderSoft }]} />
          <View style={r.bannerItem}>
            <Text style={[r.bannerLabel, { color: colors.text2 }]}>Avg APR</Text>
            <Text style={[r.bannerVal, { color: colors.text }]}>
              {(stats?.avgInterestRate ?? 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* ── Section + Filters ── */}
        <View style={[r.section, { paddingHorizontal: Spacing[4] }]}>
          <Text style={[r.sectionTitle, { color: colors.text }]}>Your Loans</Text>

          <View style={r.tabRow}>
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
                    r.tabBtn,
                    { borderColor: isActive ? colors.accentBorder : colors.border },
                    isActive && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => { setFilter(t.key); setSelLoan(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[r.tabTxt, {
                    color: isActive ? colors.accent : colors.text2,
                  }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Loan List ── */}
          {filtered.length === 0 ? (
            <View style={r.empty}>
              <View style={[r.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="document-outline" size={IconSize.xl} color={colors.accent} />
              </View>
              <Text style={[r.emptyTitle, { color: colors.text }]}>No loans found</Text>
              <Text style={[r.emptyText, { color: colors.text2 }]}>
                Your loans will appear here
              </Text>
            </View>
          ) : (
            filtered.map(loan => (
              <LoanCard
                key={loan._id}
                loan={loan}
                colors={colors}
                selected={selLoan?._id === loan._id}
                onPress={() => setSelLoan(selLoan?._id === loan._id ? null : loan)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Manage CTA ── */}
      {filtered.length > 0 && (
        <View style={[r.ctaWrap, {
          backgroundColor: colors.bg,
          borderTopColor: colors.borderSoft,
        }]}>
          <TouchableOpacity
            style={[
              r.ctaBtn,
              {
                backgroundColor: selLoan ? colors.orange : colors.orangeDim,
                borderWidth: 1,
                borderColor: selLoan ? colors.orangeBorder : colors.orangeBorder,
              },
            ]}
            onPress={handleManage}
            disabled={!selLoan}
            activeOpacity={0.85}
          >
            <Ionicons
              name="options-outline"
              size={IconSize.sm}
              color={selLoan ? "#fff" : colors.orange}
            />
            <Text style={[r.ctaBtnText, {
              color: selLoan ? "#fff" : colors.orange,
            }]}>
              {selLoan ? "Manage Loan" : "Select a Loan to Manage"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default RepayTab;

const r = StyleSheet.create({
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
  card: {
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
  assetBadge:      { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
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
  dividerRow:  { flexDirection: "row", borderTopWidth: 1, padding: Spacing[4] },
  halfCol:     { flex: 1 },
  vertDivider: { width: 1, marginHorizontal: Spacing[3] },
  miniLabel:   { fontSize: Typography.xs, marginBottom: 4 },
  bigVal:      { fontSize: Typography.md, fontWeight: "700" },
  subVal:      { fontSize: Typography.xs, marginTop: 2 },

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
  statLabel: {
    fontSize: Typography.xs,
    fontWeight: "600",
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statVal: { fontSize: Typography.base, fontWeight: "700" },

  // Empty
  empty:        { alignItems: "center", paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyIconBox: {
    width: 72, height: 72,
    borderRadius: Radius["2xl"],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  emptyTitle: { fontSize: Typography.base, fontWeight: "700" },
  emptyText:  { fontSize: Typography.sm, fontWeight: "500" },

  // CTA
  ctaWrap: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[4],
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius: Radius.xl,
  },
  ctaBtnText: {
    fontSize: Typography.base,
    fontWeight: "700",
  },
});