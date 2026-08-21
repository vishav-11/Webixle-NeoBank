/**
 * src/screens/CryptoLoans/tabs/AddTab.tsx
 */

import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, PanResponder, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from "@/styles/theme";
import loanService from "@/services/loanService";
import type { LoanPair, LoanPreview } from "@/types/loanType";

// ─── Asset colours ────────────────────────────────────────────────────────────
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

const fmtUsd = (n?: number | null) => {
  const v = Number(n ?? 0);
  if (!v) return "$0.00";
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}k`;
  return `$${v.toFixed(2)}`;
};

// ─── Step Indicator ───────────────────────────────────────────────────────────
function StepIndicator({ step, colors }: { step: number; colors: ColorScheme }) {
  const steps = ["Select Pair", "Set Amount", "Confirm"];
  return (
    <View style={si.wrap}>
      {steps.map((label, i) => {
        const idx    = i + 1;
        const done   = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={label}>
            <View style={si.item}>
              <View style={[
                si.circle,
                { borderColor: done || active ? colors.accent : colors.border },
                done   && { backgroundColor: colors.accent },
                active && { backgroundColor: colors.accentDim },
              ]}>
                {done ? (
                  <Ionicons name="checkmark" size={IconSize.xs} color="#fff" />
                ) : (
                  <Text style={[si.num, { color: active ? colors.accent : colors.text3 }]}>
                    {idx}
                  </Text>
                )}
              </View>
              <Text style={[si.label, { color: active ? colors.text : colors.text3 }]}>
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[
                si.line,
                { backgroundColor: step > idx ? colors.accent : colors.border },
              ]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  wrap:   { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] },
  item:   { alignItems: "center", gap: Spacing[1] },
  circle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  num:    { fontSize: Typography.xs, fontWeight: "700" },
  label:  { fontSize: Typography.xs, fontWeight: "600" },
  line:   { flex: 1, height: 2, marginHorizontal: Spacing[2], marginBottom: Spacing[4] },
});

// ─── Pair Select Card ─────────────────────────────────────────────────────────
function PairSelectCard({
  pair, selected, colors, onPress,
}: {
  pair: LoanPair;
  selected: boolean;
  colors: ColorScheme;
  onPress: () => void;
}) {
  const cClr = assetColor(pair.collateral.symbol);
  const bClr = assetColor(pair.borrow.symbol);

  return (
    <TouchableOpacity
      style={[
        a.pairCard,
        {
          backgroundColor: colors.card,
          borderColor: selected ? colors.accentBorder : colors.border,
        },
        selected && { backgroundColor: colors.accentDim },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={[a.checkBadge, { backgroundColor: colors.accent }]}>
          <Ionicons name="checkmark" size={IconSize.xs} color="#fff" />
        </View>
      )}

      <View style={a.iconRow}>
        <View style={[a.badge, { backgroundColor: cClr.bg }]}>
          <Text style={[a.badgeTxt, { color: cClr.text }]}>{pair.collateral.symbol}</Text>
        </View>
        <View style={[a.swapCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name="swap-horizontal" size={IconSize.sm} color={colors.text2} />
        </View>
        <View style={[a.badge, { backgroundColor: bClr.bg }]}>
          <Text style={[a.badgeTxt, { color: bClr.text }]}>{pair.borrow.symbol}</Text>
        </View>
      </View>

      <Text style={[a.pairName, { color: colors.text }]}>
        {pair.collateral.symbol} → {pair.borrow.symbol}
      </Text>
      <Text style={[a.pairSub, { color: colors.text3 }]}>Collateralized Loan</Text>

      <View style={[a.statsRow, { borderTopColor: colors.borderSoft }]}>
        <View style={a.stat}>
          <Text style={[a.statLabel, { color: colors.text3 }]}>APR</Text>
          {/* ✅ accent instead of primary */}
          <Text style={[a.statVal, { color: colors.accent }]}>{pair.interest}%</Text>
        </View>
        <View style={[a.statDiv, { backgroundColor: colors.borderSoft }]} />
        <View style={a.stat}>
          <Text style={[a.statLabel, { color: colors.text3 }]}>Max LTV</Text>
          <Text style={[a.statVal, { color: colors.text }]}>{pair.ltv}%</Text>
        </View>
        <View style={[a.statDiv, { backgroundColor: colors.borderSoft }]} />
        <View style={a.stat}>
          <Text style={[a.statLabel, { color: colors.text3 }]}>Daily</Text>
          <Text style={[a.statVal, { color: colors.text }]}>
            {(pair.interest / 365).toFixed(4)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── LTV Slider ───────────────────────────────────────────────────────────────
function LtvSlider({
  value, maxLtv, onChange, colors,
}: {
  value: number;
  maxLtv: number;
  onChange: (v: number) => void;
  colors: ColorScheme;
}) {
  const trackWidth = useRef(0);

  // ✅ LTV risk color — theme se
  const getColor = (v: number): string => {
    if (v < 50) return colors.accent;
    if (v < 75) return colors.orange;
    return colors.red;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        if (!trackWidth.current) return;
        const pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackWidth.current));
        onChange(Math.min(Math.round(pct * maxLtv), maxLtv));
      },
      onPanResponderMove: (evt) => {
        if (!trackWidth.current) return;
        const pct = Math.max(0, Math.min(1, evt.nativeEvent.locationX / trackWidth.current));
        onChange(Math.min(Math.round(pct * maxLtv), maxLtv));
      },
    })
  ).current;

  const pct        = value / maxLtv;
  const thumbColor = getColor(value);

  return (
    <View style={sl.wrap}>
      <View style={sl.labelRow}>
        <Text style={[sl.label, { color: colors.text2 }]}>LTV Ratio</Text>
        <Text style={[sl.val, { color: thumbColor }]}>{value}%</Text>
      </View>

      <View
        style={[sl.track, { backgroundColor: colors.borderSoft }]}
        onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View style={[sl.fill, { width: `${pct * 100}%`, backgroundColor: thumbColor }]} />
        <View style={[sl.thumb, {
          left: `${pct * 100}%`,
          backgroundColor: thumbColor,
          borderColor: colors.bg,
          transform: [{ translateX: -10 }],
        }]} />
        <View style={[sl.marker, { left: "75%", backgroundColor: colors.orange }]} />
      </View>

      <View style={sl.scale}>
        <Text style={[sl.scaleNum, { color: colors.accent }]}>0%</Text>
        <Text style={[sl.scaleNum, { color: colors.orange }]}>75%</Text>
        <Text style={[sl.scaleNum, { color: colors.red }]}>{maxLtv}%</Text>
      </View>

      <View style={sl.presets}>
        {[25, 50, 75, maxLtv].map(p => {
          const pColor = getColor(p);
          const isActive = value === p;
          return (
            <TouchableOpacity
              key={p}
              style={[
                sl.preset,
                { borderColor: isActive ? pColor : colors.border },
                isActive && { backgroundColor: colors[
                  p < 50 ? "accentDim" : p < 75 ? "orangeDim" : "redDim"
                ] },
              ]}
              onPress={() => onChange(p)}
              activeOpacity={0.8}
            >
              <Text style={[sl.presetTxt, { color: isActive ? pColor : colors.text2 }]}>
                {p}%
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  wrap:      { gap: Spacing[3] },
  labelRow:  { flexDirection: "row", justifyContent: "space-between" },
  label:     { fontSize: Typography.sm, fontWeight: "600" },
  val:       { fontSize: Typography.md, fontWeight: "800" },
  track:     { height: 10, borderRadius: 5, position: "relative", overflow: "visible" },
  fill:      { height: "100%", borderRadius: 5, position: "absolute", left: 0 },
  thumb:     { position: "absolute", top: -5, width: 20, height: 20, borderRadius: 10, borderWidth: 2.5 },
  marker:    { position: "absolute", top: -4, width: 3, height: 18, borderRadius: 2, marginLeft: -1.5 },
  scale:     { flexDirection: "row", justifyContent: "space-between" },
  scaleNum:  { fontSize: Typography.xs, fontWeight: "600" },
  presets:   { flexDirection: "row", gap: Spacing[2] },
  preset:    { flex: 1, alignItems: "center", paddingVertical: Spacing[2], borderRadius: Radius.lg, borderWidth: 1.5 },
  presetTxt: { fontSize: Typography.xs, fontWeight: "700" },
});

// ─── Preview Row ──────────────────────────────────────────────────────────────
function PreviewRow({
  label, value, valueColor, colors, bold,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: ColorScheme;
  bold?: boolean;
}) {
  return (
    <View style={pr.row}>
      <Text style={[pr.label, { color: colors.text2 }]}>{label}</Text>
      <Text style={[pr.val, {
        color: valueColor ?? colors.text,
        fontWeight: bold ? "700" : "500",
      }]}>
        {value}
      </Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: Spacing[3] },
  label: { fontSize: Typography.sm },
  val:   { fontSize: Typography.sm },
});

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props { paddingBottom: number; }

// ─── Main Component ───────────────────────────────────────────────────────────
const AddTab: React.FC<Props> = ({ paddingBottom }) => {
  const { colors } = useTheme();

  const [step, setStep]             = useState<1 | 2 | 3>(1);
  const [pairs, setPairs]           = useState<LoanPair[]>([]);
  const [pairsLoading, setPairsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selPair, setSelPair]       = useState<LoanPair | null>(null);
  const [collAmt, setCollAmt]       = useState("");
  const [ltv, setLtv]               = useState(50);
  const [preview, setPreview]       = useState<LoanPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [creating, setCreating]     = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ✅ LTV risk color — theme aware
  const ltvColor =
    ltv < 50 ? colors.accent :
    ltv < 75 ? colors.orange :
    colors.red;

  const ltvDimColor =
    ltv < 50 ? colors.accentDim :
    ltv < 75 ? colors.orangeDim :
    colors.redDim;

  const maxLtv = selPair?.ltv ?? 80;

  const loadPairs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setPairsLoading(true);
    try {
      const list = await loanService.getPairs();
      setPairs(list);
    } catch {
      setPairs([]);
    } finally {
      setPairsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPairs(); }, [loadPairs]);

  const fetchPreview = useCallback(
    (amount: string, ltvVal: number, pair: LoanPair | null) => {
      if (!pair || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        setPreview(null); return;
      }
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(async () => {
        setPreviewLoading(true);
        try {
          const res = await loanService.getPreview({ collateralAmount: amount, pairId: pair.pairId });
          setPreview(res);
        } catch {
          setPreview(null);
        } finally {
          setPreviewLoading(false);
        }
      }, 600);
    }, []
  );

  useEffect(() => { fetchPreview(collAmt, ltv, selPair); }, [collAmt, ltv, selPair, fetchPreview]);
  useEffect(() => { if (ltv > maxLtv) setLtv(maxLtv); }, [maxLtv]);

  const handleStep1 = () => {
    if (!selPair) { Alert.alert("Select a pair", "Please choose a loan pair to continue."); return; }
    setStep(2);
  };

  const handleStep2 = () => {
    if (!collAmt || Number(collAmt) <= 0) { Alert.alert("Enter amount", "Please enter a valid collateral amount."); return; }
    setStep(3);
  };

  const resetForm = () => {
    setStep(1); setSelPair(null); setCollAmt(""); setLtv(50); setPreview(null);
  };

  const handleConfirm = async () => {
    if (!selPair) return;
    setCreating(true);
    try {
      await loanService.create({
        collateralAsset:  selPair.collateral.id,
        borrowAsset:      selPair.borrow.id,
        collateralAmount: collAmt,
        ltv:              String(ltv),
      });
      Alert.alert("Loan Created!", "Your loan has been created successfully.", [
        { text: "View Loans", onPress: resetForm },
        { text: "Done",       onPress: resetForm },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to create loan. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  const handleBack = () => {
    if (step === 1) return;
    setStep((step - 1) as 1 | 2 | 3);
  };

  // ── STEP 1 ─────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <View style={a.root}>
        <StepIndicator step={step} colors={colors} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[a.scroll, { paddingBottom: paddingBottom + 80 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadPairs(true)}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
        >
          <Text style={[a.stepTitle, { color: colors.text }]}>Select Loan Pair</Text>
          <Text style={[a.stepSub, { color: colors.text2 }]}>
            Choose your collateral and what you want to borrow
          </Text>

          {pairsLoading ? (
            <View style={a.center}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : pairs.length === 0 ? (
            <View style={a.empty}>
              <View style={[a.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="storefront-outline" size={IconSize.xl} color={colors.accent} />
              </View>
              <Text style={[a.emptyTitle, { color: colors.text }]}>No pairs available</Text>
              <Text style={[a.emptyTxt, { color: colors.text2 }]}>Check back soon</Text>
            </View>
          ) : (
            pairs.map(p => (
              <PairSelectCard
                key={p.pairId}
                pair={p}
                selected={selPair?.pairId === p.pairId}
                colors={colors}
                onPress={() => setSelPair(p)}
              />
            ))
          )}
        </ScrollView>

        <View style={[a.ctaWrap, { backgroundColor: colors.bg, borderTopColor: colors.borderSoft }]}>
          <TouchableOpacity
            style={[a.ctaBtn, {
              backgroundColor: selPair ? colors.primaryBright : colors.primaryDim,
            }]}
            onPress={handleStep1}
            disabled={!selPair}
            activeOpacity={0.85}
          >
            <Text style={[a.ctaTxt, { color: selPair ? "#fff" : colors.text3 }]}>Continue</Text>
            <Ionicons name="arrow-forward" size={IconSize.sm} color={selPair ? "#fff" : colors.text3} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── STEP 2 ─────────────────────────────────────────────────────────────────
  if (step === 2 && selPair) {
    return (
      <View style={a.root}>
        <StepIndicator step={step} colors={colors} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[a.scroll, { paddingBottom: paddingBottom + 80 }]}
        >
          <Text style={[a.stepTitle, { color: colors.text }]}>Set Collateral & LTV</Text>
          <Text style={[a.stepSub, { color: colors.text2 }]}>
            Enter how much {selPair.collateral.symbol} to lock and adjust your LTV
          </Text>

          {/* Pair Banner */}
          <View style={[a.pairBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[a.pairBannerBadge, { backgroundColor: assetColor(selPair.collateral.symbol).bg }]}>
              <Text style={[a.pairBannerBadgeTxt, { color: assetColor(selPair.collateral.symbol).text }]}>
                {selPair.collateral.symbol}
              </Text>
            </View>
            <Ionicons name="swap-horizontal" size={IconSize.sm} color={colors.text2} />
            <View style={[a.pairBannerBadge, { backgroundColor: assetColor(selPair.borrow.symbol).bg }]}>
              <Text style={[a.pairBannerBadgeTxt, { color: assetColor(selPair.borrow.symbol).text }]}>
                {selPair.borrow.symbol}
              </Text>
            </View>
            <Text style={[a.pairBannerName, { color: colors.text }]}>
              {selPair.collateral.symbol} → {selPair.borrow.symbol}
            </Text>
            <TouchableOpacity
              onPress={() => setStep(1)}
              style={[a.changePairBtn, { backgroundColor: colors.accentDim }]}
            >
              <Text style={[a.changePairTxt, { color: colors.accent }]}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={[a.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[a.inputLabel, { color: colors.text2 }]}>
              Collateral Amount ({selPair.collateral.symbol})
            </Text>
            <View style={a.inputRow}>
              <TextInput
                style={[a.input, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.text3}
                keyboardType="decimal-pad"
                value={collAmt}
                onChangeText={setCollAmt}
              />
              <View style={[a.inputAsset, { backgroundColor: assetColor(selPair.collateral.symbol).bg }]}>
                <Text style={[a.inputAssetTxt, { color: assetColor(selPair.collateral.symbol).text }]}>
                  {selPair.collateral.symbol}
                </Text>
              </View>
            </View>
            <View style={a.quickAmts}>
              {["0.1", "0.5", "1", "5"].map(amt => (
                <TouchableOpacity
                  key={amt}
                  style={[
                    a.quickAmt,
                    { borderColor: collAmt === amt ? colors.accentBorder : colors.border },
                    collAmt === amt && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => setCollAmt(amt)}
                  activeOpacity={0.8}
                >
                  <Text style={[a.quickAmtTxt, {
                    color: collAmt === amt ? colors.accent : colors.text2,
                  }]}>
                    {amt}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* LTV Slider */}
          <View style={[a.sliderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LtvSlider
              value={ltv}
              maxLtv={maxLtv}
              onChange={setLtv}
              colors={colors}
            />
          </View>

          {/* Preview */}
          <View style={[a.previewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={a.previewHeader}>
              <View style={[a.previewIconBox, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="calculator-outline" size={IconSize.sm} color={colors.accent} />
              </View>
              <Text style={[a.previewTitle, { color: colors.text }]}>Loan Preview</Text>
              {previewLoading && (
                <ActivityIndicator size="small" color={colors.accent} style={{ marginLeft: Spacing[2] }} />
              )}
            </View>
            {preview ? (
              <>
                <PreviewRow label="Collateral Value" value={fmtUsd(preview.collateralUsd)} colors={colors} />
                <View style={[a.divider, { backgroundColor: colors.borderSoft }]} />
                <PreviewRow
                  label="You Borrow"
                  value={`${(preview.maxBorrow * ltv / (preview.ltv || maxLtv)).toFixed(4)} ${selPair.borrow.symbol}`}
                  valueColor={colors.accent}
                  bold
                  colors={colors}
                />
                <PreviewRow
                  label="Max Borrow"
                  value={`${preview.maxBorrow.toFixed(4)} ${selPair.borrow.symbol}`}
                  colors={colors}
                />
                <View style={[a.divider, { backgroundColor: colors.borderSoft }]} />
                <PreviewRow label="Annual Interest" value={`${preview.interest}%`} colors={colors} />
                <PreviewRow
                  label="Daily Interest"
                  value={`${preview.dailyInterest.toFixed(6)} ${selPair.borrow.symbol}`}
                  colors={colors}
                />
                <View style={[a.divider, { backgroundColor: colors.borderSoft }]} />
                <PreviewRow
                  label="Margin Call LTV"
                  value={`${preview.marginCall}%`}
                  valueColor={colors.orange}
                  colors={colors}
                />
                <PreviewRow
                  label="Liquidation LTV"
                  value={`${preview.liquidation}%`}
                  valueColor={colors.red}
                  colors={colors}
                />
              </>
            ) : (
              <View style={a.previewEmpty}>
                <Ionicons name="information-circle-outline" size={IconSize.md} color={colors.text3} />
                <Text style={[a.previewEmptyTxt, { color: colors.text3 }]}>
                  {collAmt ? "Loading preview…" : "Enter an amount to see preview"}
                </Text>
              </View>
            )}
          </View>

          {/* Risk Warning */}
          {ltv >= 75 && (
            <View style={[a.riskWarn, {
              backgroundColor: colors.redDim,
              borderColor: colors.redBorder,
            }]}>
              <Ionicons name="warning-outline" size={IconSize.sm} color={colors.red} />
              <Text style={[a.riskTxt, { color: colors.red }]}>
                High LTV — liquidation risk increases significantly above 75%
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={[a.ctaWrap, { backgroundColor: colors.bg, borderTopColor: colors.borderSoft }]}>
          <View style={a.ctaRow}>
            <TouchableOpacity
              style={[a.backBtnCta, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[a.ctaBtnFlex, {
                backgroundColor: collAmt ? ltvColor : colors.primaryDim,
              }]}
              onPress={handleStep2}
              disabled={!collAmt}
              activeOpacity={0.85}
            >
              <Text style={[a.ctaTxt, { color: collAmt ? "#fff" : colors.text3 }]}>
                Review Loan
              </Text>
              <Ionicons name="arrow-forward" size={IconSize.sm} color={collAmt ? "#fff" : colors.text3} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── STEP 3 ─────────────────────────────────────────────────────────────────
  if (step === 3 && selPair) {
    return (
      <View style={a.root}>
        <StepIndicator step={step} colors={colors} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[a.scroll, { paddingBottom: paddingBottom + 80 }]}
        >
          <Text style={[a.stepTitle, { color: colors.text }]}>Review & Confirm</Text>
          <Text style={[a.stepSub, { color: colors.text2 }]}>
            Double-check your loan details before confirming
          </Text>

          {/* Confirm Card */}
          <View style={[a.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={a.confirmPairRow}>
              <View style={[a.confirmBadge, { backgroundColor: assetColor(selPair.collateral.symbol).bg }]}>
                <Text style={[a.confirmBadgeTxt, { color: assetColor(selPair.collateral.symbol).text }]}>
                  {selPair.collateral.symbol}
                </Text>
              </View>
              <View style={[a.confirmArrow, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="arrow-forward" size={IconSize.sm} color={colors.accent} />
              </View>
              <View style={[a.confirmBadge, { backgroundColor: assetColor(selPair.borrow.symbol).bg }]}>
                <Text style={[a.confirmBadgeTxt, { color: assetColor(selPair.borrow.symbol).text }]}>
                  {selPair.borrow.symbol}
                </Text>
              </View>
              <Text style={[a.confirmPairName, { color: colors.text }]}>
                {selPair.collateral.symbol} → {selPair.borrow.symbol}
              </Text>
            </View>

            <View style={[a.divider, { backgroundColor: colors.borderSoft }]} />

            {/* You Lock */}
            <View style={[a.confirmBigRow, { backgroundColor: colors.orangeDim, borderRadius: Radius.lg, padding: Spacing[3] }]}>
              <View>
                <Text style={[a.confirmBigLabel, { color: colors.text3 }]}>You Lock</Text>
                <Text style={[a.confirmBigVal, { color: colors.text }]}>
                  {collAmt} {selPair.collateral.symbol}
                </Text>
              </View>
              <Ionicons name="lock-closed" size={IconSize.md} color={colors.orange} />
            </View>

            <View style={{ height: Spacing[2] }} />

            {/* You Receive */}
            <View style={[a.confirmBigRow, { backgroundColor: colors.accentDim, borderRadius: Radius.lg, padding: Spacing[3] }]}>
              <View>
                <Text style={[a.confirmBigLabel, { color: colors.text3 }]}>You Receive</Text>
                <Text style={[a.confirmBigVal, { color: colors.accent }]}>
                  {preview
                    ? `${(preview.maxBorrow * ltv / (preview.ltv || maxLtv)).toFixed(4)}`
                    : "—"}{" "}
                  {selPair.borrow.symbol}
                </Text>
              </View>
              <Ionicons name="cash" size={IconSize.md} color={colors.accent} />
            </View>

            <View style={[a.divider, { backgroundColor: colors.borderSoft, marginVertical: Spacing[3] }]} />

            <PreviewRow label="LTV Ratio" value={`${ltv}%`} valueColor={ltvColor} colors={colors} bold />
            <PreviewRow label="Annual Interest" value={`${selPair.interest}%`} colors={colors} />
            <PreviewRow label="Daily Rate" value={`${(selPair.interest / 365).toFixed(4)}%`} colors={colors} />
            {preview && (
              <>
                <PreviewRow label="Margin Call LTV" value={`${preview.marginCall}%`} valueColor={colors.orange} colors={colors} />
                <PreviewRow label="Liquidation LTV" value={`${preview.liquidation}%`} valueColor={colors.red} colors={colors} />
              </>
            )}
          </View>

          {/* Disclaimer */}
          <View style={[a.disclaimer, {
            backgroundColor: colors.orangeDim,
            borderColor: colors.orangeBorder,
          }]}>
            <Ionicons name="information-circle-outline" size={IconSize.sm} color={colors.orange} />
            <Text style={[a.disclaimerTxt, { color: colors.orange }]}>
              Your collateral will be locked until the loan is repaid. If the LTV exceeds the
              liquidation threshold, your collateral may be liquidated.
            </Text>
          </View>
        </ScrollView>

        <View style={[a.ctaWrap, { backgroundColor: colors.bg, borderTopColor: colors.borderSoft }]}>
          <View style={a.ctaRow}>
            <TouchableOpacity
              style={[a.backBtnCta, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={handleBack}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text2} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[a.ctaBtnFlex, {
                backgroundColor: creating ? colors.primaryDim : colors.primaryBright,
              }]}
              onPress={handleConfirm}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={IconSize.md} color="#fff" />
                  <Text style={a.ctaTxt}>Confirm & Borrow</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return null;
};

export default AddTab;

// ─── Styles ───────────────────────────────────────────────────────────────────
const a = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: Spacing[16] },
  scroll: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },

  stepTitle: { fontSize: Typography["2xl"], fontWeight: "800", marginBottom: Spacing[1] },
  stepSub:   { fontSize: Typography.sm, marginBottom: Spacing[5], lineHeight: 20 },

  // Pair card
  pairCard:   { borderRadius: Radius["2xl"], borderWidth: 1.5, padding: Spacing[4], marginBottom: Spacing[3], position: "relative" },
  checkBadge: { position: "absolute", top: 12, right: 12, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  iconRow:    { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginBottom: Spacing[3] },
  badge:      { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  badgeTxt:   { fontSize: Typography.xs, fontWeight: "800" },
  swapCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  pairName:   { fontSize: Typography.md, fontWeight: "700", marginBottom: 2 },
  pairSub:    { fontSize: Typography.xs, marginBottom: Spacing[3] },
  statsRow:   { flexDirection: "row", borderTopWidth: 1, paddingTop: Spacing[3], marginTop: Spacing[1] },
  stat:       { flex: 1, alignItems: "center" },
  statDiv:    { width: 1, alignSelf: "stretch" },
  statLabel:  { fontSize: Typography.xs, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 },
  statVal:    { fontSize: Typography.sm, fontWeight: "700" },

  // Pair banner (step 2)
  pairBanner:         { flexDirection: "row", alignItems: "center", gap: Spacing[2], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[3], marginBottom: Spacing[4] },
  pairBannerBadge:    { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  pairBannerBadgeTxt: { fontSize: Typography.xs, fontWeight: "800" },
  pairBannerName:     { flex: 1, fontSize: Typography.sm, fontWeight: "700" },
  changePairBtn:      { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.md },
  changePairTxt:      { fontSize: Typography.xs, fontWeight: "700" },

  // Input
  inputCard:     { borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },
  inputLabel:    { fontSize: Typography.xs, fontWeight: "600", marginBottom: Spacing[2], textTransform: "uppercase", letterSpacing: 0.4 },
  inputRow:      { flexDirection: "row", alignItems: "center", gap: Spacing[3], marginBottom: Spacing[3] },
  input:         { flex: 1, fontSize: 28, fontWeight: "800", padding: 0 },
  inputAsset:    { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full },
  inputAssetTxt: { fontSize: Typography.sm, fontWeight: "800" },
  quickAmts:     { flexDirection: "row", gap: Spacing[2] },
  quickAmt:      { flex: 1, alignItems: "center", paddingVertical: Spacing[2], borderRadius: Radius.lg, borderWidth: 1.5 },
  quickAmtTxt:   { fontSize: Typography.xs, fontWeight: "700" },

  // Slider card
  sliderCard: { borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },

  // Preview
  previewCard:     { borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },
  previewHeader:   { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginBottom: Spacing[3] },
  previewIconBox:  { width: 30, height: 30, borderRadius: Radius.md, alignItems: "center", justifyContent: "center" },
  previewTitle:    { fontSize: Typography.base, fontWeight: "700" },
  previewEmpty:    { alignItems: "center", paddingVertical: Spacing[5], gap: Spacing[2] },
  previewEmptyTxt: { fontSize: Typography.sm },
  divider:         { height: 1, marginVertical: Spacing[1] },

  // Risk warning
  riskWarn: { flexDirection: "row", alignItems: "flex-start", gap: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[3] },
  riskTxt:  { flex: 1, fontSize: Typography.sm, lineHeight: 18 },

  // Confirm card
  confirmCard:     { borderRadius: Radius["2xl"], borderWidth: 1, padding: Spacing[4], marginBottom: Spacing[4] },
  confirmPairRow:  { flexDirection: "row", alignItems: "center", gap: Spacing[2], marginBottom: Spacing[4] },
  confirmBadge:    { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  confirmBadgeTxt: { fontSize: Typography.xs, fontWeight: "800" },
  confirmArrow:    { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  confirmPairName: { flex: 1, fontSize: Typography.base, fontWeight: "700" },
  confirmBigRow:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  confirmBigLabel: { fontSize: Typography.xs, marginBottom: Spacing[1] },
  confirmBigVal:   { fontSize: Typography["2xl"], fontWeight: "800" },

  // Disclaimer
  disclaimer:    { flexDirection: "row", gap: Spacing[3], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], alignItems: "flex-start" },
  disclaimerTxt: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },

  // Empty
  empty:       { alignItems: "center", paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyIconBox:{ width: 72, height: 72, borderRadius: Radius["2xl"], alignItems: "center", justifyContent: "center" },
  emptyTitle:  { fontSize: Typography.base, fontWeight: "700" },
  emptyTxt:    { fontSize: Typography.sm, fontWeight: "500" },

  // CTA
  ctaWrap:    { paddingHorizontal: Spacing[4], paddingTop: Spacing[3], paddingBottom: Spacing[4], borderTopWidth: 1 },
  ctaBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[3], paddingVertical: Spacing[4], borderRadius: Radius.xl },
  ctaTxt:     { color: "#fff", fontSize: Typography.base, fontWeight: "700" },
  ctaRow:     { flexDirection: "row", gap: Spacing[3] },
  backBtnCta: { width: 52, height: 52, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  ctaBtnFlex: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: Spacing[3], paddingVertical: Spacing[4], borderRadius: Radius.xl },
});