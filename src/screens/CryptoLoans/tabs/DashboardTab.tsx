import React from "react";
import {
  View, Text, TouchableOpacity,
  ScrollView, StyleSheet, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from "@/styles/theme";
import { DashboardSkeleton } from "../components/SkeletonLoader";
import type { LoanPair, LoanStats } from "@/types/loanType";

// ── Asset colours ─────────────────────────────────────────────────────────────
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

const assetColor = (s: string) =>
  ASSET_COLORS[s?.toUpperCase()] ?? { bg: "#3D6170", text: "#fff" };

const fmtUsd = (n?: number | null) => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(2)}`;
};

// ✅ Health color — theme se
const healthColor = (h: string, colors: ColorScheme) =>
  ({
    SAFE:     colors.accent,
    WARNING:  colors.orange,
    DANGER:   colors.red,
    CRITICAL: colors.red,
  })[h] ?? colors.accent;

// ── Pair Card ─────────────────────────────────────────────────────────────────
const PairCard = React.memo(({
  pair, colors, onPress,
}: {
  pair: LoanPair;
  colors: ColorScheme;
  onPress: () => void;
}) => {
  const cC = assetColor(pair.collateral.symbol);
  const bC = assetColor(pair.borrow.symbol);

  return (
    <TouchableOpacity
      style={[d.pairCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header row */}
      <View style={d.pairHeaderRow}>
        <View style={d.pairIcons}>
          <View style={[d.pairBadge, { backgroundColor: cC.bg }]}>
            <Text style={[d.pairBadgeTxt, { color: cC.text }]}>{pair.collateral.symbol}</Text>
          </View>
          <View style={[d.pairSwap, { backgroundColor: colors.surface }]}>
            <Ionicons name="swap-horizontal" size={IconSize.xs} color={colors.text2} />
          </View>
          <View style={[d.pairBadge, { backgroundColor: bC.bg }]}>
            <Text style={[d.pairBadgeTxt, { color: bC.text }]}>{pair.borrow.symbol}</Text>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: Spacing[3] }}>
          <Text style={[d.pairName, { color: colors.text }]}>
            {pair.collateral.symbol} — {pair.borrow.symbol}
          </Text>
          <Text style={[d.pairSub, { color: colors.text2 }]}>Collateralized Loan</Text>
        </View>

        {/* ✅ APR badge — accent instead of green */}
        <View style={[d.aprBadge, {
          borderColor: colors.accentBorder,
          backgroundColor: colors.accentDim,
        }]}>
          <Text style={[d.aprTxt, { color: colors.accent }]}>{pair.interest}% APR</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={[d.pairStats, { backgroundColor: colors.surface }]}>
        {[
          { label: "Max LTV",    val: `${pair.ltv}%` },
          { label: "Daily Rate", val: `${(pair.interest / 365).toFixed(4)}%` },
          { label: "Min Borrow", val: "$100" },
        ].map((item, i) => (
          <React.Fragment key={item.label}>
            {i > 0 && <View style={[d.pairStatDivider, { backgroundColor: colors.borderSoft }]} />}
            <View style={d.pairStatItem}>
              <Text style={[d.pairStatLabel, { color: colors.text3 }]}>{item.label}</Text>
              <Text style={[d.pairStatVal, { color: colors.text }]}>{item.val}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[d.pairCta, { backgroundColor: bC.bg }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={d.pairCtaTxt}>Borrow {pair.borrow.symbol}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  pairs: LoanPair[];
  stats: LoanStats | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  paddingBottom: number;
}

// ── Component ─────────────────────────────────────────────────────────────────
const DashboardTab: React.FC<Props> = ({
  pairs, stats, loading, refreshing, onRefresh, paddingBottom,
}) => {
  const { colors } = useTheme();
  const router = useRouter();

  const hasLoans = (stats?.activeLoans ?? 0) > 0;
  const hColor   = healthColor(stats?.health ?? "SAFE", colors);
  const ltvPct   = Math.min(stats?.currentLtv ?? 0, 100);

  if (loading) {
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom }}
      >
        <DashboardSkeleton />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[d.scroll, { paddingBottom }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
          colors={[colors.accent]}
        />
      }
    >
      {/* ── Hero Card ── */}
      <View style={[d.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* ✅ Badge — accent */}
        <View style={[d.heroBadge, { backgroundColor: colors.accentDim }]}>
          <Text style={[d.heroBadgeTxt, { color: colors.accent }]}>
            {hasLoans ? "Active Portfolio" : "DeFi Lending"}
          </Text>
        </View>

        <Text style={[d.heroTitle, { color: colors.text }]}>
          {hasLoans ? "Manage Your\nLoan Positions" : "Borrow Against\nYour Crypto"}
        </Text>
        <Text style={[d.heroSub, { color: colors.text2 }]}>
          {hasLoans
            ? "Track collateral, repay loans, and optimize\nyour positions"
            : "Unlock liquidity without selling. Fast, secure, flexible."}
        </Text>

        {/* ✅ CTA — primary gradient look using primaryBright */}
        <TouchableOpacity
          style={[d.heroCta, { backgroundColor: colors.primaryBright }]}
          onPress={() => router.push("/loanBorrow")}
          activeOpacity={0.85}
        >
          <Text style={d.heroCtaTxt}>{hasLoans ? "Borrow More" : "Start Borrowing"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick Actions ── */}
      <View style={d.quickRow}>
        {[
          { label: "Borrow",    colorKey: "accent",  iconDimKey: "accentDim",  icon: "cash-outline",    route: "/loanBorrow"  },
          { label: "Positions", colorKey: "orange",  iconDimKey: "orangeDim",  icon: "layers-outline",  route: "/loanHistory" },
          { label: "History",   colorKey: "red",     iconDimKey: "redDim",     icon: "time-outline",    route: "/loanHistory" },
        ].map(a => {
          const color    = colors[a.colorKey as keyof ColorScheme] as string;
          const dimColor = colors[a.iconDimKey as keyof ColorScheme] as string;
          return (
            <TouchableOpacity
              key={a.label}
              style={[d.quickBtn, { borderColor: color, backgroundColor: dimColor }]}
              onPress={() => router.push(a.route as any)}
              activeOpacity={0.8}
            >
              <Ionicons name={a.icon as any} size={IconSize.sm} color={color} />
              <Text style={[d.quickLabel, { color }]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Portfolio Overview ── */}
      <Text style={[d.sectionTitle, { color: colors.text }]}>Portfolio Overview</Text>
      <Text style={[d.sectionSub, { color: colors.text2 }]}>
        {hasLoans ? "Your current positions" : "Start your first loan"}
      </Text>

      <View style={d.twoCol}>
        <View style={[d.colBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[d.colLabel, { color: colors.text3 }]}>Collateral</Text>
          <Text style={[d.colVal, { color: colors.text }]}>
            {fmtUsd(stats?.totalCollateralUsd)}
          </Text>
        </View>
        <View style={[d.colBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[d.colLabel, { color: colors.text3 }]}>Borrowed</Text>
          {/* ✅ accent instead of green */}
          <Text style={[d.colVal, { color: colors.accent }]}>
            {fmtUsd(stats?.totalBorrowedUsd)}
          </Text>
        </View>
      </View>

      {/* ── LTV Bar ── */}
      <View style={[d.ltvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={d.ltvLabelRow}>
          <Text style={[d.ltvLabel, { color: colors.text2 }]}>Loan-to-value</Text>
          <Text style={[d.ltvPct, { color: hColor }]}>{ltvPct.toFixed(0)}%</Text>
        </View>
        <View style={[d.ltvTrack, { backgroundColor: colors.borderSoft }]}>
          <View style={[d.ltvFill, {
            width: `${Math.max(ltvPct, 2)}%`,
            backgroundColor: hColor,
          }]} />
        </View>
      </View>

      {/* ── Stats Grid ── */}
      <View style={d.statsGrid}>
        {[
          { label: "Active",   val: String(stats?.activeLoans ?? 0),                       icon: "radio-button-on",      colorKey: "accent"  },
          { label: "Total",    val: String(stats?.totalLoans ?? 0),                         icon: "shield-checkmark-outline", colorKey: "primary" },
          { label: "Interest", val: `$${Number(stats?.totalInterestAccrued ?? 0).toFixed(2)}`, icon: "trending-up-outline",  colorKey: "orange"  },
          { label: "Avg APR",  val: `${(stats?.avgInterestRate ?? 0).toFixed(1)}%`,         icon: "stats-chart-outline",  colorKey: "red"     },
        ].map(item => {
          const color    = colors[item.colorKey as keyof ColorScheme] as string;
          const dimColor = colors[`${item.colorKey}Dim` as keyof ColorScheme] as string;
          return (
            <View
              key={item.label}
              style={[d.statBox, {
                backgroundColor: colors.card,
                borderColor: colors.border,
              }]}
            >
              <View style={[d.statIconBox, { backgroundColor: dimColor }]}>
                <Ionicons name={item.icon as any} size={IconSize.sm} color={color} />
              </View>
              <Text style={[d.statLabel, { color: colors.text3 }]}>{item.label}</Text>
              <Text style={[d.statVal, { color }]}>{item.val}</Text>
            </View>
          );
        })}
      </View>

      {/* ── Available Markets ── */}
      <View style={d.marketsHeader}>
        <View>
          <Text style={[d.sectionTitle, { color: colors.text }]}>Available Markets</Text>
          <Text style={[d.sectionSub, { color: colors.text2 }]}>{pairs.length} pairs available</Text>
        </View>
        <TouchableOpacity style={[d.seeAll, { borderColor: colors.border }]}>
          <Text style={[d.seeAllTxt, { color: colors.text2 }]}>See All</Text>
        </TouchableOpacity>
      </View>

      {pairs.length === 0 ? (
        <View style={d.empty}>
          <View style={[d.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="storefront-outline" size={IconSize.xl} color={colors.accent} />
          </View>
          <Text style={[d.emptyTitle, { color: colors.text }]}>No markets available</Text>
          <Text style={[d.emptyTxt, { color: colors.text2 }]}>Check back soon</Text>
        </View>
      ) : (
        pairs.map(pair => (
          <PairCard
            key={`${pair.collateral.id}-${pair.borrow.id}`}
            pair={pair}
            colors={colors}
            onPress={() => router.push("/loanBorrow")}
          />
        ))
      )}

      {/* ── Manage CTA ── */}
      <TouchableOpacity
        style={[d.manageCta, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push("/loanHistory")}
        activeOpacity={0.8}
      >
        <View style={[d.manageIcon, { backgroundColor: colors.accentDim }]}>
          <Ionicons name="options-outline" size={IconSize.md} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[d.manageTitle, { color: colors.text }]}>Manage Loans</Text>
          <Text style={[d.manageSub, { color: colors.text2 }]}>
            {stats?.activeLoans
              ? `${stats.activeLoans} active · ${stats.totalLoans} total`
              : "All transactions & activity"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={IconSize.md} color={colors.text3} />
      </TouchableOpacity>
    </ScrollView>
  );
};

export default DashboardTab;

const d = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4] },

  // ── Hero ──
  heroCard: {
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    padding: Spacing[5],
    marginBottom: Spacing[4],
  },
  heroBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    marginBottom: Spacing[3],
  },
  heroBadgeTxt: { fontSize: Typography.xs, fontWeight: "700" },
  heroTitle:    { fontSize: Typography["2xl"], fontWeight: "800", lineHeight: 34, marginBottom: Spacing[2] },
  heroSub:      { fontSize: Typography.sm, lineHeight: 20, marginBottom: Spacing[4] },
  heroCta:      { paddingVertical: 13, borderRadius: Radius.xl, alignItems: "center" },
  heroCtaTxt:   { fontSize: Typography.base, fontWeight: "700", color: "#fff" },

  // ── Quick ──
  quickRow:  { flexDirection: "row", gap: Spacing[3], marginBottom: Spacing[4] },
  quickBtn:  {
    flex: 1, alignItems: "center", justifyContent: "center",
    gap: Spacing[2], paddingVertical: Spacing[4],
    borderRadius: Radius.xl, borderWidth: 1.5,
  },
  quickLabel: { fontSize: Typography.xs, fontWeight: "700" },

  // ── Section headings ──
  sectionTitle: { fontSize: Typography.lg, fontWeight: "700", marginBottom: 2 },
  sectionSub:   { fontSize: Typography.xs, marginBottom: Spacing[3] },

  // ── Two-col boxes ──
  twoCol: { flexDirection: "row", gap: Spacing[3], marginBottom: Spacing[3] },
  colBox: { flex: 1, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] },
  colLabel: { fontSize: Typography.xs, marginBottom: 4 },
  colVal:   { fontSize: Typography["2xl"], fontWeight: "800" },

  // ── LTV ──
  ltvCard:     { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },
  ltvLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: Spacing[3] },
  ltvLabel:    { fontSize: Typography.sm, fontWeight: "500" },
  ltvPct:      { fontSize: Typography.sm, fontWeight: "700" },
  ltvTrack:    { height: 8, borderRadius: 4 },
  ltvFill:     { height: "100%", borderRadius: 4 },

  // ── Stats grid ──
  statsGrid:  { flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[4] },
  statBox:    {
    flex: 1, borderRadius: Radius.lg, borderWidth: 1,
    padding: Spacing[3], alignItems: "center", gap: Spacing[1],
  },
  statIconBox: {
    width: 32, height: 32, borderRadius: Radius.md,
    alignItems: "center", justifyContent: "center",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.xs, fontWeight: "600",
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  statVal: { fontSize: Typography.sm, fontWeight: "800" },

  // ── Markets header ──
  marketsHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-end", marginBottom: Spacing[3],
  },
  seeAll:    { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.md, borderWidth: 1 },
  seeAllTxt: { fontSize: Typography.xs, fontWeight: "600" },

  // ── Pair card ──
  pairCard:      { borderRadius: Radius["2xl"], borderWidth: 1, marginBottom: Spacing[3], overflow: "hidden", padding: Spacing[4] },
  pairHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: Spacing[3] },
  pairIcons:     { flexDirection: "row", alignItems: "center" },
  pairBadge:     { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  pairBadgeTxt:  { fontSize: Typography.xs, fontWeight: "700" },
  pairSwap:      {
    width: 22, height: 22, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
    marginHorizontal: Spacing[1],
  },
  pairName:          { fontSize: Typography.base, fontWeight: "700" },
  pairSub:           { fontSize: Typography.xs, marginTop: 1 },
  aprBadge:          { paddingHorizontal: Spacing[2], paddingVertical: Spacing[1], borderRadius: Radius.md, borderWidth: 1.5 },
  aprTxt:            { fontSize: Typography.xs, fontWeight: "700" },
  pairStats:         { flexDirection: "row", borderRadius: Radius.lg, padding: Spacing[3], marginBottom: Spacing[3] },
  pairStatItem:      { flex: 1, alignItems: "center" },
  pairStatDivider:   { width: 1, alignSelf: "stretch" },
  pairStatLabel:     { fontSize: Typography.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  pairStatVal:       { fontSize: Typography.sm, fontWeight: "700" },
  pairCta:           { paddingVertical: Spacing[3], borderRadius: Radius.lg, alignItems: "center" },
  pairCtaTxt:        { fontSize: Typography.sm, fontWeight: "700", color: "#fff" },

  // ── Empty ──
  empty:       { alignItems: "center", paddingVertical: Spacing[12], gap: Spacing[3] },
  emptyIconBox:{ width: 72, height: 72, borderRadius: Radius["2xl"], alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: Typography.base, fontWeight: "700" },
  emptyTxt:    { fontSize: Typography.sm, fontWeight: "500" },

  // ── Manage CTA ──
  manageCta:   {
    flexDirection: "row", alignItems: "center", gap: Spacing[3],
    borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing[4], marginTop: Spacing[1],
  },
  manageIcon:  { width: 44, height: 44, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center" },
  manageTitle: { fontSize: Typography.base, fontWeight: "700" },
  manageSub:   { fontSize: Typography.xs, marginTop: 2 },
});