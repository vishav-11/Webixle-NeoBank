// app/(screens)/Buy/BuyMain.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Dimensions, Platform,
  Linking, Alert, Image, FlatList, Animated, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons }          from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser       from "expo-web-browser";
import { useTheme }          from "@/context/ThemeContext";
import {
  Spacing, Typography, Radius,
  IconSize, IconBox, getShadow,
} from "@/styles/theme";
import Svg, {
  Path, Defs,
  LinearGradient as SvgLinearGradient,
  Stop, Circle,
} from "react-native-svg";

import {
  useBuyableCryptos, useSellableCryptos,
  useCreateBuyTransaction, useCreateSellTransaction,
  useMoonPayBuyQuote, useMoonPaySellQuote,
  useMoonPayFiatCurrencies, useMoonPayCountries,
  useMoonPayTransactions, useMoonPayTransactionStatus,
} from "@/hooks/queires";
import type { BuyableCrypto }         from "@/types/platformAsset";
import type {
  MoonPayFiatCurrency, MoonPayCountry, MoonPayTransactionListItem,
} from "@/services/moonpayService";
import { useDebounce } from "@/hooks/useDebounce";

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W  = SCREEN_W - Spacing[4] * 2;
const CHART_H  = 160;
const ITEM_H   = 64;
const CITEM_H  = 60;

const RETURN_URL_NATIVE = __DEV__
  ? "http://localhost:8081/conversion-return.html"
  : "https://app.yourmetavault.com/conversion-return.html";
const RETURN_URL_WEB = __DEV__
  ? "http://localhost:8081/conversion-return.html"
  : "https://app.yourmetavault.com/conversion-return.html";
const RETURN_URL = Platform.OS === "web" ? RETURN_URL_WEB : RETURN_URL_NATIVE;

WebBrowser.warmUpAsync().catch(() => {});

// ─── Asset colours ────────────────────────────────────────────────────────────
const ASSET_COLORS: Record<string, { bg: string; text: string }> = {
  BTC:  { bg: "#F7931A", text: "#fff" },
  ETH:  { bg: "#627EEA", text: "#fff" },
  USDT: { bg: "#26A17B", text: "#fff" },
  USDC: { bg: "#2775CA", text: "#fff" },
  BNB:  { bg: "#F3BA2F", text: "#000" },
  SOL:  { bg: "#9945FF", text: "#fff" },
  TRX:  { bg: "#EF0027", text: "#fff" },
  XRP:  { bg: "#23292F", text: "#fff" },
};
const assetColor = (s: string) =>
  ASSET_COLORS[s?.toUpperCase()] ?? { bg: "#3D6170", text: "#fff" };

// ─── TX Status Config ─────────────────────────────────────────────────────────
// ✅ Colors here are STATUS colors (not brand) — kept as-is intentionally
const TX_STATUS_CONFIG: Record<string, {
  color: string; icon: string; label: string;
  description: string; isPending: boolean;
}> = {
  PENDING:              { color: "#F59E0B", icon: "time-outline",     label: "Pending",         description: "Your transaction is being processed",      isPending: true  },
  PROCESSING:           { color: "#3B82F6", icon: "sync-outline",     label: "Processing",      description: "MoonPay is processing your transaction",   isPending: true  },
  WAITINGPAYMENT:       { color: "#8B5CF6", icon: "wallet-outline",   label: "Waiting Payment", description: "Waiting for your payment to be confirmed", isPending: true  },
  WAITINGAUTHORIZATION: { color: "#F59E0B", icon: "shield-outline",   label: "Awaiting Auth",   description: "Authorization required",                   isPending: true  },
  COMPLETED:            { color: "#10B981", icon: "checkmark-circle", label: "Completed",       description: "Transaction completed successfully!",       isPending: false },
  FAILED:               { color: "#EF4444", icon: "close-circle",     label: "Failed",          description: "Transaction failed. Please try again.",    isPending: false },
  CANCELLED:            { color: "#6B7280", icon: "ban-outline",      label: "Cancelled",       description: "Transaction was cancelled",                isPending: false },
};

function getStatusConfig(status: string) {
  return TX_STATUS_CONFIG[(status ?? "PENDING").toUpperCase()] ?? TX_STATUS_CONFIG["PENDING"];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFlagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return "🏳️";
  const pts = alpha2.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return dateStr; }
}

function formatTxId(txId: string): string {
  if (!txId) return "N/A";
  if (txId.length <= 16) return txId;
  return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
}

// ─── Chart ────────────────────────────────────────────────────────────────────
function generateChartData(base: number, points = 40, tf: string): number[] {
  const v = tf === "1D" ? 0.01 : tf === "1W" ? 0.03 : tf === "1M" ? 0.08 : 0.25;
  const data = [base * 0.92];
  for (let i = 1; i < points; i++) {
    const prev = data[i - 1];
    data.push(Math.max(prev + prev * v * (Math.random() - 0.45), base * 0.4));
  }
  data[data.length - 1] = base;
  return data;
}

