import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { BOTTOM_TAB_H, Radius, Spacing, Typography } from "@/styles/theme";

import {
  useSwapAssets,
  useAssetBalance,
  useSwapQuote,
  useExecuteSwap,
  toSmallestUnit,
  type SwapQuote,
} from "@/hooks/queires";
import type { PlatformAsset } from "@/types/platformAsset";

// ─── Global web input outline reset ──────────────────────────────────────────
if (Platform.OS === "web" && typeof document !== "undefined") {
  const style = document.createElement("style");
  style.innerHTML = `
    input, textarea, [contenteditable] {
      outline: none !important;
      box-shadow: none !important;
      -webkit-tap-highlight-color: transparent !important;
      -webkit-appearance: none !important;
    }
    input:focus, textarea:focus, [contenteditable]:focus {
      outline: none !important;
      box-shadow: none !important;
      border-color: transparent !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = "#22C58B";
const TAB_ACTIVE_BG = "rgba(0,211,149,0.10)";
const IS_WEB = Platform.OS === "web";

const COIN_COLORS: Record<string, [string, string]> = {
  BTC: ["#F7931A", "#E8830A"],
  ETH: ["#627EEA", "#4A6DD8"],
  TRX: ["#FF5570", "#E83050"],
  TRON: ["#FF5570", "#E83050"],
  BNB: ["#FFB23F", "#E09510"],
  USDT: ["#26A17B", "#1A8A66"],
  USDC: ["#2775CA", "#1A60B5"],
  SOL: ["#9945FF", "#7B35E0"],
  MATIC: ["#8247E5", "#6535CC"],
};

const NETWORK_LABELS: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum (ERC-20)",
  BSC: "BNB Smart Chain",
  TRX: "Tron (TRC-20)",
  TRON: "Tron (TRC-20)",
  SOL: "Solana",
};

const webInputReset =
  Platform.OS === "web"
    ? ({
        outlineWidth: 0,
        outlineStyle: "none",
        outlineColor: "transparent",
        boxShadow: "none",
        WebkitAppearance: "none",
        WebkitTapHighlightColor: "transparent",
      } as any)
    : {};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ["#334155", "#1E293B"];

const formatBal = (b?: string | number, decimals = 6) => {
  const n = typeof b === "number" ? b : parseFloat(b ?? "0");
  if (isNaN(n)) return "0.00";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
};

const formatUsd = (val: number) =>
  val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const showAlert = (
  title: string,
  message?: string,
  buttons?: {
    text?: string;
    onPress?: () => void;
    style?: "cancel" | "destructive" | "default";
  }[],
) => {
  if (Platform.OS === "web") {
    if (buttons && buttons.length > 1) {
      const confirmed = window.confirm(
        `${title}${message ? `\n\n${message}` : ""}`,
      );
      if (confirmed) {
        buttons.find((b) => b.style !== "cancel")?.onPress?.();
      } else {
        buttons.find((b) => b.style === "cancel")?.onPress?.();
      }
    } else {
      window.alert(`${title}${message ? `\n\n${message}` : ""}`);
      buttons?.[0]?.onPress?.();
    }
  } else {
    const { Alert } = require("react-native");
    Alert.alert(title, message, buttons);
  }
};

const PIN_KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

// ─── Skeleton Atom ────────────────────────────────────────────────────────────

function SkeletonBox({
  width,
  height,
  borderRadius = 8,
  style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.75],
  });

  return (
    <Animated.View
      style={[
        {
          width: width ?? "100%",
          height,
          borderRadius,
          backgroundColor: "#334155",
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─── Swap Screen Skeleton ─────────────────────────────────────────────────────

function SwapSkeleton({ colors }: { colors: any }) {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
      contentContainerStyle={[sk.scroll]}
    >
      <View
        style={[
          sk.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SkeletonBox width={60} height={12} borderRadius={6} />
        <View style={sk.topRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={120} height={38} borderRadius={10} />
            <SkeletonBox width={80} height={12} borderRadius={6} />
          </View>
          <SkeletonBox width={110} height={42} borderRadius={50} />
        </View>
        <View style={sk.balRow}>
          <SkeletonBox width={160} height={12} borderRadius={6} />
          <SkeletonBox width={36} height={12} borderRadius={6} />
        </View>
      </View>

      <View style={sk.swapDirWrap}>
        <SkeletonBox width={44} height={44} borderRadius={22} />
      </View>

      <View
        style={[
          sk.card,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <SkeletonBox width={80} height={12} borderRadius={6} />
        <View style={sk.topRow}>
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width={100} height={38} borderRadius={10} />
            <SkeletonBox width={70} height={12} borderRadius={6} />
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <SkeletonBox width={110} height={42} borderRadius={50} />
            <SkeletonBox width={120} height={12} borderRadius={6} />
          </View>
        </View>
      </View>

      <View style={sk.fieldGroup}>
        <SkeletonBox width={24} height={12} borderRadius={6} />
        <SkeletonBox width="100%" height={64} borderRadius={18} />
      </View>

      <SkeletonBox width="100%" height={50} borderRadius={16} />

      <View style={sk.feeRow}>
        <SkeletonBox width={90} height={12} borderRadius={6} />
        <SkeletonBox width={130} height={12} borderRadius={6} />
      </View>
    </ScrollView>
  );
}

const sk = StyleSheet.create({
  scroll: { padding: Spacing[4], gap: Spacing[3], paddingBottom: 140 },
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  balRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  swapDirWrap: { alignItems: "center", marginVertical: -2, zIndex: 10 },
  fieldGroup: { gap: 8 },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
});

// ─── Quote Skeleton ───────────────────────────────────────────────────────────

function QuoteSkeleton() {
  return (
    <SkeletonBox
      width={120}
      height={38}
      borderRadius={10}
      style={{ marginVertical: 6 }}
    />
  );
}

// ─── Asset Picker ─────────────────────────────────────────────────────────────

function AssetPicker({
  visible,
  title,
  assets,
  loading,
  selectedId,
  balanceMap = {},
  onSelect,
  onClose,
  colors,
}: {
  visible: boolean;
  title: string;
  assets: PlatformAsset[];
  loading: boolean;
  selectedId?: string;
  balanceMap?: Record<string, string>;
  onSelect: (a: PlatformAsset) => void;
  onClose: () => void;
  colors: any;
}) {
  const [search, setSearch] = useState("");
  const filtered = assets.filter(
    (a) =>
      a.symbol.toLowerCase().includes(search.toLowerCase()) ||
      a.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (!visible) return null;

  const Inner = (
    <View style={[pk.sheet, { backgroundColor: colors.card }]}>
      <View style={[pk.handle, { backgroundColor: colors.border }]} />
      <View style={[pk.header, { borderBottomColor: colors.border }]}>
        <Text style={[pk.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => {
            onClose();
            setSearch("");
          }}
          style={[pk.closeBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="close" size={18} color={colors.text2} />
        </TouchableOpacity>
      </View>

      <View
        style={[
          pk.searchBox,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons name="search-outline" size={15} color={colors.text3} />
        <TextInput
          style={[pk.searchInput, { color: colors.text }, webInputReset]}
          placeholder="Search assets..."
          placeholderTextColor={colors.text3}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          underlineColorAndroid="transparent"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={15} color={colors.text3} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ maxHeight: 380 }}
      >
        {loading ? (
          <View style={{ padding: 16, gap: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <View key={i} style={pk.skRow}>
                <SkeletonBox width={42} height={42} borderRadius={21} />
                <View style={{ flex: 1, gap: 6 }}>
                  <SkeletonBox width={60} height={13} borderRadius={6} />
                  <SkeletonBox width={100} height={11} borderRadius={6} />
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <SkeletonBox width={70} height={13} borderRadius={6} />
                  <SkeletonBox width={50} height={11} borderRadius={6} />
                </View>
              </View>
            ))}
          </View>
        ) : filtered.length === 0 ? (
          <Text style={[pk.empty, { color: colors.text2 }]}>
            No assets found
          </Text>
        ) : (
          filtered.map((a) => {
            const bal = balanceMap[a._id] ?? "0";
            return (
              <TouchableOpacity
                key={a._id}
                style={[
                  pk.row,
                  { borderBottomColor: colors.borderSoft },
                  selectedId === a._id && { backgroundColor: TAB_ACTIVE_BG },
                ]}
                onPress={() => {
                  onSelect(a);
                  onClose();
                  setSearch("");
                }}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={getCoinColors(a.symbol)}
                  style={pk.icon}
                >
                  <Text style={pk.iconText}>{(a.symbol ?? "?")[0]}</Text>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[pk.sym, { color: colors.text }]}>
                    {a.symbol}
                  </Text>
                  <Text style={[pk.aname, { color: colors.text2 }]}>
                    {a.name} · {a.chainId}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <Text style={[pk.bal, { color: GREEN }]}>
                    {formatBal(bal, a.decimals)}
                  </Text>
                  {a.priceUsd != null && parseFloat(bal) > 0 && (
                    <Text style={[pk.usd, { color: colors.text3 }]}>
                      {formatUsd(parseFloat(bal) * a.priceUsd)}
                    </Text>
                  )}
                </View>
                {selectedId === a._id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color={GREEN}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );

  if (IS_WEB) {
    return (
      <View style={pk.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
          activeOpacity={1}
        />
        <View
          style={[
            pk.webPanel,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {Inner}
        </View>
      </View>
    );
  }

  return (
    <Modal visible animationType="slide" transparent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={onClose}
          activeOpacity={1}
        />
        {Inner}
      </View>
    </Modal>
  );
}

const pk = StyleSheet.create({
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 24,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "700" },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  skRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  sym: { fontSize: 14, fontWeight: "700" },
  aname: { fontSize: 12, marginTop: 2 },
  bal: { fontSize: 13, fontWeight: "600" },
  usd: { fontSize: 11 },
  empty: { textAlign: "center", padding: 32, fontSize: 14 },
  backdrop: {
    position: "absolute" as any,
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  webPanel: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
});

// ─── PIN Modal ────────────────────────────────────────────────────────────────

function PinModal({
  visible,
  onClose,
  onSuccess,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  colors: any;
}) {
  const [pin, setPinState] = useState("");
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  const handleDigit = (d: string) => {
    if (pin.length >= 4 || verifying) return;
    const next = pin + d;
    setPinState(next);
    setPinError("");
    if (next.length === 4) setTimeout(() => verify(next), 120);
  };

  const verify = async (p: string) => {
    setVerifying(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (p === "1234") {
        setPinState("");
        setPinError("");
        onSuccess();
      } else {
        throw new Error("Invalid PIN");
      }
    } catch {
      setPinError("Incorrect PIN. Try again.");
      setPinState("");
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    setPinState("");
    setPinError("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[pm.overlay, { backgroundColor: "rgba(0,0,0,0.82)" }]}>
        <View
          style={[
            pm.card,
            {
              backgroundColor: colors.card,
              maxWidth: IS_WEB ? 380 : undefined,
            },
          ]}
        >
          <TouchableOpacity style={pm.closeRow} onPress={handleClose}>
            <Ionicons name="close" size={20} color={colors.text2} />
          </TouchableOpacity>
          <View style={[pm.iconWrap, { backgroundColor: TAB_ACTIVE_BG }]}>
            <Ionicons name="swap-horizontal" size={28} color={GREEN} />
          </View>
          <Text style={[pm.title, { color: colors.text }]}>Confirm PIN</Text>
          <Text style={[pm.sub, { color: colors.text2 }]}>
            Enter your 4-digit transaction PIN
          </Text>

          <View style={pm.dots}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View
                key={i}
                style={[
                  pm.dot,
                  { borderColor: colors.border },
                  i < pin.length && {
                    backgroundColor: GREEN,
                    borderColor: GREEN,
                  },
                  !!pinError && {
                    backgroundColor: "#FF5570",
                    borderColor: "#FF5570",
                  },
                ]}
              />
            ))}
          </View>
          {!!pinError && (
            <Text style={[pm.err, { color: "#FF5570" }]}>{pinError}</Text>
          )}
          {verifying && (
            <ActivityIndicator
              color={GREEN}
              size="small"
              style={{ marginTop: 8 }}
            />
          )}

          <View style={pm.keypad}>
            {PIN_KEYS.map((row, ri) => (
              <View key={ri} style={pm.keyRow}>
                {row.map((k, ki) => {
                  if (k === "") return <View key={ki} style={pm.keyEmpty} />;
                  if (k === "del")
                    return (
                      <TouchableOpacity
                        key={ki}
                        style={[
                          pm.key,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() => {
                          setPinState((p) => p.slice(0, -1));
                          setPinError("");
                        }}
                        disabled={verifying}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="backspace-outline"
                          size={22}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    );
                  return (
                    <TouchableOpacity
                      key={ki}
                      style={[
                        pm.key,
                        {
                          backgroundColor: colors.surface,
                          borderColor: colors.border,
                        },
                        verifying && { opacity: 0.4 },
                      ]}
                      onPress={() => handleDigit(k)}
                      disabled={verifying}
                      activeOpacity={0.7}
                    >
                      <Text style={[pm.keyLabel, { color: colors.text }]}>
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: { width: "100%", borderRadius: 28, padding: 24, alignItems: "center" },
  closeRow: { alignSelf: "flex-end", padding: 4 },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  title: { fontSize: 20, fontWeight: "700", marginBottom: 6 },
  sub: { fontSize: 13, textAlign: "center", marginBottom: 24 },
  dots: { flexDirection: "row", gap: 18, marginBottom: 4 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  err: { fontSize: 12, marginTop: 6 },
  keypad: { width: "100%", gap: 12, marginTop: 24 },
  keyRow: { flexDirection: "row", gap: 12 },
  key: {
    flex: 1,
    height: 58,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  keyEmpty: { flex: 1, height: 58 },
  keyLabel: { fontSize: 22, fontWeight: "600" },
});

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({
  visible,
  onClose,
  onConfirm,
  isSending,
  fromAsset,
  toAsset,
  fromAmount,
  quote,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSending: boolean;
  fromAsset: PlatformAsset | null;
  toAsset: PlatformAsset | null;
  fromAmount: string;
  quote: SwapQuote | null;
  colors: any;
}) {
  if (!visible) return null;

  const toNum = parseFloat(quote?.toAmount ?? "0");

  const rows: { label: string; value: string; color: any; mono?: boolean }[] = [
    {
      label: "You Send",
      value: `${fromAmount} ${fromAsset?.symbol}`,
      color: colors.text,
    },
    {
      label: "You Receive",
      value: `${toNum.toFixed(6)} ${toAsset?.symbol}`,
      color: GREEN,
    },
    {
      label: "Min. Received",
      value: `${quote?.minOutDisplay ?? "—"} ${toAsset?.symbol}`,
      color: colors.text,
    },
    {
      label: "Slippage",
      value: `${quote?.slippage ?? 1}%`,
      color: colors.text,
    },
  ];

  return (
    <Modal visible transparent animationType="fade">
      <View style={[cf.overlay, { backgroundColor: "rgba(0,0,0,0.82)" }]}>
        <View
          style={[
            cf.card,
            {
              backgroundColor: colors.card,
              maxWidth: IS_WEB ? 440 : undefined,
            },
          ]}
        >
          <View style={cf.header}>
            <LinearGradient
              colors={["rgba(0,211,149,0.12)", "rgba(0,211,149,0.03)"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={cf.assetRow}>
              {fromAsset && (
                <LinearGradient
                  colors={getCoinColors(fromAsset.symbol)}
                  style={cf.assetCircle}
                >
                  <Text style={cf.assetTxt}>
                    {(fromAsset.symbol ?? "?")[0]}
                  </Text>
                </LinearGradient>
              )}
              <View style={[cf.arrowWrap, { backgroundColor: colors.surface }]}>
                <Ionicons name="arrow-forward" size={16} color={GREEN} />
              </View>
              {toAsset && (
                <LinearGradient
                  colors={getCoinColors(toAsset.symbol)}
                  style={cf.assetCircle}
                >
                  <Text style={cf.assetTxt}>{(toAsset.symbol ?? "?")[0]}</Text>
                </LinearGradient>
              )}
            </View>
            <Text style={[cf.title, { color: colors.text }]}>Confirm Swap</Text>
            <Text style={[cf.sub, { color: colors.text2 }]}>
              {fromAmount} {fromAsset?.symbol} → {toNum.toFixed(4)}{" "}
              {toAsset?.symbol}
            </Text>
          </View>

          <View style={[cf.details, { borderColor: colors.border }]}>
            {rows.map(({ label, value, color, mono }, i, arr) => (
              <View
                key={label}
                style={[
                  cf.detailRow,
                  i < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.borderSoft,
                  },
                ]}
              >
                <Text style={[cf.dLabel, { color: colors.text2 }]}>
                  {label}
                </Text>
                <Text
                  style={[cf.dValue, { color }, mono && cf.mono]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  {value}
                </Text>
              </View>
            ))}
          </View>

          <View style={cf.actions}>
            <TouchableOpacity
              style={[cf.cancelBtn, { backgroundColor: colors.surface }]}
              onPress={onClose}
            >
              <Text style={[cf.cancelTxt, { color: colors.text2 }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cf.confirmBtn, isSending && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={isSending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={
                  isSending ? [colors.surface, colors.surface] : [GREEN, "#0FAE72"]
                }
                style={cf.confirmGrad}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="swap-horizontal" size={16} color="#fff" />
                    <Text style={cf.confirmTxt}>Confirm Swap</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const cf = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: { width: "100%", borderRadius: 28, overflow: "hidden" },
  header: { padding: 24, alignItems: "center" },
  assetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  assetCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  assetTxt: { fontSize: 20, fontWeight: "700", color: "#FFF" },
  arrowWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  sub: { fontSize: 13, textAlign: "center" },
  details: { borderTopWidth: 1, borderBottomWidth: 1 },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 20,
  },
  dLabel: { fontSize: 13 },
  dValue: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 16,
  },
  mono: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  actions: { flexDirection: "row", gap: 12, padding: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 14, fontWeight: "600" },
  confirmBtn: { flex: 2, borderRadius: 14, overflow: "hidden" },
  confirmGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  confirmTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

// ─── Token Card Styles ────────────────────────────────────────────────────────

const tc = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1.5, padding: 18, gap: 10 },
  cardLabel: { fontSize: 12, fontWeight: "600" },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  amountInput: {
    fontSize: 36,
    fontWeight: "700",
    padding: 0,
    flex: 1,
    ...(Platform.OS === "web" &&
      ({
        outlineWidth: 0,
        outlineStyle: "none",
        outlineColor: "transparent",
        boxShadow: "none",
        WebkitAppearance: "none",
      } as any)),
  },
  receiveAmt: { fontSize: 36, fontWeight: "700", flex: 1 },
  usdText: { fontSize: 13, marginTop: 4 },
  rightCol: { alignItems: "flex-end", gap: 8 },
  assetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 50,
    borderWidth: 1,
  },
  assetDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  assetDotText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  assetSymbol: { fontSize: 14, fontWeight: "700" },
  balRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  balText: { fontSize: 12 },
  maxText: { fontSize: 12, fontWeight: "700" },
  errRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  errText: { fontSize: 12 },
});

// ─── Main SwapScreen ──────────────────────────────────────────────────────────

export default function SwapScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const BOTTOM_BAR_HEIGHT = 80;
  const bottomInset = Math.max(
    insets.bottom,
    Platform.OS === "android" ? 16 : 0,
  );

  const ctaBarOffset = BOTTOM_TAB_H + bottomInset;
  const bottomBarTotalHeight = BOTTOM_BAR_HEIGHT + ctaBarOffset + 20;

  const { data: assets = [], isLoading: loadingAssets } = useSwapAssets();

  const [fromAsset, setFromAsset] = useState<PlatformAsset | null>(null);
  const [toAsset, setToAsset] = useState<PlatformAsset | null>(null);
  const [fromAmount, setFromAmount] = useState("");

  const { data: fromBalance = "0", isLoading: loadingFromBal } =
    useAssetBalance(fromAsset?.chainId, fromAsset?._id);

  const { data: toBalance = "0", isLoading: loadingToBal } = useAssetBalance(
    toAsset?.chainId,
    toAsset?._id,
  );

  const [quoteParams, setQuoteParams] = useState<any>(null);

  const {
    data: quote = null,
    isLoading: loadingQuote,
    error: quoteError,
  } = useSwapQuote(quoteParams);

  const executeSwapMutation = useExecuteSwap();
  const isSending = executeSwapMutation.isPending;

  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fromFocused, setFromFocused] = useState(false);

  useEffect(() => {
    if (assets.length >= 1 && !fromAsset) setFromAsset(assets[0]);
    if (assets.length >= 2 && !toAsset) setToAsset(assets[1]);
  }, [assets, fromAsset, toAsset]);

  const quoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (quoteTimer.current) clearTimeout(quoteTimer.current);

    if (!fromAsset || !toAsset || !fromAmount || parseFloat(fromAmount) <= 0) {
      setQuoteParams(null);
      return;
    }

    if (fromAsset._id === toAsset._id) {
      setQuoteParams(null);
      return;
    }

    quoteTimer.current = setTimeout(() => {
      const amountInSmallestUnit = toSmallestUnit(
        fromAmount,
        fromAsset.decimals,
      );

      setQuoteParams({
        chainId: fromAsset.chainId,
        fromAssetId: fromAsset._id,
        toAssetId: toAsset._id,
        amount: amountInSmallestUnit,
        toDecimals: toAsset.decimals,
      });
    }, 600);

    return () => {
      if (quoteTimer.current) clearTimeout(quoteTimer.current);
    };
  }, [fromAmount, fromAsset, toAsset]);

  const fromBalNum = parseFloat(fromBalance);
  const fromAmountNum = parseFloat(fromAmount) || 0;
  const hasInsufficient = fromAmountNum > fromBalNum && fromAmountNum > 0;
  const networkLabel =
    NETWORK_LABELS[toAsset?.chainId ?? ""] ?? toAsset?.chainId ?? "—";
  const toAmountDisplay = loadingQuote ? "" : (quote?.toAmount ?? "");

  const fromUsdVal =
    fromAsset?.priceUsd && fromAmountNum > 0
      ? formatUsd(fromAmountNum * fromAsset.priceUsd)
      : null;
  const toUsdVal =
    toAsset?.priceUsd && toAmountDisplay
      ? formatUsd(parseFloat(toAmountDisplay) * toAsset.priceUsd)
      : null;

  const canReview =
    !!fromAsset &&
    !!toAsset &&
    fromAsset._id !== toAsset._id &&
    fromAmountNum > 0 &&
    !hasInsufficient &&
    !!quote &&
    !loadingQuote &&
    !quoteError &&
    !isSending;

  const handleFromAmountChange = (v: string) => {
    const s = v.replace(/[^0-9.]/g, "");
    if (s.split(".").length > 2) return;
    setFromAmount(s);
  };

  const handleMax = () => {
    if (fromBalNum > 0) setFromAmount(fromBalNum.toString());
  };

  const handleSwapDirection = () => {
    const tmp = fromAsset;
    setFromAsset(toAsset);
    setToAsset(tmp);
    setFromAmount(quote?.toAmount ?? "");
    setQuoteParams(null);
  };

  const handleReview = () => {
    if (canReview) {
      setShowConfirm(true);
    }
  };

  const executeSwap = async () => {
    if (!fromAsset || !toAsset || !quote) return;

    setShowConfirm(false);

    try {
      await executeSwapMutation.mutateAsync({
        chainId: fromAsset.chainId,
        fromAssetId: fromAsset._id,
        toAssetId: toAsset._id,
        amount: toSmallestUnit(fromAmount, fromAsset.decimals),
        minOut: quote.minOut,
      });

      showAlert(
        "Swap Successful 🎉",
        `${fromAmount} ${fromAsset.symbol} → ${parseFloat(quote.toAmount || "0").toFixed(6)} ${toAsset.symbol}`,
        [{ text: "Done", onPress: () => router.back() }],
      );

      setFromAmount("");
      setQuoteParams(null);
    } catch (e: any) {
      const errMsg =
        e?.response?.data?.message ||
        e?.message ||
        "Transaction failed. Please try again.";
      showAlert("Swap Failed", errMsg);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ✅ Header with Back Button */}
      <View
        style={[
          s.header,
          {
            paddingTop: 8,
            backgroundColor: colors.bg,
            borderBottomColor: colors.borderSoft,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: colors.surface }]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Swap</Text>
        <View style={s.headerRight} />
      </View>

      {loadingAssets ? (
        <SwapSkeleton colors={colors} />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            s.scroll,
            { paddingBottom: bottomBarTotalHeight + 20 },
          ]}
        >
          {/* ── You Send card ── */}
          <View
            style={[
              tc.card,
              {
                backgroundColor: fromFocused
                  ? "rgba(0,211,149,0.05)"
                  : colors.card,
                borderColor: hasInsufficient
                  ? "#FF5570"
                  : fromFocused
                    ? GREEN
                    : colors.border,
              },
            ]}
          >
            <Text style={[tc.cardLabel, { color: colors.text2 }]}>
              You Send
            </Text>

            <View style={tc.topRow}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[
                    tc.amountInput,
                    { color: colors.text },
                    webInputReset,
                  ]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={fromAmount}
                  onChangeText={handleFromAmountChange}
                  onFocus={() => setFromFocused(true)}
                  onBlur={() => setFromFocused(false)}
                  underlineColorAndroid="transparent"
                />
                {fromUsdVal && (
                  <Text style={[tc.usdText, { color: colors.text2 }]}>
                    {fromUsdVal}
                  </Text>
                )}
              </View>
              <View style={tc.rightCol}>
                <TouchableOpacity
                  style={[
                    tc.assetPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowFromPicker(true)}
                  activeOpacity={0.8}
                >
                  {fromAsset ? (
                    <>
                      <LinearGradient
                        colors={getCoinColors(fromAsset.symbol)}
                        style={tc.assetDot}
                      >
                        <Text style={tc.assetDotText}>
                          {(fromAsset.symbol ?? "?")[0]}
                        </Text>
                      </LinearGradient>
                      <Text style={[tc.assetSymbol, { color: colors.text }]}>
                        {fromAsset.symbol}
                      </Text>
                    </>
                  ) : (
                    <Text style={[tc.assetSymbol, { color: colors.text3 }]}>
                      Select
                    </Text>
                  )}
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color={colors.text2}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={tc.balRow}>
              {loadingFromBal ? (
                <SkeletonBox width={160} height={12} borderRadius={6} />
              ) : (
                <Text style={[tc.balText, { color: colors.text2 }]}>
                  Balance:{" "}
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {formatBal(fromBalance, fromAsset?.decimals ?? 6)}{" "}
                    {fromAsset?.symbol ?? ""}
                  </Text>
                </Text>
              )}
              <TouchableOpacity
                onPress={handleMax}
                disabled={!fromAsset || loadingFromBal}
              >
                <Text
                  style={[
                    tc.maxText,
                    {
                      color:
                        fromAsset && !loadingFromBal ? GREEN : colors.text3,
                    },
                  ]}
                >
                  MAX
                </Text>
              </TouchableOpacity>
            </View>

            {hasInsufficient && (
              <View style={tc.errRow}>
                <Ionicons
                  name="alert-circle-outline"
                  size={13}
                  color="#FF5570"
                />
                <Text style={[tc.errText, { color: "#FF5570" }]}>
                  Insufficient. Available:{" "}
                  {formatBal(fromBalance, fromAsset?.decimals)}{" "}
                  {fromAsset?.symbol}
                </Text>
              </View>
            )}
          </View>

          {/* ── Swap direction button ── */}
          <View style={s.swapDirWrap}>
            <TouchableOpacity
              onPress={handleSwapDirection}
              style={[
                s.swapDirCircle,
                { backgroundColor: colors.bg, borderColor: colors.border },
              ]}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* ── You Receive card ── */}
          <View
            style={[
              tc.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[tc.cardLabel, { color: colors.text2 }]}>
              You Receive
            </Text>

            <View style={tc.topRow}>
              <View style={{ flex: 1 }}>
                {loadingQuote ? (
                  <QuoteSkeleton />
                ) : (
                  <Text style={[tc.receiveAmt, { color: colors.text }]}>
                    {toAmountDisplay || "0.00"}
                  </Text>
                )}
                {toUsdVal && !loadingQuote && (
                  <Text style={[tc.usdText, { color: colors.text2 }]}>
                    {toUsdVal}
                  </Text>
                )}
              </View>
              <View style={tc.rightCol}>
                <TouchableOpacity
                  style={[
                    tc.assetPill,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => setShowToPicker(true)}
                  activeOpacity={0.8}
                >
                  {toAsset ? (
                    <>
                      <LinearGradient
                        colors={getCoinColors(toAsset.symbol)}
                        style={tc.assetDot}
                      >
                        <Text style={tc.assetDotText}>
                          {(toAsset.symbol ?? "?")[0]}
                        </Text>
                      </LinearGradient>
                      <Text style={[tc.assetSymbol, { color: colors.text }]}>
                        {toAsset.symbol}
                      </Text>
                    </>
                  ) : (
                    <Text style={[tc.assetSymbol, { color: colors.text3 }]}>
                      Select
                    </Text>
                  )}
                  <Ionicons
                    name="chevron-down"
                    size={13}
                    color={colors.text2}
                  />
                </TouchableOpacity>
                {loadingToBal ? (
                  <SkeletonBox width={130} height={12} borderRadius={6} />
                ) : (
                  <Text style={[tc.balText, { color: colors.text2 }]}>
                    Balance:{" "}
                    <Text style={{ color: colors.text, fontWeight: "600" }}>
                      {formatBal(toBalance, toAsset?.decimals ?? 6)}{" "}
                      {toAsset?.symbol ?? ""}
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* ── Quote error banner ── */}
          {quoteError && (
            <View
              style={[
                s.errBanner,
                {
                  backgroundColor: "rgba(255,77,106,0.10)",
                  borderColor: "rgba(255,77,106,0.30)",
                },
              ]}
            >
              <Ionicons name="warning-outline" size={15} color="#FF5570" />
              <Text style={[s.errBannerText, { color: "#FF5570" }]}>
                {(quoteError as any)?.response?.data?.message ||
                  (quoteError as any)?.message ||
                  "Could not fetch quote. Try again."}
              </Text>
            </View>
          )}

          {/* ── Network info ── */}
          {fromAsset && toAsset && (
            <>
              <View
                style={[
                  s.infoRow,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.borderSoft,
                  },
                ]}
              >
                <View style={s.infoLeft}>
                  <Ionicons
                    name="layers-outline"
                    size={15}
                    color={colors.text3}
                  />
                  <Text style={[s.infoLabel, { color: colors.text2 }]}>
                    Network
                  </Text>
                </View>
                <Text style={[s.infoValue, { color: colors.text }]}>
                  {networkLabel}
                </Text>
              </View>

              <View style={s.feeRow}>
                <Text style={[s.feeLabel, { color: colors.text2 }]}>
                  Min. Received
                </Text>
                {loadingQuote ? (
                  <SkeletonBox width={140} height={12} borderRadius={6} />
                ) : (
                  <Text style={[s.feeValue, { color: colors.text }]}>
                    {quote?.minOutDisplay ?? "—"} {toAsset.symbol} (
                    {quote?.slippage ?? 1}% slippage)
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}

      {/* ── Bottom CTA ── */}
      <View
        style={[
          s.bottomBar,
          {
            bottom: ctaBarOffset,
            paddingBottom: 12,
            backgroundColor: colors.bg,
            borderTopColor: colors.borderSoft,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleReview}
          disabled={!canReview || loadingAssets}
          activeOpacity={0.85}
          style={{ width: "100%" }}
        >
          <LinearGradient
            colors={
              canReview ? [GREEN, "#0FAE72"] : [colors.surface, colors.surface]
            }
            style={[
              s.reviewBtn,
              !canReview && { borderWidth: 1, borderColor: colors.border },
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {isSending ? (
              <ActivityIndicator color={canReview ? "#fff" : colors.text3} />
            ) : (
              <>
                <Ionicons
                  name="swap-horizontal"
                  size={18}
                  color={canReview ? "#fff" : colors.text3}
                />
                <Text
                  style={[
                    s.reviewBtnText,
                    { color: canReview ? "#fff" : colors.text3 },
                  ]}
                >
                  Review Transaction
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <AssetPicker
        visible={showFromPicker}
        title="You Send"
        assets={assets}
        loading={loadingAssets}
        selectedId={fromAsset?._id}
        onSelect={(a) => {
          if (a._id === toAsset?._id) setToAsset(fromAsset);
          setFromAsset(a);
          setFromAmount("");
          setQuoteParams(null);
        }}
        onClose={() => setShowFromPicker(false)}
        colors={colors}
      />
      <AssetPicker
        visible={showToPicker}
        title="You Receive"
        assets={assets}
        loading={loadingAssets}
        selectedId={toAsset?._id}
        onSelect={(a) => {
          if (a._id === fromAsset?._id) setFromAsset(toAsset);
          setToAsset(a);
          setQuoteParams(null);
        }}
        onClose={() => setShowToPicker(false)}
        colors={colors}
      />

      <ConfirmModal
        visible={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={executeSwap}
        isSending={isSending}
        fromAsset={fromAsset}
        toAsset={toAsset}
        fromAmount={fromAmount}
        quote={quote}
        colors={colors}
      />
    </View>
  );
}

// ─── Screen-level Styles ──────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // ✅ Header Styles
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Typography.xl,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 40, // Spacer to center title
  },

  scroll: { padding: Spacing[4], gap: Spacing[3] },

  swapDirWrap: { alignItems: "center", marginVertical: -2, zIndex: 10 },
  swapDirCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },

  errBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  errBannerText: { fontSize: 13, flex: 1 },

  fieldGroup: { gap: 8 },
  fieldLabel: { fontSize: Typography.sm, fontWeight: "600", marginLeft: 2 },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  infoLabel: { fontSize: Typography.sm },
  infoValue: { fontSize: Typography.sm, fontWeight: "600" },

  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  feeLabel: { fontSize: Typography.sm },
  feeValue: { fontSize: Typography.sm, fontWeight: "600" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    borderTopWidth: 1,
    elevation: 999,
    zIndex: 999,
  },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 17,
    borderRadius: Radius["2xl"],
  },
  reviewBtnText: {
    fontSize: Typography.base,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});