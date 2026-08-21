import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import {
  Spacing, Typography, Radius, IconSize,
  getPrimaryGradient,
} from "@/styles/theme";
import { useTheme } from "@/context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkeletonBox from "./SkeletonBox";
import { useResolvedAsset } from "@/cache/assetCache";
import { webReset, AD_TYPES, CURRENCY_FILTERS } from "../constants";
import type { P2PAd, P2PAdListResponse } from "@/types/p2pTypes";

// ── Per-ad row ────────────────────────────────────────────────────────────────
function AdCard({
  ad, onPress, colors, isDark,
}: {
  ad: P2PAd; onPress: () => void; colors: any; isDark: boolean;
}) {
  const asset = useResolvedAsset(ad.asset, ad.chainId);
  const isSellAd = ad.type === "SELL";
  // SELL ad (user buys) = primary/accent, BUY ad (user sells) = red
  const accentColor = isSellAd ? colors.accent : colors.red;
  const ownerName = (ad.userId as any)?.email?.split("@")[0] ?? "Trader";
  const initials = ownerName[0]?.toUpperCase() ?? "T";
  const primaryGrad = getPrimaryGradient(isDark);

  const methods = Array.isArray(ad.paymentMethods)
    ? (ad.paymentMethods as any[])
      .map((m: any) => m?.label ?? m?.name ?? "")
      .filter(Boolean)
    : [];

  return (
    <View style={[s.adCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Trader row */}
      <View style={s.traderRow}>
        <View style={[s.traderAvatar, { backgroundColor: `${accentColor}22` }]}>
          <Text style={[s.traderInitial, { color: accentColor }]}>{initials}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: Spacing[2] + 2 }}>
          <Text style={[s.traderName, { color: colors.text }]}>{ownerName}</Text>
          <Text style={[s.traderMeta, { color: colors.text3 }]}>
            {ad.seller?.completionRate ?? ad.seller?.trustScore ?? 95}% ·{" "}
            {ad.seller?.totalTrades ?? 0} Trades
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.adType, { color: accentColor }]}>{ad.type}</Text>
          <Text style={[s.adPrice, { color: colors.text }]}>{ad.price}</Text>
          <Text style={[s.adPriceUnit, { color: colors.text3 }]}>
            {ad.currency}/{asset.symbol}
          </Text>
        </View>
      </View>

      {/* Pills */}
      <View style={s.pillsRow}>
        <View style={[s.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.pillLabel, { color: colors.text3 }]}>AVAILABLE</Text>
          <Text style={[s.pillVal, { color: colors.text }]}>
            {ad?.availableAmount != null ? Number(ad.availableAmount).toFixed(6) : "N/A"}{" "}
            {asset.symbol}
          </Text>
        </View>
        <View style={[s.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.pillLabel, { color: colors.text3 }]}>LIMIT</Text>
          <Text style={[s.pillVal, { color: colors.text }]}>
            {ad.minLimit ?? 0}–{ad.maxLimit ?? 0} {ad.currency}
          </Text>
        </View>
      </View>

      {/* Payment methods */}
      {methods.length > 0 && (
        <View style={s.methodsRow}>
          {methods.slice(0, 3).map((m, i) => (
            <View
              key={i}
              style={[s.methodChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Text style={[s.methodChipTxt, { color: colors.text2 }]}>{m}</Text>
            </View>
          ))}
          {methods.length > 3 && (
            <Text style={[s.methodMore, { color: colors.text3 }]}>+{methods.length - 3}</Text>
          )}
        </View>
      )}

      {/* Action row */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.chatBtn, { borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={IconSize.sm} color={colors.text3} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, borderRadius: Radius.md, overflow: 'hidden' }}
          onPress={onPress}
          activeOpacity={0.85}
        >
          {/* Primary gradient for trade button */}
          <LinearGradient
  colors={[colors.primary, colors.primary]}
  style={s.tradeBtn}
>
  <Text style={s.tradeBtnTxt}>
    {isSellAd ? `Buy ${asset.symbol}` : `Sell ${asset.symbol}`}
  </Text>
</LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────
interface MarketTabProps {
  adsResult: P2PAdListResponse;
  adsLoading: boolean;
  refreshing: boolean;
  ADS_PER_PAGE: number;
  filterAsset: string;
  filterType: string;
  filterCurr: string;
  filterAmt: string;
  setFilterAsset: (v: string) => void;
  setFilterType: (v: string) => void;
  setFilterCurr: (v: string) => void;
  setFilterAmt: (v: string) => void;
  onApply: () => void;
  onLoadPage: (pg: number) => void;
  onRefresh: () => void;
  onSelectAd: (ad: P2PAd) => void;
  colors: any;
}

export default function MarketTab({
  adsResult, adsLoading, refreshing, ADS_PER_PAGE,
  filterAsset, filterType, filterCurr, filterAmt,
  setFilterAsset, setFilterType, setFilterCurr, setFilterAmt,
  onApply, onLoadPage, onRefresh, onSelectAd, colors,
}: MarketTabProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const primaryGrad = getPrimaryGradient(isDark);

  const [showAssetDrop, setShowAssetDrop] = useState(false);
  const [showTypeDrop, setShowTypeDrop] = useState(false);
  const [showCurrDrop, setShowCurrDrop] = useState(false);

  const { ads } = adsResult;

  const total = adsResult.totalData ?? (adsResult as any).total ?? 0;
  const page = adsResult.page ?? 1;
  const totalPages = adsResult.totalPage ?? Math.max(1, Math.ceil(total / ADS_PER_PAGE));

  const assetSymbols = [...new Set(ads.map((a) => a.chainId))];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.accent}
        />
      }
      contentContainerStyle={{
        padding: Spacing[4],
        gap: Spacing[3] + 2,
        paddingBottom: insets.bottom + 80,
      }}
    >
      {/* ── Filters ── */}
      <View style={[s.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Asset + Currency */}
        <View style={{ flexDirection: "row", gap: Spacing[3] }}>
          <TouchableOpacity
            style={[s.filterSelect, {
              flex: 1,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            onPress={() => {
              setShowAssetDrop((v) => !v);
              setShowCurrDrop(false);
              setShowTypeDrop(false);
            }}
            activeOpacity={0.8}
          >
            <View>
              <Text style={[s.filterSelectLabel, { color: colors.text3 }]}>Asset</Text>
              <Text style={[s.filterSelectVal, { color: colors.text }]} numberOfLines={1}>
                {filterAsset || "All Assets"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.filterSelect, {
              flex: 1,
              backgroundColor: colors.surface,
              borderColor: colors.border,
            }]}
            onPress={() => {
              setShowCurrDrop((v) => !v);
              setShowAssetDrop(false);
              setShowTypeDrop(false);
            }}
            activeOpacity={0.8}
          >
            <View>
              <Text style={[s.filterSelectLabel, { color: colors.text3 }]}>Currency</Text>
              <Text style={[s.filterSelectVal, { color: colors.text }]} numberOfLines={1}>
                {filterCurr || "All Currencies"}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />
          </TouchableOpacity>
        </View>

        {showAssetDrop && (
          <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {["All Assets", ...assetSymbols].map((sym) => {
              const active = filterAsset === sym || (sym === "All Assets" && !filterAsset);
              return (
                <TouchableOpacity
                  key={sym}
                  style={[
                    s.dropdownItem,
                    { borderBottomColor: colors.borderSoft },
                    active && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => {
                    setFilterAsset(sym === "All Assets" ? "" : sym);
                    setShowAssetDrop(false);
                  }}
                >
                  <Text style={{ fontSize: Typography.base, color: colors.text }}>{sym}</Text>
                  {active && <Ionicons name="checkmark" size={IconSize.sm} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {showCurrDrop && (
          <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CURRENCY_FILTERS.map((c) => {
              const active = filterCurr === c || (c === "All Currencies" && !filterCurr);
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    s.dropdownItem,
                    { borderBottomColor: colors.borderSoft },
                    active && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => {
                    setFilterCurr(c === "All Currencies" ? "" : c);
                    setShowCurrDrop(false);
                  }}
                >
                  <Text style={{ fontSize: Typography.base, color: colors.text }}>{c}</Text>
                  {active && <Ionicons name="checkmark" size={IconSize.sm} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Type */}
        <TouchableOpacity
          style={[s.filterSelect, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            setShowTypeDrop((v) => !v);
            setShowAssetDrop(false);
            setShowCurrDrop(false);
          }}
          activeOpacity={0.8}
        >
          <View>
            <Text style={[s.filterSelectLabel, { color: colors.text3 }]}>Type</Text>
            <Text style={[s.filterSelectVal, { color: colors.text }]}>
              {filterType || "Buy & Sell"}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />
        </TouchableOpacity>

        {showTypeDrop && (
          <View style={[s.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {AD_TYPES.map((t) => {
              const active = filterType === t || (t === "Buy & Sell" && !filterType);
              return (
                <TouchableOpacity
                  key={t}
                  style={[
                    s.dropdownItem,
                    { borderBottomColor: colors.borderSoft },
                    active && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => {
                    setFilterType(t === "Buy & Sell" ? "" : t);
                    setShowTypeDrop(false);
                  }}
                >
                  <Text style={{ fontSize: Typography.base, color: colors.text }}>{t}</Text>
                  {active && <Ionicons name="checkmark" size={IconSize.sm} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Amount + Apply */}
        <View style={{ flexDirection: "row", gap: Spacing[3] }}>
          <View style={[s.amtInput, {
            flex: 1,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          }]}>
            <TextInput
              style={[s.amtInputTxt, { color: colors.text }, webReset]}
              placeholder="Amount (Optional)"
              placeholderTextColor={colors.text3}
              keyboardType="decimal-pad"
              value={filterAmt}
              onChangeText={setFilterAmt}
              underlineColorAndroid="transparent"
            />
          </View>
          <TouchableOpacity
            style={s.applyBtn}
            onPress={onApply}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={[colors.primary, colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.applyGrad}
            >
              <Text style={s.applyTxt}>Apply</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Offer count */}
      {!adsLoading && (
        <Text style={[s.offersCount, { color: colors.text }]}>
          <Text style={{ color: colors.accent }}>{total}</Text> Offers Available
        </Text>
      )}

      {/* List */}
      {adsLoading ? (
        [1, 2, 3].map((i) => <SkeletonBox key={i} h={190} r={Radius.xl} />)
      ) : ads.length === 0 ? (
        <View style={[s.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="storefront-outline" size={48} color={colors.text3} />
          <Text style={[s.emptyTxt, { color: colors.text2 }]}>No offers available</Text>
          <Text style={{ fontSize: Typography.sm, color: colors.text3 }}>
            Try adjusting your filters
          </Text>
        </View>
      ) : (
        ads.map((ad) => (
          <AdCard
            key={ad._id}
            ad={ad}
            onPress={() => onSelectAd(ad)}
            colors={colors}
            isDark={isDark}
          />
        ))
      )}

      {/* Pagination */}
      {total > ADS_PER_PAGE && (
        <View style={[s.pagination, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.pageInfo, { color: colors.text2 }]}>
            <Text style={{ color: colors.accent }}>
              {(page - 1) * ADS_PER_PAGE + 1}–{Math.min(page * ADS_PER_PAGE, total)}
            </Text>{" "}
            of <Text style={{ color: colors.accent }}>{total}</Text>
          </Text>

          <View style={{ flexDirection: "row", gap: Spacing[2] }}>
            <TouchableOpacity
              style={[
                s.pageBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                page <= 1 && { opacity: 0.35 },
              ]}
              onPress={() => onLoadPage(page - 1)}
              disabled={page <= 1}
            >
              <Ionicons name="chevron-back" size={IconSize.sm} color={colors.accent} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.pageBtn,
                { borderColor: colors.border, backgroundColor: colors.surface },
                page >= totalPages && { opacity: 0.35 },
              ]}
              onPress={() => onLoadPage(page + 1)}
              disabled={page >= totalPages}
            >
              <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.accent} />
            </TouchableOpacity>
          </View>

          <Text style={[s.pageInfo, { color: colors.text2 }]}>
            <Text style={{ color: colors.accent }}>{page}/{totalPages}</Text>
          </Text>
        </View>
      )}

      {/* Safety banner */}
      <View style={[s.safetyBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[s.safetyIconWrap, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="shield-checkmark" size={IconSize.md} color={colors.primaryBright} />
        </View>
        <View style={{ flex: 1, marginLeft: Spacing[3] }}>
          <Text style={[s.safetyTitle, { color: colors.text }]}>
            How are your funds protected?
          </Text>
          <Text style={{ fontSize: Typography.xs, lineHeight: Typography.lineHeightBase, color: colors.text2 }}>
            All P2P trades are secured by escrow. Funds are locked until both parties confirm.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  filterCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[3] },
  filterSelect: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[2] + 2 },
  filterSelectLabel: { fontSize: Typography.xs, marginBottom: 2 },
  filterSelectVal: { fontSize: Typography.base, fontWeight: "600" },
  dropdown: { borderRadius: Radius.md, borderWidth: 1, overflow: "hidden", marginTop: -6 },
  dropdownItem: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[3], borderBottomWidth: 1 },
  amtInput: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[2] + 2 },
  amtInputTxt: { fontSize: Typography.base, padding: 0 },
  applyBtn: { borderRadius: Radius.md, overflow: "hidden", minWidth: 80 },
  applyGrad: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[4], alignItems: "center" },
  applyTxt: { fontSize: Typography.base, fontWeight: "700", color: "#fff" },
  offersCount: { fontSize: Typography.md, fontWeight: "600" },
  adCard: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], gap: Spacing[2] + 2 },
  traderRow: { flexDirection: "row", alignItems: "center" },
  traderAvatar: { width: 44, height: 44, borderRadius: Radius.full, alignItems: "center", justifyContent: "center" },
  traderInitial: { fontSize: Typography.md, fontWeight: "800" },
  traderName: { fontSize: Typography.base, fontWeight: "700" },
  traderMeta: { fontSize: Typography.xs, marginTop: 2 },
  adType: { fontSize: Typography.xs, fontWeight: "700" },
  adPrice: { fontSize: Typography.md, fontWeight: "800", textAlign: "right" },
  adPriceUnit: { fontSize: Typography.xs, textAlign: "right", marginTop: 1 },
  pillsRow: { flexDirection: "row", gap: Spacing[2] + 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: Spacing[1] + 2, paddingHorizontal: Spacing[2] + 2, paddingVertical: Spacing[1] + 3, borderRadius: Radius.md, borderWidth: 1 },
  pillLabel: { fontSize: 10, fontWeight: "600" },
  pillVal: { fontSize: Typography.xs, fontWeight: "700" },
  methodsRow: { flexDirection: "row", flexWrap: "wrap", gap: Spacing[1] + 2, alignItems: "center" },
  methodChip: { paddingHorizontal: Spacing[2], paddingVertical: 4, borderRadius: Radius.sm, borderWidth: 1 },
  methodChipTxt: { fontSize: Typography.xs },
  methodMore: { fontSize: Typography.xs },
  actionRow: { flexDirection: "row", alignItems: "center", gap: Spacing[2] + 2 },
  chatBtn: { width: 42, height: 42, borderRadius: Radius.md, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  tradeBtn: { paddingVertical: Spacing[3], alignItems: "center" },
  tradeBtnTxt: { fontSize: Typography.base, fontWeight: "700", color: "#fff" },
  pagination: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: Spacing[3] + 2, borderRadius: Radius.lg, borderWidth: 1 },
  pageInfo: { fontSize: Typography.sm },
  pageBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  safetyBanner: { flexDirection: "row", alignItems: "flex-start", padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1 },
  safetyIconWrap: { width: 40, height: 40, borderRadius: Radius.full, alignItems: "center", justifyContent: "center" },
  safetyTitle: { fontSize: Typography.base, fontWeight: "700", marginBottom: 4 },
  empty: { alignItems: "center", padding: Spacing[12], borderRadius: Radius.xl, borderWidth: 1, gap: Spacing[2] + 2 },
  emptyTxt: { fontSize: Typography.md, fontWeight: "600" },
});