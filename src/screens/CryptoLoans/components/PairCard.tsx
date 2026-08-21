import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from "@/styles/theme";
import type { LoanPair } from "@/types/loanType";

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

interface PairCardProps {
  pair: LoanPair;
  colors: ColorScheme;
  onPress: () => void;
}

const PairCard = React.memo(function PairCard({
  pair,
  colors,
  onPress,
}: PairCardProps) {
  const cClr = assetColor(pair.collateral.symbol);
  const bClr = assetColor(pair.borrow.symbol);

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={s.headerRow}>
        <View style={s.icons}>
          <View style={[s.badge, { backgroundColor: cClr.bg }]}>
            <Text style={[s.badgeTxt, { color: cClr.text }]}>
              {pair.collateral.symbol}
            </Text>
          </View>
          <View style={[s.swapIcon, { backgroundColor: colors.surface }]}>
            <Ionicons name="swap-horizontal" size={IconSize.xs} color={colors.text2} />
          </View>
          <View style={[s.badge, { backgroundColor: bClr.bg }]}>
            <Text style={[s.badgeTxt, { color: bClr.text }]}>
              {pair.borrow.symbol}
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: Spacing[3] }}>
          <Text style={[s.pairName, { color: colors.text }]}>
            {pair.collateral.symbol} — {pair.borrow.symbol}
          </Text>
          <Text style={[s.pairSub, { color: colors.text2 }]}>
            Collateralized Loan
          </Text>
        </View>

        {/* ✅ APR badge — accent instead of primary */}
        <View style={[s.aprBadge, {
          borderColor: colors.accentBorder,
          backgroundColor: colors.accentDim,
        }]}>
          <Text style={[s.aprTxt, { color: colors.accent }]}>
            {pair.interest}% APR
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={[s.stats, { backgroundColor: colors.surface }]}>
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>Max LTV</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{pair.ltv}%</Text>
        </View>
        <View style={[s.divider, { backgroundColor: colors.borderSoft }]} />
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>Daily Rate</Text>
          <Text style={[s.statVal, { color: colors.text }]}>
            {(pair.interest / 365).toFixed(4)}%
          </Text>
        </View>
        <View style={[s.divider, { backgroundColor: colors.borderSoft }]} />
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>Min Borrow</Text>
          <Text style={[s.statVal, { color: colors.text }]}>$100</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[s.cta, { backgroundColor: bClr.bg }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={s.ctaTxt}>Borrow {pair.borrow.symbol}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export default PairCard;

const s = StyleSheet.create({
  card: {
    borderRadius: Radius["2xl"],
    borderWidth: 1,
    marginBottom: Spacing[3],
    overflow: "hidden",
    padding: Spacing[4],
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing[3],
  },
  icons: { flexDirection: "row", alignItems: "center" },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeTxt: { fontSize: Typography.xs, fontWeight: "700" },
  swapIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: Spacing[1],
  },
  pairName: { fontSize: Typography.base, fontWeight: "700" },
  pairSub: { fontSize: Typography.xs, marginTop: 1 },
  aprBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  aprTxt: { fontSize: Typography.xs, fontWeight: "700" },
  stats: {
    flexDirection: "row",
    borderRadius: Radius.lg,
    padding: Spacing[3],
    marginBottom: Spacing[3],
  },
  statItem: { flex: 1, alignItems: "center" },
  divider: { width: 1, alignSelf: "stretch" },
  statLabel: {
    fontSize: Typography.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  statVal: { fontSize: Typography.sm, fontWeight: "700" },
  cta: {
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    alignItems: "center",
  },
  ctaTxt: { fontSize: Typography.sm, fontWeight: "700", color: "#fff" },
});