function PriceChart({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data.length) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pad = 12;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (CHART_W - pad * 2),
    y: pad + ((max - v) / range) * (CHART_H - pad * 2),
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${CHART_H} L${pts[0].x},${CHART_H} Z`;
  const last = pts[pts.length - 1];
  // ✅ Chart line color — positive/negative chart color (not brand)
  const clr  = positive ? "#00D395" : "#FF4D6A";
  return (
    <Svg width={CHART_W} height={CHART_H}>
      <Defs>
        <SvgLinearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%"   stopColor={clr} stopOpacity="0.3" />
          <Stop offset="100%" stopColor={clr} stopOpacity="0"   />
        </SvgLinearGradient>
      </Defs>
      <Path d={area} fill="url(#cg)" />
      <Path d={line} stroke={clr} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={last.x} cy={last.y} r={5}  fill={clr} />
      <Circle cx={last.x} cy={last.y} r={10} fill={clr} opacity={0.2} />
    </Svg>
  );
}

const TIMEFRAMES    = ["1D", "1W", "1M", "1Y"];
const QUICK_AMOUNTS = [50, 100, 250, 500];

// ─── Asset Icon ───────────────────────────────────────────────────────────────
function AssetIcon({ asset, size = 44 }: { asset: BuyableCrypto; size?: number }) {
  const [imgErr, setImgErr] = useState(false);
  const clr = assetColor(asset.symbol);
  if (asset.moonpayIcon && !imgErr) {
    return (
      <Image
        source={{ uri: asset.moonpayIcon }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: clr.bg, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: clr.text, fontSize: size * 0.4, fontWeight: Typography.extrabold }}>
        {asset.symbol[0]}
      </Text>
    </View>
  );
}

function CryptoInitialIcon({ symbol, size = 36 }: { symbol: string; size?: number }) {
  const clr = assetColor(symbol);
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: clr.bg, alignItems: "center", justifyContent: "center",
    }}>
      <Text style={{ color: clr.text, fontSize: size * 0.38, fontWeight: Typography.extrabold }}>
        {symbol?.[0] ?? "?"}
      </Text>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION STATUS MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function TransactionStatusModal({
  visible, colors, transactionId, initialData, onClose, onOpenUrl,
}: {
  visible:       boolean;
  colors:        any;
  transactionId: string | null;
  initialData?:  {
    url?: string; asset?: string;
    amount?: number; currency?: string; type?: "buy" | "sell";
  };
  onClose:    () => void;
  onOpenUrl?: (url: string) => void;
}) {
  const { data: txData, isFetching, refetch } =
    useMoonPayTransactionStatus(transactionId, visible && !!transactionId);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const statusConfig = useMemo(() => getStatusConfig(txData?.status ?? "PENDING"), [txData]);

  useEffect(() => {
    if (!statusConfig.isPending) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [statusConfig.isPending]);

  if (!visible) return null;

  const md         = (txData as any)?.moonpayData;
  const paidAmt    = md?.baseCurrencyAmount  ?? initialData?.amount ?? 0;
  const cryptoAmt  = md?.quoteCurrencyAmount ?? parseFloat(txData?.cryptoAmount ?? "0");
  const feeAmt     = ((md?.feeAmount ?? 0) + (md?.networkFeeAmount ?? 0)).toFixed(2);
  const cryptoCode = txData?.currencyCode    ?? initialData?.asset ?? "";
  const fiatCode   = txData?.baseCurrencyCode ?? initialData?.currency ?? "USD";
  const txHash     = md?.cryptoTransactionId ?? null;

  // ✅ Buy = accent (blue) / Sell = red — action colors
  const typeColor = initialData?.type === "buy" ? colors.accent : colors.red;

  return (
    <View style={[txm.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[
        txm.sheet,
        { backgroundColor: colors.card, borderColor: colors.border },
        getShadow(true, "lg"),
      ]}>
        <TouchableOpacity style={txm.closeBtn} onPress={onClose}>
          <Ionicons name="close" size={IconSize.md} color={colors.text2} />
        </TouchableOpacity>

        <View style={txm.iconWrap}>
          <Animated.View style={[
            txm.iconOuter,
            { backgroundColor: `${statusConfig.color}18`, transform: [{ scale: pulseAnim }] },
          ]}>
            <View style={[txm.iconInner, { backgroundColor: `${statusConfig.color}28` }]}>
              <Ionicons name={statusConfig.icon as any} size={IconSize['2xl']} color={statusConfig.color} />
            </View>
          </Animated.View>
        </View>

        <Text style={[txm.statusLabel, { color: statusConfig.color }]}>{statusConfig.label}</Text>
        <Text style={[txm.statusDesc,  { color: colors.text2 }]}>{statusConfig.description}</Text>

        <View style={[txm.detailsBox, { backgroundColor: colors.surface }]}>
          {/* Type row */}
          <View style={txm.detailRow}>
            <Text style={[txm.detailKey, { color: colors.text3 }]}>Type</Text>
            <Text style={[txm.detailVal, { color: typeColor }]}>
              {(initialData?.type ?? "buy") === "buy" ? "Buy Crypto" : "Sell Crypto"}
            </Text>
          </View>
          {/* Asset */}
          {cryptoCode ? (
            <View style={txm.detailRow}>
              <Text style={[txm.detailKey, { color: colors.text3 }]}>Asset</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing[2] }}>
                <CryptoInitialIcon symbol={cryptoCode} size={18} />
                <Text style={[txm.detailVal, { color: colors.text }]}>{cryptoCode}</Text>
              </View>
            </View>
          ) : null}
          {/* Amount Paid */}
          {paidAmt > 0 ? (
            <View style={txm.detailRow}>
              <Text style={[txm.detailKey, { color: colors.text3 }]}>Amount Paid</Text>
              <Text style={[txm.detailVal, { color: colors.text }]}>
                {fiatCode} {Number(paidAmt).toFixed(2)}
              </Text>
            </View>
          ) : null}
          {/* You Receive */}
          {cryptoAmt > 0 ? (
            <View style={txm.detailRow}>
              <Text style={[txm.detailKey, { color: colors.text3 }]}>You Receive</Text>
              <Text style={[txm.detailVal, { color: colors.accent }]}>
                {Number(cryptoAmt).toFixed(6)} {cryptoCode}
              </Text>
            </View>
          ) : null}
          {/* Fee */}
          {parseFloat(feeAmt) > 0 ? (
            <View style={txm.detailRow}>
              <Text style={[txm.detailKey, { color: colors.text3 }]}>Total Fee</Text>
              <Text style={[txm.detailVal, { color: colors.text2 }]}>
                {fiatCode} {feeAmt}
              </Text>
            </View>
          ) : null}
          {/* Blockchain TX */}
          {txHash ? (
            <View style={txm.detailRow}>
              <Text style={[txm.detailKey, { color: colors.text3 }]}>Blockchain TX</Text>
              <Text style={[txm.detailVal, { color: colors.accent, fontSize: Typography.xs }]}>
                {formatTxId(txHash)}
              </Text>
            </View>
          ) : null}
          {/* TX ID */}
          <View style={[txm.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={[txm.detailKey, { color: colors.text3 }]}>Transaction ID</Text>
            <Text style={[txm.detailVal, {
              color:      colors.text,
              fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
              fontSize:   Typography.xs,
            }]}>
              {formatTxId(transactionId ?? "")}
            </Text>
          </View>
        </View>

        {statusConfig.isPending && (
          <View style={[txm.pollRow, { backgroundColor: `${statusConfig.color}12` }]}>
            <ActivityIndicator size="small" color={statusConfig.color} />
            <Text style={[txm.pollTxt, { color: statusConfig.color }]}>
              {isFetching ? "Checking status..." : "Auto-refreshing every 8s"}
            </Text>
          </View>
        )}

        <View style={txm.btnRow}>
          {/* Refresh */}
          <TouchableOpacity
            style={[txm.btnSec, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => refetch()}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={IconSize.sm} color={colors.text2} />
            <Text style={[txm.btnSecTxt, { color: colors.text2 }]}>Refresh</Text>
          </TouchableOpacity>
          {/* Continue */}
          {initialData?.url && (
            <TouchableOpacity
              style={[txm.btnPri, { backgroundColor: colors.primary }]}
              onPress={() => initialData.url && onOpenUrl?.(initialData.url)}
              activeOpacity={0.85}
            >
              <Ionicons name="open-outline" size={IconSize.sm} color="#fff" />
              <Text style={txm.btnPriTxt}>Continue</Text>
            </TouchableOpacity>
          )}
        </View>

        {!statusConfig.isPending && (
          <TouchableOpacity
            style={[
              txm.doneBtn,
              {
                backgroundColor: txData?.status?.toUpperCase() === "COMPLETED"
                  ? colors.primary
                  : colors.surface,
              },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={[txm.doneTxt, {
              color: txData?.status?.toUpperCase() === "COMPLETED"
                ? "#fff"
                : colors.text2,
            }]}>
              {txData?.status?.toUpperCase() === "COMPLETED" ? "🎉 Done" : "Close"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const txm = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, zIndex: 300, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing[5] },
  sheet:       { width: "100%", maxWidth: 390, borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[5], alignItems: "center" },
  closeBtn:    { position: "absolute", top: Spacing[3], right: Spacing[3], padding: Spacing[2], zIndex: 10 },
  iconWrap:    { marginTop: Spacing[4], marginBottom: Spacing[3] },
  iconOuter:   { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  iconInner:   { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" },
  statusLabel: { fontSize: Typography.xl, fontWeight: Typography.extrabold, marginBottom: Spacing[1] },
  statusDesc:  { fontSize: Typography.sm, textAlign: "center", marginBottom: Spacing[4], paddingHorizontal: Spacing[3], lineHeight: Typography.lineHeightBase },
  detailsBox:  { width: "100%", borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[3] },
  detailRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing[2], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(128,128,128,0.15)" },
  detailKey:   { fontSize: Typography.xs, fontWeight: Typography.semibold },
  detailVal:   { fontSize: Typography.sm, fontWeight: Typography.bold },
  pollRow:     { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], marginBottom: Spacing[3], width: "100%" },
  pollTxt:     { fontSize: Typography.xs, fontWeight: Typography.semibold },
  btnRow:      { flexDirection: "row", gap: Spacing[2], width: "100%", marginBottom: Spacing[2] },
  btnSec:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[2], paddingVertical: Spacing[3], borderRadius: Radius.xl, borderWidth: 1 },
  btnSecTxt:   { fontSize: Typography.sm, fontWeight: Typography.semibold },
  btnPri:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[2], paddingVertical: Spacing[3], borderRadius: Radius.xl },
  btnPriTxt:   { color: "#fff", fontSize: Typography.sm, fontWeight: Typography.bold },
  doneBtn:     { width: "100%", paddingVertical: Spacing[3], borderRadius: Radius.xl, alignItems: "center" },
  doneTxt:     { fontSize: Typography.base, fontWeight: Typography.bold },
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSACTION HISTORY MODAL
// ═══════════════════════════════════════════════════════════════════════════════
function TransactionHistoryModal({
  visible, colors, onClose, onSelectTx,
}: {
  visible: boolean; colors: any;
  onClose: () => void; onSelectTx: (txId: string) => void;
}) {
  const { data: transactions = [], isLoading, refetch, isFetching } = useMoonPayTransactions();

  const renderItem = useCallback(({ item }: { item: MoonPayTransactionListItem }) => {
    const cfg           = getStatusConfig(item.status);
    const isBuy         = item.type !== "sell";
    const txIdForStatus = item.moonpayTransactionId || item.id || item._id || "";
    // ✅ Buy = accent, Sell = red
    const typeColor = isBuy ? colors.accent : colors.red;

    return (
      <TouchableOpacity
        style={[txh.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => { onSelectTx(txIdForStatus); onClose(); }}
        activeOpacity={0.8}
      >
        <View style={txh.iconWrap}>
          <CryptoInitialIcon symbol={item.currencyCode} size={38} />
          <View style={[txh.typeBadge, { backgroundColor: `${typeColor}22` }]}>
            <Ionicons name={isBuy ? "arrow-down" : "arrow-up"} size={9} color={typeColor} />
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <View style={txh.rowTop}>
            <Text style={[txh.symbol, { color: colors.text }]}>
              {isBuy ? "Buy" : "Sell"} {item.currencyCode}
            </Text>
            <View style={[txh.statusPill, { backgroundColor: `${cfg.color}20` }]}>
              <View style={[txh.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[txh.statusTxt, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
          <Text style={[txh.date, { color: colors.text3 }]}>
            {formatDate(item.createdAt)} · {formatTxId(txIdForStatus)}
          </Text>
        </View>
        <View style={txh.amtWrap}>
          <Text style={[txh.amt, { color: colors.text }]}>
            {item.baseCurrencyCode} {Number(item.baseCurrencyAmount).toFixed(2)}
          </Text>
          {item.quoteCurrencyAmount > 0 && (
            <Text style={[txh.subAmt, { color: colors.accent }]}>
              ≈{item.quoteCurrencyAmount.toFixed(6)}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={IconSize.xs} color={colors.text3} />
      </TouchableOpacity>
    );
  }, [colors, onSelectTx, onClose]);

  const keyExtractor = useCallback(
    (item: MoonPayTransactionListItem) => item._id || item.id, [],
  );

  if (!visible) return null;
  return (
    <View style={[mds.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[mds.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={mds.header}>
          <Text style={[mds.title, { color: colors.text }]}>Transaction History</Text>
          <View style={{ flexDirection: "row", gap: Spacing[3], alignItems: "center" }}>
            <TouchableOpacity onPress={() => refetch()}>
              <Ionicons
                name="refresh"
                size={IconSize.sm}
                color={isFetching ? colors.accent : colors.text2}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={IconSize.md} color={colors.text2} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={[mds.sub, { color: colors.text3 }]}>Tap any transaction to view live status</Text>

        {isLoading ? (
          <View style={mds.loader}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[mds.loaderTxt, { color: colors.text2 }]}>Loading transactions...</Text>
          </View>
        ) : transactions.length === 0 ? (
          <View style={mds.empty}>
            <Ionicons name="receipt-outline" size={IconSize['2xl']} color={colors.text3} />
            <Text style={[mds.emptyTitle, { color: colors.text2 }]}>No transactions yet</Text>
            <Text style={[mds.emptySub,   { color: colors.text3 }]}>Your buy/sell history will appear here</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 480 }}
            contentContainerStyle={{ gap: Spacing[2], paddingBottom: Spacing[2] }}
            refreshControl={
              <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />
            }
          />
        )}
      </View>
    </View>
  );
}

const txh = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3] },
  iconWrap:   { position: "relative" },
  typeBadge:  { position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowTop:     { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginBottom: Spacing[1] },
  symbol:     { fontSize: Typography.sm, fontWeight: Typography.bold },
  statusPill: { flexDirection: "row", alignItems: "center", gap: Spacing[1], paddingHorizontal: Spacing[2], paddingVertical: 3, borderRadius: Radius.full },
  statusDot:  { width: 5, height: 5, borderRadius: 2.5 },
  statusTxt:  { fontSize: Typography.xs, fontWeight: Typography.bold },
  date:       { fontSize: Typography.xs },
  amtWrap:    { alignItems: "flex-end", gap: 2 },
  amt:        { fontSize: Typography.xs, fontWeight: Typography.bold },
  subAmt:     { fontSize: Typography.xs, fontWeight: Typography.semibold },
});

// ─── AssetSelector ────────────────────────────────────────────────────────────
function AssetSelector({ visible, colors, assets, selected, onSelect, onClose, mode }: {
  visible: boolean; colors: any; assets: BuyableCrypto[];
  selected: BuyableCrypto | null; onSelect: (a: BuyableCrypto) => void;
  onClose: () => void; mode: "buy" | "sell";
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => assets.filter(a =>
    a.symbol.toLowerCase().includes(search.toLowerCase()) ||
    a.name.toLowerCase().includes(search.toLowerCase())
  ), [assets, search]);

  const renderItem = useCallback(({ item }: { item: BuyableCrypto }) => {
    const isSel = selected?.platformAssetId === item.platformAssetId;
    const limitTxt = mode === "buy"
      ? item.minBuyAmount  ? `Min $${item.minBuyAmount}` : ""
      : item.minSellAmount ? `Min ${item.minSellAmount} ${item.symbol}` : "";
    return (
      <TouchableOpacity
        style={[
          asel.row,
          { borderColor: isSel ? colors.primary : colors.border },
          isSel && { backgroundColor: colors.primaryDim },
        ]}
        onPress={() => { onSelect(item); onClose(); setSearch(""); }}
        activeOpacity={0.8}
      >
        <AssetIcon asset={item} size={42} />
        <View style={{ flex: 1 }}>
          <View style={asel.rowTop}>
            <Text style={[asel.symbol, { color: colors.text }]}>{item.symbol}</Text>
            <View style={[asel.chainBadge, { backgroundColor: colors.surface }]}>
              <Text style={[asel.chainTxt, { color: colors.text3 }]}>{item.chainId}</Text>
            </View>
          </View>
          <Text style={[asel.name, { color: colors.text2 }]}>{item.name}</Text>
          {limitTxt ? <Text style={[asel.limit, { color: colors.text3 }]}>{limitTxt}</Text> : null}
        </View>
        {isSel && <Ionicons name="checkmark-circle" size={IconSize.md} color={colors.primary} />}
      </TouchableOpacity>
    );
  }, [selected, colors, onSelect, onClose, mode]);

  const keyExtractor  = useCallback((item: BuyableCrypto) => `${item.symbol}_${item.chainId}`, []);
  const getItemLayout = useCallback((_: any, i: number) => ({ length: ITEM_H, offset: ITEM_H * i, index: i }), []);

  if (!visible) return null;
  return (
    <View style={[mds.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[mds.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={mds.header}>
          <Text style={[mds.title, { color: colors.text }]}>
            {mode === "buy" ? "Buy Which Crypto?" : "Sell Which Crypto?"}
          </Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(""); }}>
            <Ionicons name="close" size={IconSize.md} color={colors.text2} />
          </TouchableOpacity>
        </View>
        <View style={[mds.searchBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={IconSize.sm} color={colors.text3} />
          <TextInput
            style={[mds.searchInput, { color: colors.text }]}
            value={search} onChangeText={setSearch}
            placeholder="Search crypto..." placeholderTextColor={colors.text3} autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={IconSize.sm} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[mds.count, { color: colors.text3 }]}>{filtered.length} assets available</Text>
        {filtered.length === 0 ? (
          <View style={mds.empty}>
            <Ionicons name="search-outline" size={IconSize['2xl']} color={colors.text3} />
            <Text style={[mds.emptyTitle, { color: colors.text3 }]}>No assets found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered} renderItem={renderItem} keyExtractor={keyExtractor}
            getItemLayout={getItemLayout} showsVerticalScrollIndicator={false}
            initialNumToRender={15} maxToRenderPerBatch={20} windowSize={5}
            style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

const asel = StyleSheet.create({
  row:        { flexDirection: "row", alignItems: "center", gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing[2], minHeight: ITEM_H },
  rowTop:     { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  symbol:     { fontSize: Typography.base, fontWeight: Typography.bold },
  chainBadge: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  chainTxt:   { fontSize: Typography.xs, fontWeight: Typography.semibold },
  name:       { fontSize: Typography.xs, marginTop: 2 },
  limit:      { fontSize: Typography.xs, marginTop: 1 },
});

// ─── FiatSelector ─────────────────────────────────────────────────────────────
function FiatSelector({ visible, colors, mode, selected, onSelect, onClose }: {
  visible: boolean; colors: any; mode: "buy" | "sell";
  selected: string; onSelect: (c: MoonPayFiatCurrency) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data: allFiats = [], isLoading } = useMoonPayFiatCurrencies();
  const filtered = useMemo(() => {
    const f = allFiats.filter(c => mode === "buy" ? c.isBuySupported : c.isSellSupported);
    if (!search.trim()) return f;
    const q = search.toLowerCase();
    return f.filter(c => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q));
  }, [allFiats, mode, search]);

  const renderItem = useCallback(({ item }: { item: MoonPayFiatCurrency }) => {
    const isSel = item.code.toLowerCase() === selected.toLowerCase();
    return (
      <TouchableOpacity
        style={[
          mds.row,
          { borderColor: isSel ? colors.primary : colors.border },
          isSel && { backgroundColor: colors.primaryDim },
        ]}
        onPress={() => { onSelect(item); onClose(); setSearch(""); }}
        activeOpacity={0.8}
      >
        <Text style={mds.flag}>{item.flagEmoji ?? "🏳️"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[mds.rowCode, { color: colors.text }]}>{item.code.toUpperCase()}</Text>
          <Text style={[mds.rowName, { color: colors.text2 }]} numberOfLines={1}>{item.name}</Text>
        </View>
        <Text style={[mds.rowSymbol, { color: colors.text2 }]}>{item.symbol ?? item.code.toUpperCase()}</Text>
        {isSel && <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} style={{ marginLeft: Spacing[2] }} />}
      </TouchableOpacity>
    );
  }, [selected, colors, onSelect, onClose]);

  const keyExtractor  = useCallback((item: MoonPayFiatCurrency) => item.code, []);
  const getItemLayout = useCallback((_: any, i: number) => ({ length: ITEM_H, offset: ITEM_H * i, index: i }), []);

  if (!visible) return null;
  return (
    <View style={[mds.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[mds.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={mds.header}>
          <Text style={[mds.title, { color: colors.text }]}>
            {mode === "buy" ? "Pay With Currency" : "Receive Currency"}
          </Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(""); }}>
            <Ionicons name="close" size={IconSize.md} color={colors.text2} />
          </TouchableOpacity>
        </View>
        {/* Mode badge */}
        <View style={[mds.modeBadge, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name={mode === "buy" ? "card-outline" : "cash-outline"} size={IconSize.xs} color={colors.primary} />
          <Text style={[mds.modeTxt, { color: colors.primary }]}>
            {mode === "buy" ? "Currencies accepted for payment" : "Currencies you can receive"}
          </Text>
        </View>
        <View style={[mds.searchBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={IconSize.sm} color={colors.text3} />
          <TextInput
            style={[mds.searchInput, { color: colors.text }]}
            value={search} onChangeText={setSearch}
            placeholder="Search currency..." placeholderTextColor={colors.text3} autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={IconSize.sm} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[mds.count, { color: colors.text3 }]}>{filtered.length} currencies available</Text>
        {isLoading ? (
          <View style={mds.loader}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[mds.loaderTxt, { color: colors.text2 }]}>Loading currencies...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={mds.empty}>
            <Ionicons name="search-outline" size={IconSize['2xl']} color={colors.text3} />
            <Text style={[mds.emptyTitle, { color: colors.text3 }]}>No currencies found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered} renderItem={renderItem} keyExtractor={keyExtractor}
            getItemLayout={getItemLayout} showsVerticalScrollIndicator={false}
            initialNumToRender={15} maxToRenderPerBatch={20} windowSize={5}
            style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

// ─── CountrySelector ──────────────────────────────────────────────────────────
function CountrySelector({ visible, colors, mode, selected, onSelect, onClose }: {
  visible: boolean; colors: any; mode: "buy" | "sell";
  selected?: string; onSelect: (c: MoonPayCountry) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const { data: allCountries = [], isLoading } = useMoonPayCountries();
  const filtered = useMemo(() => {
    const f = allCountries.filter(c => mode === "buy" ? c.isBuyAllowed : c.isSellAllowed);
    if (!search.trim()) return f;
    const q = search.toLowerCase();
    return f.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.alpha2.toLowerCase().includes(q) ||
      c.alpha3.toLowerCase().includes(q)
    );
  }, [allCountries, mode, search]);

  const renderItem = useCallback(({ item }: { item: MoonPayCountry }) => {
    const isSel = item.alpha2 === selected;
    return (
      <TouchableOpacity
        style={[
          mds.row,
          { borderColor: isSel ? colors.primary : colors.border, height: CITEM_H },
          isSel && { backgroundColor: colors.primaryDim },
        ]}
        onPress={() => { onSelect(item); onClose(); setSearch(""); }}
        activeOpacity={0.8}
      >
        <Text style={mds.flag}>{getFlagEmoji(item.alpha2)}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[mds.rowCode, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[mds.rowName, { color: colors.text2 }]}>{item.alpha2} · {item.alpha3}</Text>
        </View>
        <View style={{ flexDirection: "row", gap: Spacing[1] }}>
          {item.isBuyAllowed && (
            <View style={[mds.badge, { backgroundColor: colors.primaryDim }]}>
              <Text style={[mds.badgeTxt, { color: colors.primary }]}>Buy</Text>
            </View>
          )}
          {item.isSellAllowed && (
            <View style={[mds.badge, { backgroundColor: colors.accentDim }]}>
              <Text style={[mds.badgeTxt, { color: colors.accent }]}>Sell</Text>
            </View>
          )}
        </View>
        {isSel && (
          <Ionicons name="checkmark-circle" size={IconSize.sm} color={colors.primary} style={{ marginLeft: Spacing[1] }} />
        )}
      </TouchableOpacity>
    );
  }, [selected, colors, onSelect, onClose]);

  const keyExtractor  = useCallback((item: MoonPayCountry) => item.alpha2, []);
  const getItemLayout = useCallback((_: any, i: number) => ({ length: CITEM_H, offset: CITEM_H * i, index: i }), []);

  if (!visible) return null;
  return (
    <View style={[mds.overlay, { backgroundColor: colors.overlay }]}>
      <View style={[mds.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={mds.header}>
          <Text style={[mds.title, { color: colors.text }]}>Select Country</Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(""); }}>
            <Ionicons name="close" size={IconSize.md} color={colors.text2} />
          </TouchableOpacity>
        </View>
        <Text style={[mds.sub, { color: colors.text3 }]}>
          Countries where MoonPay {mode} is available
        </Text>
        <View style={[mds.searchBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={IconSize.sm} color={colors.text3} />
          <TextInput
            style={[mds.searchInput, { color: colors.text }]}
            value={search} onChangeText={setSearch}
            placeholder="Search country..." placeholderTextColor={colors.text3} autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={IconSize.sm} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={[mds.count, { color: colors.text3 }]}>{filtered.length} countries available</Text>
        {isLoading ? (
          <View style={mds.loader}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[mds.loaderTxt, { color: colors.text2 }]}>Loading countries...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={mds.empty}>
            <Ionicons name="globe-outline" size={IconSize['2xl']} color={colors.text3} />
            <Text style={[mds.emptyTitle, { color: colors.text3 }]}>No countries found</Text>
          </View>
        ) : (
          <FlatList
            data={filtered} renderItem={renderItem} keyExtractor={keyExtractor}
            getItemLayout={getItemLayout} showsVerticalScrollIndicator={false}
            initialNumToRender={15} maxToRenderPerBatch={20} windowSize={5}
            style={{ maxHeight: 420 }} keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

// ─── Shared Modal Styles ──────────────────────────────────────────────────────
const mds = StyleSheet.create({
  overlay:     { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: "flex-end" },
  sheet:       { borderTopLeftRadius: Radius["2xl"], borderTopRightRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], paddingBottom: Spacing[10], maxHeight: "90%" },
  header:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing[2] },
  title:       { fontSize: Typography.lg, fontWeight: Typography.bold },
  sub:         { fontSize: Typography.xs, marginBottom: Spacing[3] },
  modeBadge:   { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], marginBottom: Spacing[3] },
  modeTxt:     { fontSize: Typography.xs, fontWeight: Typography.semibold },
  searchBox:   { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.lg, paddingHorizontal: Spacing[3], height: 44, marginBottom: Spacing[2] },
  searchInput: { flex: 1, fontSize: Typography.base },
  count:       { fontSize: Typography.xs, marginBottom: Spacing[2], paddingHorizontal: 2 },
  row:         { flexDirection: "row", alignItems: "center", gap: Spacing[2], padding: Spacing[2], borderRadius: Radius.xl, borderWidth: 1, marginBottom: Spacing[2], minHeight: ITEM_H },
  flag:        { fontSize: 22, width: 30, textAlign: "center" },
  rowCode:     { fontSize: Typography.sm, fontWeight: Typography.bold },
  rowName:     { fontSize: Typography.xs, marginTop: 2 },
  rowSymbol:   { fontSize: Typography.sm, fontWeight: Typography.semibold },
  badge:       { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  badgeTxt:    { fontSize: Typography.xs, fontWeight: Typography.bold },
  loader:      { paddingVertical: Spacing[16], alignItems: "center", gap: Spacing[3] },
  loaderTxt:   { fontSize: Typography.sm },
  empty:       { paddingVertical: Spacing[16], alignItems: "center", gap: Spacing[3] },
  emptyTitle:  { fontSize: Typography.sm, textAlign: "center" },
  emptySub:    { fontSize: Typography.sm, textAlign: "center" },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function BuyScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

  // ✅ Tab colors from theme
  const tabColor = activeTab === "buy" ? colors.primary : colors.red;

  const { data: buyableAssets  = [], isLoading: buyAssetsLoading  } = useBuyableCryptos();
  const { data: sellableAssets = [], isLoading: sellAssetsLoading } = useSellableCryptos();
  const assets = activeTab === "buy" ? buyableAssets : sellableAssets;

  const [selAsset,     setSelAsset]     = useState<BuyableCrypto | null>(null);
  const [showAssetSel, setShowAssetSel] = useState(false);
  useEffect(() => { if (assets.length > 0 && !selAsset) setSelAsset(assets[0]); }, [assets]);
  useEffect(() => { setSelAsset(assets[0] ?? null); }, [activeTab]);

  const { data: fiatCurrencies = [] } = useMoonPayFiatCurrencies();
  const [selFiat,     setSelFiat]     = useState<MoonPayFiatCurrency | null>(null);
  const [showFiatSel, setShowFiatSel] = useState(false);
  useEffect(() => {
    if (fiatCurrencies.length > 0 && !selFiat)
      setSelFiat(fiatCurrencies.find(f => f.code === "usd") ?? fiatCurrencies[0]);
  }, [fiatCurrencies]);

  const currency       = selFiat?.code?.toUpperCase() ?? "USD";
  const currencySymbol = selFiat?.symbol ?? "$";
  const currencyFlag   = selFiat?.flagEmoji ?? "🏳️";

  const [selCountry,     setSelCountry]     = useState<MoonPayCountry | null>(null);
  const [showCountrySel, setShowCountrySel] = useState(false);

  const [amount,    setAmount]    = useState("100");
  const [timeframe, setTimeframe] = useState("1D");
  const [chartData, setChartData] = useState<number[]>([]);
  const numAmt = parseFloat(amount) || 0;

  const [activeTxId,    setActiveTxId]    = useState<string | null>(null);
  const [activeTxData,  setActiveTxData]  = useState<{
    url?: string; asset?: string; amount?: number; currency?: string; type?: "buy" | "sell";
  } | null>(null);
  const [showTxStatus,  setShowTxStatus]  = useState(false);
  const [showTxHistory, setShowTxHistory] = useState(false);

  const { mutateAsync: createBuy,  isPending: buyPending  } = useCreateBuyTransaction();
  const { mutateAsync: createSell, isPending: sellPending } = useCreateSellTransaction();
  const isPending = buyPending || sellPending;

  const minAmt = useMemo(() => {
    if (!selAsset) return 20;
    return activeTab === "buy" ? (selAsset.minBuyAmount ?? 20) : (selAsset.minSellAmount ?? 0.001);
  }, [selAsset, activeTab]);

  const isAmountValid     = numAmt >= minAmt;
  const debouncedAmt      = useDebounce(numAmt, 600);
  const debouncedAmtValid = debouncedAmt >= minAmt;

  const { data: buyQuote,  isFetching: buyQuoteFetching  } = useMoonPayBuyQuote(
    { currencyCode: selAsset?.moonpayCode ?? "", baseCurrencyCode: currency, amount: debouncedAmt },
    activeTab === "buy" && !!selAsset && debouncedAmtValid
  );
  const { data: sellQuote, isFetching: sellQuoteFetching } = useMoonPaySellQuote(
    { currencyCode: selAsset?.moonpayCode ?? "", baseCurrencyCode: currency, amount: debouncedAmt },
    activeTab === "sell" && !!selAsset && debouncedAmt > 0
  );

  const isTyping      = numAmt !== debouncedAmt;
  const quoteFetching = buyQuoteFetching || sellQuoteFetching || isTyping;

  useEffect(() => { setChartData(generateChartData(65000, 40, timeframe)); }, [selAsset, timeframe]);

  const receiveAmt = useMemo(() => {
    if (activeTab === "buy") { const q = (buyQuote as any)?.quoteCurrencyAmount; return q ? parseFloat(q).toFixed(6) : null; }
    const q = (sellQuote as any)?.quoteCurrencyAmount;
    return q ? parseFloat(q).toFixed(2) : null;
  }, [activeTab, buyQuote, sellQuote]);

  const feeAmt = useMemo(() => {
    const q = activeTab === "buy" ? (buyQuote as any) : (sellQuote as any);
    if (!q) return null;
    return ((q.feeAmount ?? 0) + (q.networkFeeAmount ?? 0)).toFixed(2);
  }, [activeTab, buyQuote, sellQuote]);

  const openMoonPayUrl = useCallback(async (url: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.open(url, "_blank");
      return;
    }
    try {
      const result = await WebBrowser.openAuthSessionAsync(url, RETURN_URL, {
        showInRecents: false, createTask: false, enableBarCollapsing: true,
      });
      if (result.type === "success") {
        const returnedUrl = (result as any).url as string ?? "";
        const searchStr   = returnedUrl.includes("?") ? returnedUrl.split("?")[1] : "";
        const urlParams   = new URLSearchParams(searchStr);
        setShowTxStatus(false);
        router.push({
          pathname: "/conversion/success",
          params: {
            transactionId:      urlParams.get("transactionId")      ?? activeTxId ?? "",
            baseCurrencyCode:   urlParams.get("baseCurrencyCode")   ?? currency,
            baseCurrencyAmount: urlParams.get("baseCurrencyAmount") ?? String(numAmt),
            transactionStatus:  urlParams.get("transactionStatus")  ?? "pending",
          },
        });
      } else if (result.type === "cancel" || result.type === "dismiss") {
        setShowTxStatus(true);
      }
    } catch (err) {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
      else Alert.alert("Error", "Cannot open MoonPay. Please try again.");
    }
  }, [router, activeTxId, currency, numAmt]);

  const handleProceed = useCallback(async () => {
    if (!selAsset) return;
    if (!isAmountValid) {
      Alert.alert("Minimum Amount", `Minimum ${activeTab} amount is ${activeTab === "buy" ? `${currencySymbol}${minAmt}` : `${minAmt} ${selAsset.symbol}`}`);
      return;
    }
    try {
      let res: any;
      if (activeTab === "buy") {
        res = await createBuy({
          currencyCode: selAsset.moonpayCode, chainId: selAsset.chainId,
          assetId: selAsset.platformAssetId, baseCurrencyCode: currency.toLowerCase(),
          baseCurrencyAmount: numAmt, returnUrl: RETURN_URL,
        });
      } else {
        res = await createSell({
          currencyCode: selAsset.moonpayCode, chainId: selAsset.chainId,
          assetId: selAsset.platformAssetId, baseCurrencyCode: currency.toLowerCase(),
          baseCurrencyAmount: numAmt, returnUrl: RETURN_URL,
        });
      }
      const responseData  = res?.data ?? res;
      const url           = responseData?.url;
      const transactionId = responseData?._id || responseData?.transactionId || null;
      if (!url) throw new Error("No widget URL returned");
      setActiveTxId(transactionId);
      setActiveTxData({ url, asset: selAsset.symbol, amount: numAmt, currency, type: activeTab });
      setShowTxStatus(true);
      setTimeout(() => openMoonPayUrl(url), 400);
    } catch (err: any) {
      Alert.alert("Transaction Failed", err?.parsed?.message ?? err?.message ?? "Something went wrong.");
    }
  }, [selAsset, activeTab, numAmt, currency, currencySymbol, minAmt, isAmountValid, createBuy, createSell, openMoonPayUrl]);

  const handleViewTxFromHistory = useCallback((txId: string) => {
    setActiveTxId(txId);
    setActiveTxData(null);
    setShowTxHistory(false);
    setShowTxStatus(true);
  }, []);

  const assetsLoading = activeTab === "buy" ? buyAssetsLoading : sellAssetsLoading;

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + Spacing[2], borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.canGoBack() ? router.back() : router.push("/")}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Buy And Sell Crypto</Text>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setShowTxHistory(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="receipt-outline" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, margin: Spacing[4], marginBottom: 0 }]}>
        {(["buy", "sell"] as const).map(tab => {
          const isActive = activeTab === tab;
          const color    = tab === "buy" ? colors.primary : colors.red;
          return (
            <TouchableOpacity
              key={tab}
              style={[s.tabBtn, isActive && { backgroundColor: color }]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab === "buy" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                size={IconSize.sm}
                color={isActive ? "#fff" : colors.text2}
              />
              <Text style={[s.tabTxt, { color: isActive ? "#fff" : colors.text2 }]}>
                {tab === "buy" ? "Buy Crypto" : "Sell Crypto"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 130 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {assetsLoading && (
          <View style={s.centerBox}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[s.centerTxt, { color: colors.text2 }]}>
              Loading {activeTab === "buy" ? "buyable" : "sellable"} assets...
            </Text>
          </View>
        )}

        {!assetsLoading && assets.length === 0 && (
          <View style={s.centerBox}>
            <Ionicons name="alert-circle-outline" size={IconSize['2xl']} color={colors.text3} />
            <Text style={[s.centerTxt, { color: colors.text2 }]}>No assets available for {activeTab}</Text>
          </View>
        )}

        {!assetsLoading && assets.length > 0 && (
          <>
            {/* Asset Card */}
            <TouchableOpacity
              style={[s.assetCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAssetSel(true)}
              activeOpacity={0.8}
            >
              {selAsset ? (
                <>
                  <AssetIcon asset={selAsset} size={46} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.assetSymbol, { color: colors.text }]}>{selAsset.symbol}</Text>
                    <Text style={[s.assetName,   { color: colors.text2 }]}>{selAsset.name}</Text>
                  </View>
                  <View style={[s.chainBadge, { backgroundColor: colors.surface }]}>
                    <Text style={[s.chainTxt, { color: colors.text2 }]}>{selAsset.chainId}</Text>
                  </View>
                  <Ionicons name="chevron-down" size={IconSize.sm} color={colors.text2} />
                </>
              ) : (
                <Text style={[s.placeholder, { color: colors.text2 }]}>Select a crypto to {activeTab}</Text>
              )}
            </TouchableOpacity>

            {/* Chart */}
            <View style={[s.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {chartData.length > 0
                ? <PriceChart data={chartData} positive />
                : <View style={s.centerBox}><ActivityIndicator color={colors.primary} /></View>}
            </View>

            {/* Timeframe */}
            <View style={s.tfRow}>
              {TIMEFRAMES.map(tf => {
                const active = timeframe === tf;
                return (
                  <TouchableOpacity
                    key={tf}
                    style={[s.tfBtn, { backgroundColor: active ? colors.primary : "transparent" }]}
                    onPress={() => setTimeframe(tf)}
                  >
                    <Text style={[s.tfTxt, { color: active ? "#fff" : colors.text2 }]}>{tf}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Amount Card */}
            <View style={[s.amountCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[s.amtLabel, { color: colors.text2 }]}>
                {activeTab === "buy" ? `You Pay (${currency})` : `You Sell (${selAsset?.symbol ?? ""})`}
              </Text>
              <View style={s.inputRow}>
                <View style={[s.inputWrap, { backgroundColor: colors.surface }]}>
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => {
                      const step = activeTab === "buy" ? 10 : 0.001;
                      setAmount(String(Math.max(0, parseFloat((numAmt - step).toFixed(6)))));
                    }}
                  >
                    <Ionicons name="remove" size={IconSize.sm} color={colors.text2} />
                  </TouchableOpacity>
                  <TextInput
                    style={[s.amtInput, { color: colors.text }]}
                    value={amount}
                    onChangeText={t => { if (/^\d*\.?\d*$/.test(t)) setAmount(t); }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.text3}
                  />
                  <TouchableOpacity
                    style={s.stepBtn}
                    onPress={() => {
                      const step = activeTab === "buy" ? 10 : 0.001;
                      setAmount(String(parseFloat((numAmt + step).toFixed(6))));
                    }}
                  >
                    <Ionicons name="add" size={IconSize.sm} color={colors.text2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={[s.currBtn, { backgroundColor: colors.surface }]}
                  onPress={() => setShowFiatSel(true)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 18 }}>{currencyFlag}</Text>
                  <Text style={[s.currTxt, { color: colors.text }]}>{currency}</Text>
                  <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text2} />
                </TouchableOpacity>
              </View>

              {/* Warning */}
              {numAmt > 0 && !isAmountValid && (
                <View style={[s.warnBox, { backgroundColor: colors.redDim }]}>
                  <Ionicons name="warning-outline" size={IconSize.xs} color={colors.red} />
                  <Text style={[s.warnTxt, { color: colors.red }]}>
                    Minimum {activeTab === "buy" ? `${currencySymbol}${minAmt}` : `${minAmt} ${selAsset?.symbol}`}
                  </Text>
                </View>
              )}

              {/* Receive Box */}
              <View style={[s.receiveBox, { backgroundColor: colors.surface }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[s.receiveLabel, { color: colors.text2 }]}>
                    {activeTab === "buy" ? "You Receive" : `You Get (${currency})`}
                  </Text>
                  {isTyping ? (
                    <Text style={[s.receiveHint, { color: colors.text3 }]}>Calculating...</Text>
                  ) : quoteFetching ? (
                    <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 4, alignSelf: "flex-start" }} />
                  ) : receiveAmt ? (
                    <Text style={[s.receiveVal, { color: colors.accent }]}>
                      {receiveAmt} {activeTab === "buy" ? selAsset?.symbol : currency}
                    </Text>
                  ) : (
                    <Text style={[s.receiveHint, { color: colors.text3 }]}>Enter amount to see quote</Text>
                  )}
                </View>
                {feeAmt && !isTyping && (
                  <View style={s.feeRight}>
                    <Text style={[s.feeLabel, { color: colors.text3 }]}>Fee</Text>
                    <Text style={[s.feeVal, { color: colors.text2 }]}>~{currencySymbol}{feeAmt}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Amounts */}
            {activeTab === "buy" && (
              <View style={s.quickRow}>
                {QUICK_AMOUNTS.map(q => {
                  const active = parseFloat(amount) === q;
                  return (
                    <TouchableOpacity
                      key={q}
                      style={[
                        s.quickBtn,
                        {
                          borderColor:     active ? colors.primary : colors.border,
                          backgroundColor: active ? colors.primaryDim : colors.card,
                        },
                      ]}
                      onPress={() => setAmount(String(q))}
                    >
                      <Text style={[s.quickTxt, { color: active ? colors.primary : colors.text2 }]}>
                        {currencySymbol}{q}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Country */}
            <TouchableOpacity
              style={[s.countryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowCountrySel(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="globe-outline" size={IconSize.sm} color={colors.text2} />
              <View style={{ flex: 1 }}>
                <Text style={[s.countryLabel, { color: colors.text3 }]}>Your Country</Text>
                <Text style={[s.countryVal,   { color: colors.text }]}>
                  {selCountry ? `${getFlagEmoji(selCountry.alpha2)} ${selCountry.name}` : "Select your country"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={IconSize.xs} color={colors.text3} />
            </TouchableOpacity>

            {/* MoonPay Banner — purple theme (MoonPay brand) kept intentionally */}
            <View style={[s.infoBanner, { backgroundColor: "#7B68EE15", borderColor: "#7B68EE50" }]}>
              <Ionicons name="shield-checkmark-outline" size={IconSize.sm} color="#7B68EE" />
              <View style={{ flex: 1 }}>
                <Text style={[s.bannerTitle, { color: colors.text }]}>Powered by MoonPay</Text>
                <Text style={[s.bannerSub,   { color: colors.text2 }]}>
                  Your email & wallet are pre-filled. Secure, compliant checkout.
                </Text>
              </View>
            </View>

            {/* Sell Info Banner */}
            {activeTab === "sell" && (
              <View style={[s.infoBanner, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
                <Ionicons name="information-circle-outline" size={IconSize.sm} color={colors.red} />
                <Text style={[s.bannerSub, { color: colors.text2, flex: 1 }]}>
                  You'll send crypto to MoonPay's address. Proceeds go to your linked bank.
                </Text>
              </View>
            )}

            {/* History Banner */}
            <TouchableOpacity
              style={[s.historyBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowTxHistory(true)}
              activeOpacity={0.85}
            >
              <View style={[s.historyIconWrap, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="receipt-outline" size={IconSize.sm} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.historyTitle, { color: colors.text }]}>Transaction History</Text>
                <Text style={[s.historySub,   { color: colors.text3 }]}>
                  View all your buy/sell transactions & status
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.text3} />
            </TouchableOpacity>

            {/* DEV shortcut */}
            {__DEV__ && (
              <TouchableOpacity
                style={[s.infoBanner, { backgroundColor: colors.orangeDim, borderColor: colors.orangeBorder, justifyContent: "center" }]}
                onPress={() => router.push({
                  pathname: "/conversion/success",
                  params: { transactionId: "1a48e9b8-6b1a-4684-a5e1-26e82e42ee3d", baseCurrencyCode: "usd", baseCurrencyAmount: "97.79", transactionStatus: "completed" },
                })}
              >
                <Ionicons name="bug-outline" size={IconSize.sm} color={colors.orange} />
                <Text style={{ color: colors.orange, fontSize: Typography.xs, fontWeight: Typography.bold }}>
                  DEV: Test Success Screen
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom CTA */}
      {!assetsLoading && selAsset && (
        <View style={[s.ctaWrap, { paddingBottom: insets.bottom + Spacing[3], backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <View style={s.summaryRow}>
            <View style={s.summaryLeft}>
              <AssetIcon asset={selAsset} size={28} />
              <Text style={[s.summarySymbol, { color: colors.text }]}>
                {activeTab === "buy" ? `Buy ${selAsset.symbol}` : `Sell ${selAsset.symbol}`}
              </Text>
            </View>
            <Text style={[s.summaryAmt, { color: colors.text }]}>
              {activeTab === "buy" ? `${currencySymbol}${numAmt.toFixed(2)}` : `${numAmt} ${selAsset.symbol}`}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              s.ctaBtn,
              {
                backgroundColor: isAmountValid && !isPending
                  ? (activeTab === "buy" ? colors.primary : colors.red)
                  : colors.border,
              },
            ]}
            onPress={handleProceed}
            disabled={isPending || !isAmountValid}
            activeOpacity={0.85}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name={activeTab === "buy" ? "cart-outline" : "cash-outline"} size={IconSize.md} color="#fff" />
                <Text style={s.ctaTxt}>
                  {activeTab === "buy"
                    ? `Buy ${selAsset.symbol} · ${currencySymbol}${numAmt.toFixed(2)}`
                    : `Sell ${numAmt} ${selAsset.symbol}`}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <View style={s.poweredRow}>
            <Ionicons name="lock-closed-outline" size={Typography.xs} color={colors.text3} />
            <Text style={[s.poweredTxt, { color: colors.text3 }]}>Secured by MoonPay</Text>
          </View>
        </View>
      )}

      {/* Modals */}
      <AssetSelector
        visible={showAssetSel} colors={colors} assets={assets}
        selected={selAsset} mode={activeTab}
        onSelect={a => { setSelAsset(a); setShowAssetSel(false); }}
        onClose={() => setShowAssetSel(false)}
      />
      <FiatSelector
        visible={showFiatSel} colors={colors} mode={activeTab}
        selected={selFiat?.code ?? "usd"}
        onSelect={f => { setSelFiat(f); setShowFiatSel(false); }}
        onClose={() => setShowFiatSel(false)}
      />
      <CountrySelector
        visible={showCountrySel} colors={colors} mode={activeTab}
        selected={selCountry?.alpha2}
        onSelect={c => { setSelCountry(c); setShowCountrySel(false); }}
        onClose={() => setShowCountrySel(false)}
      />
      <TransactionStatusModal
        visible={showTxStatus} colors={colors}
        transactionId={activeTxId} initialData={activeTxData ?? undefined}
        onClose={() => setShowTxStatus(false)} onOpenUrl={openMoonPayUrl}
      />
      <TransactionHistoryModal
        visible={showTxHistory} colors={colors}
        onClose={() => setShowTxHistory(false)} onSelectTx={handleViewTxFromHistory}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1 },
  scroll:       { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },

  header:       { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing[4], paddingBottom: Spacing[2], borderBottomWidth: 1 },
  headerTitle:  { flex: 1, textAlign: "center", fontSize: Typography.lg, fontWeight: Typography.bold },
  iconBtn:      { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.lg, alignItems: "center", justifyContent: "center", borderWidth: 1 },

  tabRow:       { flexDirection: "row", borderRadius: Radius.xl, padding: Spacing[1], gap: Spacing[1] },
  tabBtn:       { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[2], paddingVertical: Spacing[2], borderRadius: Radius.lg },
  tabTxt:       { fontSize: Typography.sm, fontWeight: Typography.bold },

  centerBox:    { paddingVertical: Spacing[16], alignItems: "center", gap: Spacing[3] },
  centerTxt:    { fontSize: Typography.sm },

  assetCard:    { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3], marginTop: Spacing[3] },
  assetSymbol:  { fontSize: Typography.lg, fontWeight: Typography.extrabold },
  assetName:    { fontSize: Typography.xs, marginTop: 2 },
  placeholder:  { fontSize: Typography.base },
  chainBadge:   { paddingHorizontal: Spacing[2], paddingVertical: Spacing[1], borderRadius: Radius.full },
  chainTxt:     { fontSize: Typography.xs, fontWeight: Typography.semibold },

  chartCard:    { borderRadius: Radius["2xl"], borderWidth: 1, overflow: "hidden", height: CHART_H, marginBottom: Spacing[3] },

  tfRow:        { flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[3] },
  tfBtn:        { flex: 1, paddingVertical: Spacing[2], borderRadius: Radius.full, alignItems: "center" },
  tfTxt:        { fontSize: Typography.xs, fontWeight: Typography.bold },

  amountCard:   { borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },
  amtLabel:     { fontSize: Typography.xs, fontWeight: Typography.semibold, marginBottom: Spacing[2], textTransform: "uppercase", letterSpacing: 0.5 },
  inputRow:     { flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[3] },
  inputWrap:    { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: Radius.xl, paddingHorizontal: Spacing[2], height: 52 },
  stepBtn:      { padding: Spacing[2] },
  amtInput:     { flex: 1, fontSize: Typography["2xl"], fontWeight: Typography.extrabold, textAlign: "center", padding: 0 },
  currBtn:      { flexDirection: "row", alignItems: "center", gap: Spacing[1], paddingHorizontal: Spacing[3], height: 52, borderRadius: Radius.xl },
  currTxt:      { fontSize: Typography.sm, fontWeight: Typography.bold },

  warnBox:      { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], marginBottom: Spacing[2] },
  warnTxt:      { fontSize: Typography.xs, fontWeight: Typography.semibold },

  receiveBox:   { borderRadius: Radius.lg, padding: Spacing[3], flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  receiveLabel: { fontSize: Typography.xs, marginBottom: Spacing[1] },
  receiveVal:   { fontSize: Typography.base, fontWeight: Typography.extrabold },
  receiveHint:  { fontSize: Typography.xs, marginTop: Spacing[1] },
  feeRight:     { alignItems: "flex-end" },
  feeLabel:     { fontSize: Typography.xs },
  feeVal:       { fontSize: Typography.sm, fontWeight: Typography.semibold, marginTop: 2 },

  quickRow:     { flexDirection: "row", gap: Spacing[2], marginBottom: Spacing[3] },
  quickBtn:     { flex: 1, paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5, alignItems: "center" },
  quickTxt:     { fontSize: Typography.xs, fontWeight: Typography.bold },

  countryBtn:   { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3], marginBottom: Spacing[3] },
  countryLabel: { fontSize: Typography.xs, marginBottom: 2 },
  countryVal:   { fontSize: Typography.sm, fontWeight: Typography.semibold },

  infoBanner:   { flexDirection: "row", alignItems: "flex-start", gap: Spacing[2], borderWidth: 1, borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[3] },
  bannerTitle:  { fontSize: Typography.sm, fontWeight: Typography.bold, marginBottom: 2 },
  bannerSub:    { fontSize: Typography.xs, lineHeight: Typography.lineHeightBase },

  historyBanner:  { flexDirection: "row", alignItems: "center", gap: Spacing[3], borderWidth: 1, borderRadius: Radius.xl, padding: Spacing[3], marginBottom: Spacing[3] },
  historyIconWrap:{ width: IconBox.xs, height: IconBox.xs, borderRadius: IconBox.xs / 2, alignItems: "center", justifyContent: "center" },
  historyTitle:  { fontSize: Typography.sm, fontWeight: Typography.bold },
  historySub:    { fontSize: Typography.xs, marginTop: 2 },

  ctaWrap:      { paddingHorizontal: Spacing[4], paddingTop: Spacing[2], borderTopWidth: 1 },
  summaryRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing[2] },
  summaryLeft:  { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  summarySymbol:{ fontSize: Typography.sm, fontWeight: Typography.semibold },
  summaryAmt:   { fontSize: Typography.base, fontWeight: Typography.bold },
  ctaBtn:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[2], paddingVertical: Spacing[4], borderRadius: Radius.xl },
  ctaTxt:       { color: "#fff", fontSize: Typography.base, fontWeight: Typography.bold },
  poweredRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[1], marginTop: Spacing[2] },
  poweredTxt:   { fontSize: Typography.xs },
});