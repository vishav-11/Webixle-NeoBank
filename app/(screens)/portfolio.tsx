/**
 * app/(screens)/portfolio.tsx
 * Portfolio page — with back button option
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";
import Svg, { Circle, G } from "react-native-svg";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Holding {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  balance: number;
  balanceUSD: number;
  change24h: number;
  percentage: number;
}

// ─── Timeframes ───────────────────────────────────────────────────────────────
const TIMEFRAMES = ["1D", "1W", "1M", "1Y", "All"] as const;
type Timeframe = typeof TIMEFRAMES[number];

// ─── Mock Holdings ────────────────────────────────────────────────────────────
const HOLDINGS: Holding[] = [
  {
    id: "eth", name: "Ethereum", symbol: "ETH",
    icon: "diamond-outline", iconBg: "#627eea", iconColor: "#fff",
    balance: 0.0256, balanceUSD: 845.34, change24h: 6.21, percentage: 29.0,
  },
  {
    id: "btc", name: "Bitcoin", symbol: "BTC",
    icon: "logo-bitcoin", iconBg: "#f7931a", iconColor: "#fff",
    balance: 0.0256, balanceUSD: 1642.35, change24h: 4.35, percentage: 56.4,
  },
  {
    id: "usdt", name: "Tether", symbol: "USDT",
    icon: "cash-outline", iconBg: "#26a17b", iconColor: "#fff",
    balance: 425.20, balanceUSD: 425.20, change24h: 0.01, percentage: 8.7,
  },
  {
    id: "sol", name: "Solana", symbol: "SOL",
    icon: "flash-outline", iconBg: "#9945ff", iconColor: "#fff",
    balance: 4.8, balanceUSD: 696.96, change24h: -2.1, percentage: 5.9,
  },
];

// ─── Donut Chart ──────────────────────────────────────────────────────────────
function DonutChart({ holdings, total, colors }: { holdings: Holding[]; total: number; colors: any }) {
  const size = 200;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const sorted = [...holdings].sort((a, b) => b.percentage - a.percentage);
  let cumulativePercent = 0;

  return (
    <View style={dc.wrap}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
          {sorted.map((h) => {
            const percent = h.percentage;
            const strokeDashoffset = circumference - (cumulativePercent / 100) * circumference;
            const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
            cumulativePercent += percent;
            return (
              <Circle
                key={h.id} cx={size / 2} cy={size / 2} r={radius}
                stroke={h.iconBg} strokeWidth={strokeWidth} fill="none"
                strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            );
          })}
        </G>
      </Svg>
      <View style={dc.center}>
        <Text style={[dc.centerLabel, { color: colors.text2 }]}>Total Assets</Text>
        <Text style={[dc.centerVal, { color: colors.text }]}>
          ${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </Text>
      </View>
    </View>
  );
}

const dc = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center", marginVertical: 24, position: "relative" },
  center: { position: "absolute", alignItems: "center" },
  centerLabel: { fontSize: Typography.sm, marginBottom: 4 },
  centerVal: { fontSize: Typography.lg, fontWeight: "800" },
});

// ─── Asset Legend Item ────────────────────────────────────────────────────────
function LegendItem({ color, symbol, percentage, colors }: { color: string; symbol: string; percentage: number; colors: any }) {
  return (
    <View style={li.row}>
      <View style={[li.dot, { backgroundColor: color }]} />
      <Text style={[li.symbol, { color: colors.text }]}>{symbol}</Text>
      <Text style={[li.pct, { color: colors.text2 }]}>{percentage.toFixed(1)}%</Text>
    </View>
  );
}

const li = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  symbol: { fontSize: Typography.base, fontWeight: "700" },
  pct: { fontSize: Typography.sm, marginLeft: "auto" },
});

// ─── Holding Row ──────────────────────────────────────────────────────────────
function HoldingRow({ holding, GREEN, colors, isLast }: { holding: Holding; GREEN: string; colors: any; isLast: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const positive = holding.change24h >= 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[hr.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
        activeOpacity={1}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      >
        <View style={[hr.icon, { backgroundColor: holding.iconBg }]}>
          <Ionicons name={holding.icon as any} size={22} color={holding.iconColor} />
        </View>
        <View style={hr.info}>
          <Text style={[hr.name, { color: colors.text }]}>{holding.name}</Text>
          <Text style={[hr.symbol, { color: colors.text2 }]}>{holding.symbol}</Text>
        </View>
        <View style={hr.amtCol}>
          <Text style={[hr.usd, { color: colors.text }]}>${holding.balanceUSD.toLocaleString()}</Text>
          <Text style={[hr.balance, { color: colors.text2 }]}>
            {holding.balance.toLocaleString()} {holding.symbol}
          </Text>
        </View>
        <View style={hr.changeCol}>
          <View style={hr.changeRow}>
            <Ionicons name={positive ? "caret-up" : "caret-down"} size={12} color={positive ? GREEN : "#FF4D6A"} />
            <Text style={[hr.changeTxt, { color: positive ? GREEN : "#FF4D6A" }]}>
              {Math.abs(holding.change24h).toFixed(2)}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const hr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 16, paddingHorizontal: Spacing[4] },
  icon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  name: { fontSize: Typography.base, fontWeight: "700" },
  symbol: { fontSize: Typography.xs, marginTop: 3 },
  amtCol: { alignItems: "flex-end", marginRight: 12 },
  usd: { fontSize: Typography.base, fontWeight: "800" },
  balance: { fontSize: Typography.xs, marginTop: 3 },
  changeCol: { minWidth: 60, alignItems: "flex-end" },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  changeTxt: { fontSize: Typography.sm, fontWeight: "700" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function PortfolioScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const GREEN = colors.primary;

  const [timeframe, setTimeframe] = useState<Timeframe>("1D");

  const totalUSD = HOLDINGS.reduce((s, h) => s + h.balanceUSD, 0);
  const todayChange = 386.42;
  const todayChangePct = 3.6;
  const positive = todayChangePct >= 0;

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ══════════════════════════════════════════
          HEADER with Back Button
      ══════════════════════════════════════════ */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        {/* Back Button */}
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => (router.canGoBack() ? router.back() : router.push("/"))}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Title — Centered */}
        <Text style={[s.headerTitle, { color: colors.text }]}>Portfolio</Text>

        {/* Right Placeholder — keeps title centered */}
        <View style={s.iconBtn} />
      </View>

      {/* ── Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 100 + insets.bottom }]}
      >
        {/* Timeframe Tabs */}
        <Animated.View style={[s.tfRow, { opacity: fadeAnim }]}>
          {TIMEFRAMES.map((tf) => {
            const active = timeframe === tf;
            return (
              <TouchableOpacity
                key={tf}
                style={[s.tfChip, { backgroundColor: active ? GREEN : "transparent", borderColor: active ? GREEN : colors.border }]}
                onPress={() => setTimeframe(tf)}
                activeOpacity={0.8}
              >
                <Text style={[s.tfTxt, { color: active ? "#fff" : colors.text2 }]}>{tf}</Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Total Balance */}
        <Animated.View style={[s.balanceWrap, { opacity: fadeAnim }]}>
          <Text style={[s.totalAmt, { color: colors.text }]}>
            ${totalUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Text>
          <View style={s.changeRow}>
            <Ionicons name={positive ? "caret-up" : "caret-down"} size={16} color={positive ? GREEN : "#FF4D6A"} />
            <Text style={[s.changeTxt, { color: positive ? GREEN : "#FF4D6A" }]}>
              ${todayChange.toFixed(2)}({positive ? "+" : ""}{todayChangePct}%)
            </Text>
            <Text style={[s.todayLabel, { color: colors.text2 }]}>Today</Text>
          </View>
        </Animated.View>

        {/* Donut Chart */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <DonutChart holdings={HOLDINGS} total={totalUSD} colors={colors} />
        </Animated.View>

        {/* Asset Legend */}
        <Animated.View style={[s.legend, { opacity: fadeAnim }]}>
          {HOLDINGS.sort((a, b) => b.percentage - a.percentage).map((h) => (
            <LegendItem key={h.id} color={h.iconBg} symbol={h.symbol} percentage={h.percentage} colors={colors} />
          ))}
        </Animated.View>

        {/* Holdings Section */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={s.holdingsHeader}>
            <Text style={[s.holdingsTitle, { color: colors.text }]}>Holdings</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[s.seeAll, { color: GREEN }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[s.holdingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {HOLDINGS.map((h, idx) => (
              <HoldingRow key={h.id} holding={h} GREEN={GREEN} colors={colors} isLast={idx === HOLDINGS.length - 1} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Header with Back Button (Budget/Activity style) ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
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
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  scroll: { paddingHorizontal: Spacing[4], paddingTop: 12 },
  tfRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  tfChip: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: Radius.full, borderWidth: 1.5 },
  tfTxt: { fontSize: Typography.sm, fontWeight: "700" },
  balanceWrap: { alignItems: "flex-start", marginBottom: 8 },
  totalAmt: { fontSize: 42, fontWeight: "800", marginBottom: 6 },
  changeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  changeTxt: { fontSize: Typography.base, fontWeight: "700" },
  todayLabel: { fontSize: Typography.base },
  legend: { marginBottom: 32, paddingHorizontal: 8 },
  holdingsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  holdingsTitle: { fontSize: Typography.xl, fontWeight: "800" },
  seeAll: { fontSize: Typography.sm, fontWeight: "700" },
  holdingsCard: { borderRadius: Radius["2xl"], borderWidth: 1, overflow: "hidden" },
});