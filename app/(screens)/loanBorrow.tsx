/**
 * app/loanBorrow.tsx
 * Loan Borrow screen — React Query version
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

// ✅ React Query hooks
import {
  useLoanPairs,
  useLoanPreview,
  useCreateLoan,
} from '@/hooks/queires';

import type {
  LoanPair,
  LoanPreview,
} from '@/types/loanType';

// ─── Constants ─────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;

// ─── Asset colour map ──────────────────────────────────────────────────────────
const ASSET_COLORS: Record<string, { bg: string; text: string }> = {
  BTC:   { bg: '#f7931a', text: '#fff' },
  ETH:   { bg: '#627eea', text: '#fff' },
  USDT:  { bg: '#26a17b', text: '#fff' },
  USDC:  { bg: '#2775ca', text: '#fff' },
  BNB:   { bg: '#f3ba2f', text: '#000' },
  SOL:   { bg: '#9945ff', text: '#fff' },
  TRX:   { bg: '#ef0027', text: '#fff' },
  XRP:   { bg: '#23292f', text: '#fff' },
  ADA:   { bg: '#0033ad', text: '#fff' },
  DOT:   { bg: '#e6007a', text: '#fff' },
  MATIC: { bg: '#8247e5', text: '#fff' },
};

const assetColor = (sym: string) =>
  ASSET_COLORS[sym?.toUpperCase()] ?? { bg: '#3D6170', text: '#fff' };

// ─── Helpers ───────────────────────────────────────────────────────────────────
const fmtUsd = (n?: number | null): string => {
  const v = Number(n ?? 0);
  if (!v) return '$0.00';
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}k`;
  return `$${v.toFixed(2)}`;
};

// ─── Step Indicator ────────────────────────────────────────────────────────────
function StepIndicator({
  step,
  colors,
  GREEN,
}: {
  step: number;
  colors: any;
  GREEN: string;
}) {
  const steps = ['Select Pair', 'Set Amount', 'Confirm'];
  return (
    <View style={si.wrap}>
      {steps.map((label, i) => {
        const idx    = i + 1;
        const done   = step > idx;
        const active = step === idx;
        return (
          <React.Fragment key={label}>
            <View style={si.item}>
              <View
                style={[
                  si.circle,
                  { borderColor: done || active ? GREEN : colors.border },
                  (done || active) && {
                    backgroundColor: done ? GREEN : 'transparent',
                  },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text
                    style={[
                      si.num,
                      { color: active ? GREEN : colors.text3 },
                    ]}
                  >
                    {idx}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  si.label,
                  { color: active ? colors.text : colors.text3 },
                ]}
              >
                {label}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View
                style={[
                  si.line,
                  { backgroundColor: step > idx ? GREEN : colors.border },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const si = StyleSheet.create({
  wrap:   {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing[4],
    paddingVertical:  14,
  },
  item:   { alignItems: 'center', gap: 4 },
  circle: {
    width:          28,
    height:         28,
    borderRadius:   14,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  num:    { fontSize: 12, fontWeight: '700' },
  label:  { fontSize: 10, fontWeight: '600' },
  line:   { flex: 1, height: 2, marginHorizontal: 6, marginBottom: 16 },
});

// ─── Pair Card ─────────────────────────────────────────────────────────────────
function PairSelectCard({
  pair,
  selected,
  colors,
  GREEN,
  onPress,
}: {
  pair: LoanPair;
  selected: boolean;
  colors: any;
  GREEN: string;
  onPress: () => void;
}) {
  const cClr = assetColor(pair.collateral.symbol);
  const bClr = assetColor(pair.borrow.symbol);

  return (
    <TouchableOpacity
      style={[
        ps.card,
        {
          backgroundColor: selected ? `${GREEN}0D` : colors.card,
          borderColor:     selected ? GREEN : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {selected && (
        <View style={[ps.checkBadge, { backgroundColor: GREEN }]}>
          <Ionicons name="checkmark" size={11} color="#fff" />
        </View>
      )}

      <View style={ps.iconRow}>
        <View style={[ps.badge, { backgroundColor: cClr.bg }]}>
          <Text style={[ps.badgeTxt, { color: cClr.text }]}>
            {pair.collateral.symbol}
          </Text>
        </View>
        <View style={[ps.swapCircle, { backgroundColor: colors.surface }]}>
          <Ionicons name="swap-horizontal" size={14} color={colors.text2} />
        </View>
        <View style={[ps.badge, { backgroundColor: bClr.bg }]}>
          <Text style={[ps.badgeTxt, { color: bClr.text }]}>
            {pair.borrow.symbol}
          </Text>
        </View>
      </View>

      <Text style={[ps.name, { color: colors.text }]}>
        {pair.collateral.symbol} → {pair.borrow.symbol}
      </Text>
      <Text style={[ps.sub, { color: colors.text3 }]}>Collateralized Loan</Text>

      <View style={[ps.statsRow, { borderTopColor: colors.border }]}>
        <View style={ps.stat}>
          <Text style={[ps.statLabel, { color: colors.text3 }]}>APR</Text>
          <Text style={[ps.statVal, { color: GREEN }]}>{pair.interest}%</Text>
        </View>
        <View style={[ps.statDiv, { backgroundColor: colors.border }]} />
        <View style={ps.stat}>
          <Text style={[ps.statLabel, { color: colors.text3 }]}>Max LTV</Text>
          <Text style={[ps.statVal, { color: colors.text }]}>{pair.ltv}%</Text>
        </View>
        <View style={[ps.statDiv, { backgroundColor: colors.border }]} />
        <View style={ps.stat}>
          <Text style={[ps.statLabel, { color: colors.text3 }]}>Daily</Text>
          <Text style={[ps.statVal, { color: colors.text }]}>
            {(pair.interest / 365).toFixed(4)}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const ps = StyleSheet.create({
  card:        {
    borderRadius: Radius['2xl'],
    borderWidth:  1.5,
    padding:      Spacing[4],
    marginBottom: 12,
    position:     'relative',
  },
  checkBadge:  {
    position:       'absolute',
    top:            12,
    right:          12,
    width:          22,
    height:         22,
    borderRadius:   11,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  badge:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  badgeTxt:    { fontSize: 12, fontWeight: '800' },
  swapCircle:  {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  name:        { fontSize: Typography.md, fontWeight: '700', marginBottom: 2 },
  sub:         { fontSize: Typography.xs, marginBottom: 12 },
  statsRow:    { flexDirection: 'row', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  stat:        { flex: 1, alignItems: 'center' },
  statDiv:     { width: 1, alignSelf: 'stretch' },
  statLabel:   {
    fontSize:      10,
    fontWeight:    '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom:  3,
  },
  statVal:     { fontSize: Typography.sm, fontWeight: '700' },
});

// ─── LTV Slider ────────────────────────────────────────────────────────────────
function LtvSlider({
  value,
  maxLtv,
  onChange,
  colors,
  GREEN,
  ORANGE,
  RED,
}: {
  value:    number;
  maxLtv:   number;
  onChange: (v: number) => void;
  colors:   any;
  GREEN:    string;
  ORANGE:   string;
  RED:      string;
}) {
  const trackRef   = useRef<View>(null);
  const trackWidth = useRef(0);

  const getColor = (v: number) => {
    if (v < 50) return GREEN;
    if (v < 75) return ORANGE;
    return RED;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (evt) => {
        if (!trackWidth.current) return;
        const x      = evt.nativeEvent.locationX;
        const pct    = Math.max(0, Math.min(1, x / trackWidth.current));
        const newVal = Math.round(pct * maxLtv);
        onChange(Math.min(newVal, maxLtv));
      },
      onPanResponderMove: (evt) => {
        if (!trackWidth.current) return;
        const x      = evt.nativeEvent.locationX;
        const pct    = Math.max(0, Math.min(1, x / trackWidth.current));
        const newVal = Math.round(pct * maxLtv);
        onChange(Math.min(newVal, maxLtv));
      },
    }),
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
        ref={trackRef}
        style={[sl.track, { backgroundColor: colors.border }]}
        onLayout={e => { trackWidth.current = e.nativeEvent.layout.width; }}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            sl.fill,
            { width: `${pct * 100}%`, backgroundColor: thumbColor },
          ]}
        />
        <View
          style={[
            sl.thumb,
            {
              left:            `${pct * 100}%`,
              backgroundColor: thumbColor,
              borderColor:     colors.bg,
              transform:       [{ translateX: -10 }],
            },
          ]}
        />
        <View style={[sl.marker, { left: '75%', backgroundColor: ORANGE }]} />
      </View>

      <View style={sl.scale}>
        <Text style={[sl.scaleNum, { color: GREEN }]}>0%</Text>
        <Text style={[sl.scaleNum, { color: ORANGE }]}>75%</Text>
        <Text style={[sl.scaleNum, { color: RED }]}>{maxLtv}%</Text>
      </View>

      <View style={sl.presets}>
        {[25, 50, 75, maxLtv].map(p => (
          <TouchableOpacity
            key={p}
            style={[
              sl.preset,
              {
                borderColor:     value === p ? thumbColor : colors.border,
                backgroundColor: value === p ? `${thumbColor}18` : 'transparent',
              },
            ]}
            onPress={() => onChange(p)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                sl.presetTxt,
                { color: value === p ? thumbColor : colors.text2 },
              ]}
            >
              {p}%
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const sl = StyleSheet.create({
  wrap:     { gap: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  label:    { fontSize: Typography.sm, fontWeight: '600' },
  val:      { fontSize: Typography.md, fontWeight: '800' },
  track:    { height: 10, borderRadius: 5, position: 'relative', overflow: 'visible' },
  fill:     { height: '100%', borderRadius: 5, position: 'absolute', left: 0 },
  thumb:    {
    position:     'absolute',
    top:          -5,
    width:        20,
    height:       20,
    borderRadius: 10,
    borderWidth:  2.5,
  },
  marker:   {
    position:     'absolute',
    top:          -4,
    width:        3,
    height:       18,
    borderRadius: 2,
    marginLeft:   -1.5,
  },
  scale:    { flexDirection: 'row', justifyContent: 'space-between' },
  scaleNum: { fontSize: 10, fontWeight: '600' },
  presets:  { flexDirection: 'row', gap: 8 },
  preset:   {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 7,
    borderRadius:   Radius.lg,
    borderWidth:    1.5,
  },
  presetTxt:{ fontSize: 12, fontWeight: '700' },
});

// ─── Preview Row ───────────────────────────────────────────────────────────────
function PreviewRow({
  label,
  value,
  valueColor,
  colors,
  bold,
}: {
  label:       string;
  value:       string;
  valueColor?: string;
  colors:      any;
  bold?:       boolean;
}) {
  return (
    <View style={pr.row}>
      <Text style={[pr.label, { color: colors.text2 }]}>{label}</Text>
      <Text
        style={[
          pr.val,
          {
            color:      valueColor ?? colors.text,
            fontWeight: bold ? '700' : '500',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const pr = StyleSheet.create({
  row:   {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 10,
  },
  label: { fontSize: Typography.sm },
  val:   { fontSize: Typography.sm },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function LoanBorrowScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();

  const GREEN  = colors.green;
  const ORANGE = colors.orange;
  const RED    = colors.red;

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [selPair, setSelPair] = useState<LoanPair | null>(null);
  const [collAmt, setCollAmt] = useState('');
  const [ltv, setLtv]         = useState(50);

  // ── Debounce collAmt for preview query ────────────────────────────────────
  const [debouncedAmt, setDebouncedAmt] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedAmt(collAmt);
    }, 600);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [collAmt]);

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Loan Pairs
  // ══════════════════════════════════════════════════════════════════════════
  const {
    data: pairsData,
    isLoading: pairsLoading,
    isError: pairsError,
    refetch: refetchPairs,
  } = useLoanPairs();

  // ✅ Normalize pairs array
  const pairs: LoanPair[] = useMemo(() => {
    if (!pairsData) return [];
    if (Array.isArray(pairsData)) return pairsData;
    if (Array.isArray((pairsData as any)?.pairs))  return (pairsData as any).pairs;
    if (Array.isArray((pairsData as any)?.data))   return (pairsData as any).data;
    return [];
  }, [pairsData]);

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Loan Preview (enabled only when inputs ready)
  // ══════════════════════════════════════════════════════════════════════════
  const previewPayload = useMemo(() => {
    if (
      !selPair ||
      !debouncedAmt ||
      isNaN(Number(debouncedAmt)) ||
      Number(debouncedAmt) <= 0
    ) {
      return null;
    }
    return {
      collateralAmount: debouncedAmt,
      pairId:           selPair.pairId,
    };
  }, [selPair, debouncedAmt]);

  const {
    data:      previewData,
    isLoading: previewLoading,
    isFetching: previewFetching,
  } = useLoanPreview(previewPayload);

  // ✅ Normalize preview
  const preview: LoanPreview | null = useMemo(() => {
    if (!previewData) return null;
    const d = (previewData as any)?.data ?? previewData;
    return d as LoanPreview;
  }, [previewData]);

  // ══════════════════════════════════════════════════════════════════════════
  // ✅ React Query — Create Loan mutation
  // ══════════════════════════════════════════════════════════════════════════
  const {
    mutateAsync: createLoan,
    isPending:   creating,
  } = useCreateLoan();

  // ── Clamp LTV when pair changes ───────────────────────────────────────────
  const maxLtv = selPair?.ltv ?? 80;

  useEffect(() => {
    if (ltv > maxLtv) setLtv(maxLtv);
  }, [maxLtv]);

  // ── Computed borrow amount ─────────────────────────────────────────────────
  const borrowAmt = useMemo(() => {
    if (!preview) return 0;
    return preview.maxBorrow * (ltv / (preview.ltv || maxLtv));
  }, [preview, ltv, maxLtv]);

  // ── LTV colour ────────────────────────────────────────────────────────────
  const ltvColor = ltv < 50 ? GREEN : ltv < 75 ? ORANGE : RED;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleNextStep1 = useCallback(() => {
    if (!selPair) {
      Alert.alert('Select a pair', 'Please choose a loan pair to continue.');
      return;
    }
    setStep(2);
  }, [selPair]);

  const handleNextStep2 = useCallback(() => {
    if (!collAmt || Number(collAmt) <= 0) {
      Alert.alert('Enter amount', 'Please enter a valid collateral amount.');
      return;
    }
    setStep(3);
  }, [collAmt]);

  const handleConfirm = useCallback(async () => {
    if (!selPair) return;
    try {
      await createLoan({
        collateralAsset:  selPair.collateral.id,
        borrowAsset:      selPair.borrow.id,
        collateralAmount: collAmt,
        ltv:              String(ltv),
      });
      Alert.alert(
        'Loan Created!',
        'Your loan has been created successfully.',
        [
          { text: 'View Loans', onPress: () => router.push('/loanHistory') },
          { text: 'Done',       onPress: () => router.back() },
        ],
      );
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message ?? 'Failed to create loan. Please try again.',
      );
    }
  }, [selPair, collAmt, ltv, createLoan, router]);

  const handleBack = useCallback(() => {
    if (step === 1) { router.back(); return; }
    setStep((step - 1) as 1 | 2 | 3);
  }, [step, router]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:       insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Borrow</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Step Indicator ── */}
      <StepIndicator step={step} colors={colors} GREEN={GREEN} />

      {/* ══════════════════════════════════════
          STEP 1 — Select Pair
      ══════════════════════════════════════ */}
      {step === 1 && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.scroll,
              { paddingBottom: 120 + insets.bottom },
            ]}
          >
            <Text style={[s.stepTitle, { color: colors.text }]}>
              Select Loan Pair
            </Text>
            <Text style={[s.stepSub, { color: colors.text2 }]}>
              Choose your collateral and what you want to borrow
            </Text>

            {/* ✅ Loading */}
            {pairsLoading ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={GREEN} />
              </View>

            ) : pairsError ? (
              /* ✅ Error state */
              <View style={s.emptyWrap}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={40}
                  color={colors.text3}
                />
                <Text style={[s.emptyTxt, { color: colors.text2 }]}>
                  Failed to load pairs
                </Text>
                <TouchableOpacity
                  onPress={() => refetchPairs()}
                  style={[
                    s.retryBtn,
                    {
                      backgroundColor: colors.greenDim,
                      borderColor:     colors.greenBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={14} color={GREEN} />
                  <Text style={[s.retryTxt, { color: GREEN }]}>Retry</Text>
                </TouchableOpacity>
              </View>

            ) : pairs.length === 0 ? (
              /* ✅ Empty state */
              <View style={s.emptyWrap}>
                <Ionicons
                  name="storefront-outline"
                  size={40}
                  color={colors.text3}
                />
                <Text style={[s.emptyTxt, { color: colors.text2 }]}>
                  No pairs available
                </Text>
              </View>

            ) : (
              /* ✅ Pairs list */
              pairs.map(p => (
                <PairSelectCard
                  key={p.pairId}
                  pair={p}
                  selected={selPair?.pairId === p.pairId}
                  colors={colors}
                  GREEN={GREEN}
                  onPress={() => setSelPair(p)}
                />
              ))
            )}
          </ScrollView>

          {/* CTA */}
          <View
            style={[
              s.ctaWrap,
              {
                paddingBottom:   insets.bottom + 12,
                backgroundColor: colors.bg,
                borderTopColor:  colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.ctaBtn,
                { backgroundColor: selPair ? GREEN : `${GREEN}44` },
              ]}
              onPress={handleNextStep1}
              disabled={!selPair}
              activeOpacity={0.85}
            >
              <Text style={s.ctaTxt}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ══════════════════════════════════════
          STEP 2 — Enter Amount + LTV
      ══════════════════════════════════════ */}
      {step === 2 && selPair && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              s.scroll,
              { paddingBottom: 120 + insets.bottom },
            ]}
          >
            <Text style={[s.stepTitle, { color: colors.text }]}>
              Set Collateral & LTV
            </Text>
            <Text style={[s.stepSub, { color: colors.text2 }]}>
              Enter how much {selPair.collateral.symbol} to lock and adjust your LTV
            </Text>

            {/* Selected pair banner */}
            <View
              style={[
                s.pairBanner,
                {
                  backgroundColor: colors.card,
                  borderColor:     colors.border,
                },
              ]}
            >
              <View
                style={[
                  s.pairBannerBadge,
                  { backgroundColor: assetColor(selPair.collateral.symbol).bg },
                ]}
              >
                <Text
                  style={[
                    s.pairBannerBadgeTxt,
                    { color: assetColor(selPair.collateral.symbol).text },
                  ]}
                >
                  {selPair.collateral.symbol}
                </Text>
              </View>
              <Ionicons name="swap-horizontal" size={16} color={colors.text2} />
              <View
                style={[
                  s.pairBannerBadge,
                  { backgroundColor: assetColor(selPair.borrow.symbol).bg },
                ]}
              >
                <Text
                  style={[
                    s.pairBannerBadgeTxt,
                    { color: assetColor(selPair.borrow.symbol).text },
                  ]}
                >
                  {selPair.borrow.symbol}
                </Text>
              </View>
              <Text style={[s.pairBannerName, { color: colors.text }]}>
                {selPair.collateral.symbol} → {selPair.borrow.symbol}
              </Text>
              <TouchableOpacity
                onPress={() => setStep(1)}
                style={s.changePairBtn}
              >
                <Text style={[s.changePairTxt, { color: GREEN }]}>Change</Text>
              </TouchableOpacity>
            </View>

            {/* Collateral Amount Input */}
            <View
              style={[
                s.inputCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[s.inputLabel, { color: colors.text2 }]}>
                Collateral Amount ({selPair.collateral.symbol})
              </Text>
              <View style={s.inputRow}>
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  placeholder="0.00"
                  placeholderTextColor={colors.text3}
                  keyboardType="decimal-pad"
                  value={collAmt}
                  onChangeText={setCollAmt}
                />
                <View
                  style={[
                    s.inputAsset,
                    { backgroundColor: assetColor(selPair.collateral.symbol).bg },
                  ]}
                >
                  <Text
                    style={[
                      s.inputAssetTxt,
                      { color: assetColor(selPair.collateral.symbol).text },
                    ]}
                  >
                    {selPair.collateral.symbol}
                  </Text>
                </View>
              </View>

              {/* Quick amounts */}
              <View style={s.quickAmts}>
                {['0.1', '0.5', '1', '5'].map(a => (
                  <TouchableOpacity
                    key={a}
                    style={[
                      s.quickAmt,
                      { borderColor: collAmt === a ? GREEN : colors.border },
                    ]}
                    onPress={() => setCollAmt(a)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        s.quickAmtTxt,
                        { color: collAmt === a ? GREEN : colors.text2 },
                      ]}
                    >
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* LTV Slider */}
            <View
              style={[
                s.sliderCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <LtvSlider
                value={ltv}
                maxLtv={maxLtv}
                onChange={setLtv}
                colors={colors}
                GREEN={GREEN}
                ORANGE={ORANGE}
                RED={RED}
              />
            </View>

            {/* ✅ Live Preview — React Query data */}
            <View
              style={[
                s.previewCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={s.previewHeader}>
                <Ionicons
                  name="calculator-outline"
                  size={16}
                  color={GREEN}
                />
                <Text style={[s.previewTitle, { color: colors.text }]}>
                  Loan Preview
                </Text>
                {/* ✅ Show spinner during fetch/refetch */}
                {(previewLoading || previewFetching) && (
                  <ActivityIndicator
                    size="small"
                    color={GREEN}
                    style={{ marginLeft: 8 }}
                  />
                )}
              </View>

              {preview ? (
                <>
                  <PreviewRow
                    label="Collateral Value"
                    value={fmtUsd(preview.collateralUsd)}
                    colors={colors}
                  />
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                  <PreviewRow
                    label="You Borrow"
                    value={`${borrowAmt.toFixed(4)} ${selPair.borrow.symbol}`}
                    valueColor={GREEN}
                    bold
                    colors={colors}
                  />
                  <PreviewRow
                    label="Max Borrow"
                    value={`${preview.maxBorrow.toFixed(4)} ${selPair.borrow.symbol}`}
                    colors={colors}
                  />
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                  <PreviewRow
                    label="Annual Interest"
                    value={`${preview.interest}%`}
                    colors={colors}
                  />
                  <PreviewRow
                    label="Daily Interest"
                    value={`${preview.dailyInterest.toFixed(6)} ${selPair.borrow.symbol}`}
                    colors={colors}
                  />
                  <View style={[s.divider, { backgroundColor: colors.border }]} />
                  <PreviewRow
                    label="Margin Call LTV"
                    value={`${preview.marginCall}%`}
                    valueColor={ORANGE}
                    colors={colors}
                  />
                  <PreviewRow
                    label="Liquidation LTV"
                    value={`${preview.liquidation}%`}
                    valueColor={RED}
                    colors={colors}
                  />
                </>
              ) : (
                <View style={s.previewEmpty}>
                  <Ionicons
                    name="information-circle-outline"
                    size={22}
                    color={colors.text3}
                  />
                  <Text style={[s.previewEmptyTxt, { color: colors.text3 }]}>
                    {collAmt
                      ? 'Loading preview…'
                      : 'Enter an amount to see preview'}
                  </Text>
                </View>
              )}
            </View>

            {/* Risk warning */}
            {ltv >= 75 && (
              <View
                style={[
                  s.riskWarn,
                  {
                    backgroundColor: `${RED}18`,
                    borderColor:     `${RED}44`,
                  },
                ]}
              >
                <Ionicons name="warning-outline" size={18} color={RED} />
                <Text style={[s.riskTxt, { color: RED }]}>
                  High LTV — liquidation risk increases significantly above 75%
                </Text>
              </View>
            )}
          </ScrollView>

          <View
            style={[
              s.ctaWrap,
              {
                paddingBottom:   insets.bottom + 12,
                backgroundColor: colors.bg,
                borderTopColor:  colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.ctaBtn,
                { backgroundColor: collAmt ? ltvColor : `${GREEN}44` },
              ]}
              onPress={handleNextStep2}
              disabled={!collAmt}
              activeOpacity={0.85}
            >
              <Text style={s.ctaTxt}>Review Loan</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ══════════════════════════════════════
          STEP 3 — Review & Confirm
      ══════════════════════════════════════ */}
      {step === 3 && selPair && (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              s.scroll,
              { paddingBottom: 120 + insets.bottom },
            ]}
          >
            <Text style={[s.stepTitle, { color: colors.text }]}>
              Review & Confirm
            </Text>
            <Text style={[s.stepSub, { color: colors.text2 }]}>
              Double-check your loan details before confirming
            </Text>

            {/* Summary card */}
            <View
              style={[
                s.confirmCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Pair header */}
              <View style={s.confirmPairRow}>
                <View
                  style={[
                    s.confirmBadge,
                    { backgroundColor: assetColor(selPair.collateral.symbol).bg },
                  ]}
                >
                  <Text
                    style={[
                      s.confirmBadgeTxt,
                      { color: assetColor(selPair.collateral.symbol).text },
                    ]}
                  >
                    {selPair.collateral.symbol}
                  </Text>
                </View>
                <View style={s.confirmArrow}>
                  <Ionicons name="arrow-forward" size={16} color={GREEN} />
                </View>
                <View
                  style={[
                    s.confirmBadge,
                    { backgroundColor: assetColor(selPair.borrow.symbol).bg },
                  ]}
                >
                  <Text
                    style={[
                      s.confirmBadgeTxt,
                      { color: assetColor(selPair.borrow.symbol).text },
                    ]}
                  >
                    {selPair.borrow.symbol}
                  </Text>
                </View>
                <Text style={[s.confirmPairName, { color: colors.text }]}>
                  {selPair.collateral.symbol} → {selPair.borrow.symbol}
                </Text>
              </View>

              <View style={[s.divider, { backgroundColor: colors.border }]} />

              {/* Collateral locked */}
              <View style={s.confirmBigRow}>
                <View>
                  <Text style={[s.confirmBigLabel, { color: colors.text3 }]}>
                    You Lock
                  </Text>
                  <Text style={[s.confirmBigVal, { color: colors.text }]}>
                    {collAmt} {selPair.collateral.symbol}
                  </Text>
                </View>
                <Ionicons name="lock-closed" size={20} color={ORANGE} />
              </View>

              {/* Borrow amount */}
              <View style={s.confirmBigRow}>
                <View>
                  <Text style={[s.confirmBigLabel, { color: colors.text3 }]}>
                    You Receive
                  </Text>
                  {/* ✅ Use computed borrowAmt */}
                  <Text style={[s.confirmBigVal, { color: GREEN }]}>
                    {preview ? borrowAmt.toFixed(4) : '—'}{' '}
                    {selPair.borrow.symbol}
                  </Text>
                </View>
                <Ionicons name="cash" size={20} color={GREEN} />
              </View>

              <View style={[s.divider, { backgroundColor: colors.border }]} />

              <PreviewRow
                label="LTV Ratio"
                value={`${ltv}%`}
                valueColor={ltvColor}
                colors={colors}
                bold
              />
              <PreviewRow
                label="Annual Interest"
                value={`${selPair.interest}%`}
                colors={colors}
              />
              <PreviewRow
                label="Daily Rate"
                value={`${(selPair.interest / 365).toFixed(4)}%`}
                colors={colors}
              />
              {preview && (
                <>
                  <PreviewRow
                    label="Margin Call LTV"
                    value={`${preview.marginCall}%`}
                    valueColor={ORANGE}
                    colors={colors}
                  />
                  <PreviewRow
                    label="Liquidation LTV"
                    value={`${preview.liquidation}%`}
                    valueColor={RED}
                    colors={colors}
                  />
                </>
              )}
            </View>

            {/* Disclaimer */}
            <View
              style={[
                s.disclaimer,
                {
                  backgroundColor: `${ORANGE}12`,
                  borderColor:     `${ORANGE}33`,
                },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={ORANGE}
              />
              <Text style={[s.disclaimerTxt, { color: ORANGE }]}>
                Your collateral will be locked until the loan is repaid. If
                the LTV exceeds the liquidation threshold, your collateral
                may be liquidated.
              </Text>
            </View>
          </ScrollView>

          <View
            style={[
              s.ctaWrap,
              {
                paddingBottom:   insets.bottom + 12,
                backgroundColor: colors.bg,
                borderTopColor:  colors.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                s.ctaBtn,
                { backgroundColor: creating ? `${GREEN}66` : GREEN },
              ]}
              onPress={handleConfirm}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color="#fff"
                  />
                  <Text style={s.ctaTxt}>Confirm & Borrow</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  scroll: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },

  // Header
  header: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing[4],
    paddingBottom:    12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex:      1,
    textAlign: 'center',
    fontSize:  Typography.lg,
    fontWeight:'700',
  },
  iconBtn: {
    width:          38,
    height:         38,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Step titles
  stepTitle: { fontSize: Typography['2xl'], fontWeight: '800', marginBottom: 4 },
  stepSub:   { fontSize: Typography.sm, marginBottom: 18, lineHeight: 20 },

  // Pair banner
  pairBanner: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       12,
    marginBottom:  14,
  },
  pairBannerBadge:    { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pairBannerBadgeTxt: { fontSize: 12, fontWeight: '800' },
  pairBannerName:     { flex: 1, fontSize: Typography.sm, fontWeight: '700' },
  changePairBtn:      { paddingHorizontal: 10, paddingVertical: 4 },
  changePairTxt:      { fontSize: 12, fontWeight: '700' },

  // Input card
  inputCard:    {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: 12,
  },
  inputLabel:   {
    fontSize:      Typography.xs,
    fontWeight:    '600',
    marginBottom:  8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  input:        { flex: 1, fontSize: 28, fontWeight: '800', padding: 0 },
  inputAsset:   { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  inputAssetTxt:{ fontSize: 13, fontWeight: '800' },
  quickAmts:    { flexDirection: 'row', gap: 8 },
  quickAmt:     {
    flex:           1,
    alignItems:     'center',
    paddingVertical: 7,
    borderRadius:   Radius.lg,
    borderWidth:    1.5,
  },
  quickAmtTxt:  { fontSize: 12, fontWeight: '700' },

  // Slider card
  sliderCard: {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: 12,
  },

  // Preview card
  previewCard:     {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: 12,
  },
  previewHeader:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  previewTitle:    { fontSize: Typography.base, fontWeight: '700' },
  previewEmpty:    { alignItems: 'center', paddingVertical: 20, gap: 8 },
  previewEmptyTxt: { fontSize: Typography.sm },
  divider:         { height: 1, marginVertical: 4 },

  // Risk warning
  riskWarn: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           10,
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       14,
    marginBottom:  12,
  },
  riskTxt: { flex: 1, fontSize: Typography.sm, lineHeight: 18 },

  // Confirm card
  confirmCard:     {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: 14,
  },
  confirmPairRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  confirmBadge:    { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  confirmBadgeTxt: { fontSize: 12, fontWeight: '800' },
  confirmArrow:    {
    width:          28,
    height:         28,
    borderRadius:   14,
    alignItems:     'center',
    justifyContent: 'center',
  },
  confirmPairName: { flex: 1, fontSize: Typography.base, fontWeight: '700' },
  confirmBigRow:   {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 14,
  },
  confirmBigLabel: { fontSize: Typography.xs, marginBottom: 4 },
  confirmBigVal:   { fontSize: Typography['2xl'], fontWeight: '800' },

  // Disclaimer
  disclaimer:    {
    flexDirection: 'row',
    gap:           10,
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       14,
    alignItems:    'flex-start',
  },
  disclaimerTxt: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },

  // CTA
  ctaWrap: {
    paddingHorizontal: Spacing[4],
    paddingTop:        12,
    borderTopWidth:    1,
  },
  ctaBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            10,
    paddingVertical: 16,
    borderRadius:   Radius.xl,
  },
  ctaTxt: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  // Empty / Error
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTxt:  { fontSize: Typography.base, fontWeight: '500' },
  retryBtn:  {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingHorizontal: 16,
    paddingVertical:   8,
    borderRadius:      10,
    borderWidth:       1,
    marginTop:         4,
  },
  retryTxt: { fontSize: 13, fontWeight: '600' },
});