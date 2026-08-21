// app/(screens)/Buy/TransactionResult.tsx

import React, { useEffect, useRef } from "react";
import {
  View, Text, StyleSheet,
  TouchableOpacity, Animated,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Typography, Spacing, Radius } from "@/styles/theme";

export default function TransactionResultScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const {
    transactionId,
    status,
    baseCurrencyCode,
    baseCurrencyAmount,
  } = useLocalSearchParams<{
    transactionId?:      string;
    status?:             string;
    baseCurrencyCode?:   string;
    baseCurrencyAmount?: string;
  }>();

  // ── Animation ────────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 100,
        friction: 8, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Status Config ─────────────────────────────────────────────
  const isSuccess   = status === "completed" || status === "waitingPayment";
  const isFailed    = status === "failed";
  const isCancelled = status === "cancelled";

  const config = {
    icon: isSuccess   ? "checkmark-circle"
        : isFailed    ? "close-circle"
        : isCancelled ? "ban"
        : "time",

    color: isSuccess   ? colors.green
         : isFailed    ? colors.red
         : isCancelled ? colors.red
         : "#F59E0B",

    title: isSuccess   ? "Transaction Successful!"
         : isFailed    ? "Transaction Failed"
         : isCancelled ? "Cancelled"
         : "Transaction Pending",

    subtitle: isSuccess
      ? "Your crypto is being processed"
      : isFailed
      ? "Something went wrong. Please try again."
      : isCancelled
      ? "You cancelled the transaction."
      : "Your transaction is under review.",
  } as const;

  return (
    <View style={[s.root, { backgroundColor: colors.bg, paddingTop: insets.top }]}>

      <View style={s.content}>

        {/* ── Icon ── */}
        <Animated.View style={[
          s.iconWrap,
          { backgroundColor: `${config.color}20`,
            transform: [{ scale: scaleAnim }] },
        ]}>
          <Ionicons name={config.icon} size={72} color={config.color} />
        </Animated.View>

        {/* ── Title ── */}
        <Animated.View style={{ opacity: fadeAnim, alignItems: "center", gap: 8 }}>
          <Text style={[s.title, { color: colors.text }]}>{config.title}</Text>
          <Text style={[s.subtitle, { color: colors.text2 }]}>{config.subtitle}</Text>
        </Animated.View>

        {/* ── Details Card ── */}
        <Animated.View style={[
          s.card,
          { backgroundColor: colors.card,
            borderColor: colors.border,
            opacity: fadeAnim },
        ]}>
          {transactionId && (
            <Row label="Transaction ID"
              value={`${transactionId.slice(0,8)}...${transactionId.slice(-6)}`}
              colors={colors} />
          )}
          {baseCurrencyAmount && (
            <Row label="Amount"
              value={`${baseCurrencyAmount} ${baseCurrencyCode?.toUpperCase()}`}
              colors={colors} />
          )}
          <Row label="Status"
            value={status ?? "Unknown"}
            valueColor={config.color}
            colors={colors} />
        </Animated.View>

      </View>

      {/* ── Actions ── */}
      <View style={[
        s.actions,
        { paddingBottom: insets.bottom + 16,
          borderTopColor: colors.border },
      ]}>
        {(isFailed || isCancelled) && (
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => router.replace("/(screens)/Buy/BuyMain")}
          >
            <Ionicons name="refresh" size={18} color={colors.text} />
            <Text style={[s.secondaryTxt, { color: colors.text }]}>Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.primaryBtn, {
            backgroundColor: isSuccess ? colors.green : colors.text,
          }]}
          onPress={() => router.replace("/(app)")}
        >
          <Ionicons name="home-outline" size={18} color="#fff" />
          <Text style={s.primaryTxt}>
            {isSuccess ? "Go to Portfolio" : "Go to Home"}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

function Row({
  label, value, valueColor, colors,
}: {
  label: string; value: string;
  valueColor?: string; colors: any;
}) {
  return (
    <View style={s.row}>
      <Text style={[s.rowLabel, { color: colors.text3 }]}>{label}</Text>
      <Text style={[s.rowValue, { color: valueColor ?? colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  content:      { flex: 1, alignItems: "center", justifyContent: "center",
                  paddingHorizontal: Spacing[6], gap: Spacing[6] },
  iconWrap:     { width: 130, height: 130, borderRadius: 65,
                  alignItems: "center", justifyContent: "center" },
  title:        { fontSize: Typography["2xl"], fontWeight: "800", textAlign: "center" },
  subtitle:     { fontSize: Typography.sm, textAlign: "center", lineHeight: 22 },
  card:         { width: "100%", borderRadius: Radius["2xl"], borderWidth: 1,
                  padding: Spacing[4], gap: 14 },
  row:          { flexDirection: "row", justifyContent: "space-between" },
  rowLabel:     { fontSize: Typography.xs },
  rowValue:     { fontSize: Typography.sm, fontWeight: "600" },
  actions:      { paddingHorizontal: Spacing[4], paddingTop: Spacing[4],
                  borderTopWidth: 1, gap: 10 },
  primaryBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 8, paddingVertical: 16, borderRadius: Radius.xl },
  primaryTxt:   { color: "#fff", fontSize: Typography.base, fontWeight: "700" },
  secondaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center",
                  gap: 8, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1 },
  secondaryTxt: { fontSize: Typography.base, fontWeight: "600" },
});