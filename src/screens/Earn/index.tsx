import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Platform, Animated,
  Switch, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius, IconSize, IconBox,
  getPrimaryGradient, getSuccessGradient,
} from '@/styles/theme';

import {
  useEarnDashboard, useEarnProducts, useEarnLeaderboard,
  useEarnHistory, useRedeemPreview, useRedeemEarn,
  useEarnCalculator,
  type EarnProduct, type EarnPosition,
} from '@/hooks/queires';

import SubscribeModal from './SubscribeModal';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.innerHTML = `input,textarea{outline:none!important;box-shadow:none!important;-webkit-appearance:none!important;}`;
  document.head.appendChild(st);
}

const IS_WEB     = Platform.OS === 'web';
const ITEMS_PAGE = 5;

const webReset = Platform.OS === 'web'
  ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none', WebkitAppearance: 'none' } as any)
  : {};

const showAlert = (title: string, msg?: string, btns?: any[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}${msg ? '\n\n' + msg : ''}`);
    btns?.find((b: any) => b.style !== 'cancel')?.onPress?.();
  } else {
    require('react-native').Alert.alert(title, msg, btns);
  }
};

const fmtUsd = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const fmtNum = (v: number | string, d = 4) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '0.00';
  if (n !== 0 && Math.abs(n) < 0.01) return n.toFixed(d);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: d });
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const COIN_COLORS: Record<string, [string, string]> = {
  BTC:   ['#F7931A', '#E8830A'], ETH:   ['#627EEA', '#4A6DD8'],
  TRX:   ['#E83050', '#C0202A'], BNB:   ['#F5A623', '#E09510'],
  USDT:  ['#26A17B', '#1A8A66'], USDC:  ['#2775CA', '#1A60B5'],
  SOL:   ['#9945FF', '#7B35E0'], MATIC: ['#8247E5', '#6535CC'],
};
const coinColors = (s: string): [string, string] =>
  COIN_COLORS[s?.toUpperCase()] ?? ['#334155', '#1E293B'];

const TYPE_META: Record<string, { label: string; icon: string; colorKey: string }> = {
  SUBSCRIBE:    { label: 'Subscribed',   icon: 'arrow-up-circle-outline',   colorKey: 'green'   },
  DAILY_REWARD: { label: 'Daily Reward', icon: 'star-outline',              colorKey: 'primary'  },
  REDEEM:       { label: 'Redeemed',     icon: 'arrow-down-circle-outline', colorKey: 'orange'  },
  PENALTY:      { label: 'Penalty',      icon: 'warning-outline',           colorKey: 'red'     },
  COMPOUND:     { label: 'Compounded',   icon: 'refresh-circle-outline',    colorKey: 'purple'  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({ w, h, r = Radius.md, style }: { w?: any; h: number; r?: number; style?: any }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.7] });
  return (
    <Animated.View
      style={[{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: '#334155', opacity }, style]}
    />
  );
}

function HomeSkeleton() {
  return (
    <ScrollView scrollEnabled={false} contentContainerStyle={{ padding: Spacing[4], gap: Spacing[4] }}>
      <SkeletonBox h={150} r={Radius['2xl']} />
      <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
        <SkeletonBox h={92} r={Radius.xl} style={{ flex: 1 }} />
        <SkeletonBox h={92} r={Radius.xl} style={{ flex: 1 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
        <SkeletonBox h={92} r={Radius.xl} style={{ flex: 1 }} />
        <SkeletonBox h={92} r={Radius.xl} style={{ flex: 1 }} />
      </View>
      {[1, 2, 3].map(i => <SkeletonBox key={i} h={128} r={Radius.xl} />)}
      <SkeletonBox h={300} r={Radius['2xl']} />
      {[1, 2, 3, 4].map(i => (
        <SkeletonBox key={i} h={66} r={0} style={
          i === 1 ? { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl }
          : i === 4 ? { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl }
          : {}
        } />
      ))}
      <SkeletonBox h={92} r={Radius['2xl']} />
    </ScrollView>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({
  product, onSubscribe, colors, isDark,
}: {
  product: EarnProduct; onSubscribe: (p: EarnProduct) => void; colors: any; isDark: boolean;
}) {
  const isFixed = product.type === 'fixed';
  // fixed = red primary, flexible = primary/primary
  const primaryColor = isFixed ? colors.red : colors.primary;
  const [c1, c2]   = coinColors(product.symbol);
  const primaryGrad = getPrimaryGradient(isDark);

  return (
    <TouchableOpacity
      style={[pc.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onSubscribe(product)}
      activeOpacity={0.85}
    >
      <View style={[pc.primary, { backgroundColor: primaryColor }]} />
      <View style={{ flex: 1, padding: Spacing[4] }}>
        <View style={pc.topRow}>
          <LinearGradient colors={[c1, c2]} style={pc.icon}>
            <Text style={pc.iconTxt}>{(product.symbol ?? '?')[0]}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: Spacing[3] }}>
            <Text style={[pc.name, { color: colors.text }]}>{product.name}</Text>
            <Text style={[pc.symbol, { color: colors.text2 }]}>{product.symbol}</Text>
          </View>
          <View style={[pc.badge, { borderColor: primaryColor, backgroundColor: `${primaryColor}18` }]}>
            <Ionicons name={isFixed ? 'lock-closed' : 'lock-open'} size={IconSize.xs} color={primaryColor} />
            <Text style={[pc.badgeTxt, { color: primaryColor }]}>
              {isFixed ? `${product.duration ?? 0}D` : 'Flex'}
            </Text>
          </View>
        </View>

        <View style={[pc.divider, { backgroundColor: colors.borderSoft }]} />

        <View style={pc.statsRow}>
          <View style={pc.stat}>
            {/* APY = greenBright — positive earnings */}
            <Text style={[pc.statVal, { color: colors.greenBright }]}>{product.apy}%</Text>
            <Text style={[pc.statLbl, { color: colors.text3 }]}>APY</Text>
          </View>
          <View style={[pc.sep, { backgroundColor: colors.borderSoft }]} />
          <View style={pc.stat}>
            <Text style={[pc.statVal, { color: colors.text }]}>
              {product.minAmount} {product.symbol}
            </Text>
            <Text style={[pc.statLbl, { color: colors.text3 }]}>Min Deposit</Text>
          </View>
          <View style={[pc.sep, { backgroundColor: colors.borderSoft }]} />
          <View style={pc.stat}>
            <Text style={[pc.statVal, { color: colors.text }]}>
              {fmtNum(product.balance ?? 0, 4)}
            </Text>
            <Text style={[pc.statLbl, { color: colors.text3 }]}>Balance</Text>
          </View>
        </View>

        {/* CTA = primary color (navy theme highlight) */}
        <Text style={[pc.cta, { color: colors.primary }]}>Tap to Subscribe →</Text>
      </View>
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card:     { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  primary:   { width: 5 },
  topRow:   { flexDirection: 'row', alignItems: 'center' },
  icon:     { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  iconTxt:  { fontSize: Typography.md, fontWeight: '700', color: '#FFF' },
  name:     { fontSize: Typography.base, fontWeight: '700' },
  symbol:   { fontSize: Typography.xs, marginTop: 2 },
  badge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[2] + 2, paddingVertical: 5, borderRadius: Radius.full, borderWidth: 1.2 },
  badgeTxt: { fontSize: Typography.xs, fontWeight: '700' },
  divider:  { height: 1, marginVertical: Spacing[3] },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat:     { flex: 1, alignItems: 'center' },
  statVal:  { fontSize: Typography.sm, fontWeight: '700' },
  statLbl:  { fontSize: Typography.xs, marginTop: 2 },
  sep:      { width: 1, height: 32 },
  cta:      { fontSize: Typography.xs, fontWeight: '600', textAlign: 'right', marginTop: Spacing[2] + 2 },
});

// ─── Redeem Modal ─────────────────────────────────────────────────────────────
function RedeemModal({
  visible, position, onClose, onSuccess, colors, isDark,
}: {
  visible: boolean; position: EarnPosition | null;
  onClose: () => void; onSuccess: () => void;
  colors: any; isDark: boolean;
}) {
  const { data: preview, isLoading: prevLoad } = useRedeemPreview(position?._id ?? '');
  const redeemMutation = useRedeemEarn();
  const primaryGrad    = getPrimaryGradient(isDark);

  const handleRedeem = useCallback(async () => {
    if (!position) return;
    try {
      await redeemMutation.mutateAsync(position._id);
      onClose();
      showAlert('Redeemed ✅', 'Funds returned to your wallet', [{ text: 'OK', onPress: onSuccess }]);
    } catch (e: any) {
      showAlert('Failed', e?.message ?? 'Redemption failed');
    }
  }, [position, redeemMutation, onClose, onSuccess]);

  if (!visible || !position) return null;

  const penalty = position.productId?.earlyWithdrawPenaltyPercent ?? 0;

  const previewRows = preview
    ? [
        { label: 'Principal',     val: `${fmtNum(Number(preview.principal ?? 0), 6)} ${position.asset}`,   colorKey: 'text'  },
        { label: 'Total Earned',  val: `${fmtNum(Number(preview.totalEarned ?? 0), 8)} ${position.asset}`, colorKey: 'greenBright' },
        { label: 'Penalty',       val: `${fmtNum(Number(preview.penalty ?? 0), 8)} ${position.asset}`,     colorKey: 'red'   },
        { label: 'Final Reward',  val: `${fmtNum(Number(preview.finalReward ?? 0), 8)} ${position.asset}`, colorKey: 'greenBright' },
        { label: 'Staked',        val: `${fmtNum(position.amount, 4)} ${position.asset}`,                   colorKey: 'text'  },
        { label: 'Earned So Far', val: `${fmtNum(position.earned ?? 0, 8)} ${position.asset}`,              colorKey: 'greenBright' },
      ]
    : [
        { label: 'Staked', val: fmtNum(position.amount) + ' ' + position.asset, colorKey: 'text'  },
        { label: 'Earned', val: fmtNum(position.earned, 8) + ' ' + position.asset, colorKey: 'greenBright' },
      ];

  const Inner = (
    <View style={[rm.inner, { backgroundColor: colors.card }, IS_WEB && rm.innerWeb]}>
      {!IS_WEB && <View style={[rm.handle, { backgroundColor: colors.border }]} />}

      <Text style={[rm.title, { color: colors.text }]}>Redeem Position</Text>
      <Text style={[rm.sub, { color: colors.text2 }]}>
        {position.productId?.name ?? position.asset} · {position.asset}
      </Text>

      {prevLoad ? (
        <View style={{ gap: Spacing[2] + 2, marginVertical: Spacing[4] }}>
          {[1, 2, 3, 4].map(i => <SkeletonBox key={i} h={14} r={Radius.xs} />)}
        </View>
      ) : (
        <View style={[rm.previewBox, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
          {previewRows.map((r, i, arr) => (
            <View
              key={r.label}
              style={[rm.row, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderSoft }]}
            >
              <Text style={[rm.rowLbl, { color: colors.text2 }]}>{r.label}</Text>
              <Text style={[rm.rowVal, { color: (colors as any)[r.colorKey] }]}>{r.val}</Text>
            </View>
          ))}
        </View>
      )}

      {penalty > 0 && (
        <View style={[rm.warn, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
          <Ionicons name="warning-outline" size={IconSize.xs} color={colors.red} />
          <Text style={[rm.warnTxt, { color: colors.red }]}>
            Early withdrawal penalty: {penalty}%
          </Text>
        </View>
      )}

      <View style={rm.actions}>
        <TouchableOpacity style={[rm.cancelBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
          <Text style={[rm.cancelTxt, { color: colors.text2 }]}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[rm.redeemBtn, redeemMutation.isPending && { opacity: 0.6 }]}
          onPress={handleRedeem}
          disabled={redeemMutation.isPending}
          activeOpacity={0.85}
        >
          {/* Primary gradient = navy theme ke saath match karta hai */}
          <LinearGradient colors={primaryGrad} style={rm.redeemGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {redeemMutation.isPending
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={rm.redeemTxt}>Confirm Redeem</Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (IS_WEB) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={[rm.webOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
          <View style={[rm.webPanel, { borderColor: colors.border }]}>{Inner}</View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="slide">
      <View style={[rm.mobileOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        {Inner}
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  webOverlay:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[6] },
  webPanel:      { width: '100%', maxWidth: 440, borderRadius: Radius['2xl'], borderWidth: 1, overflow: 'hidden' },
  mobileOverlay: { flex: 1, justifyContent: 'flex-end' },
  inner:         { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[6], paddingBottom: Spacing[8] + 4 },
  innerWeb:      { borderRadius: Radius['2xl'] },
  handle:        { width: 40, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing[5] },
  title:         { fontSize: Typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  sub:           { fontSize: Typography.sm, textAlign: 'center', marginBottom: Spacing[5] },
  previewBox:    { borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing[4], overflow: 'hidden' },
  row:           { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing[3] + 2 },
  rowLbl:        { fontSize: Typography.sm },
  rowVal:        { fontSize: Typography.sm, fontWeight: '700' },
  warn:          { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing[4] },
  warnTxt:       { fontSize: Typography.xs, flex: 1 },
  actions:       { flexDirection: 'row', gap: Spacing[3] },
  cancelBtn:     { flex: 1, paddingVertical: Spacing[3] + 2, borderRadius: Radius.lg, alignItems: 'center' },
  cancelTxt:     { fontSize: Typography.base, fontWeight: '600' },
  redeemBtn:     { flex: 2, borderRadius: Radius.lg, overflow: 'hidden' },
  redeemGrad:    { paddingVertical: Spacing[3] + 2, alignItems: 'center', justifyContent: 'center' },
  redeemTxt:     { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
});

// ─── All Products Screen ──────────────────────────────────────────────────────
function AllProductsScreen({
  onSubscribe, colors, isDark,
}: {
  onSubscribe: (p: EarnProduct) => void; colors: any; isDark: boolean;
}) {
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'ALL' | 'flexible' | 'fixed'>('ALL');
  const [page,   setPage]   = useState(1);

  const { data: allProducts = [], isLoading } = useEarnProducts();

  const products   = filter === 'ALL' ? allProducts : allProducts.filter(p => p.type === filter);
  const total      = products.length;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PAGE));
  const paged      = products.slice((page - 1) * ITEMS_PAGE, page * ITEMS_PAGE);

  useEffect(() => { setPage(1); }, [filter]);

  const FILTERS = [
    { key: 'ALL',      label: 'All',      icon: null,          col: colors.primary },
    { key: 'flexible', label: 'Flexible', icon: 'lock-open',   col: colors.primary },
    { key: 'fixed',    label: 'Fixed',    icon: 'lock-closed', col: colors.red    },
  ] as const;

  return (
    <View style={{ flex: 1 }}>
      <View style={[ap.filterBar, { borderBottomColor: colors.border }]}>
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[
                ap.filterBtn,
                { borderColor: active ? f.col : colors.border },
                active && { backgroundColor: `${f.col}18` },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.8}
            >
              {f.icon && <Ionicons name={f.icon} size={IconSize.xs} color={active ? f.col : colors.text3} />}
              <Text style={[ap.filterTxt, { color: active ? f.col : colors.text2 }]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[3], paddingBottom: insets.bottom + 40 }}
      >
        {isLoading
          ? [1, 2, 3].map(i => <SkeletonBox key={i} h={128} r={Radius.xl} />)
          : paged.length === 0
            ? (
              <View style={ap.empty}>
                <Ionicons name="cube-outline" size={52} color={colors.text3} />
                <Text style={[ap.emptyTxt, { color: colors.text2 }]}>No products found</Text>
              </View>
            )
            : paged.map(p => (
              <ProductCard key={p.id} product={p} onSubscribe={onSubscribe} colors={colors} isDark={isDark} />
            ))
        }

        {total > ITEMS_PAGE && (
          <View style={[ap.pagination, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[ap.pageInfo, { color: colors.text2 }]}>
              Showing{' '}
              <Text style={{ color: colors.primary }}>
                {(page - 1) * ITEMS_PAGE + 1}–{Math.min(page * ITEMS_PAGE, total)}
              </Text>
              {' '}of <Text style={{ color: colors.primary }}>{total}</Text>
            </Text>
            <View style={ap.pageNav}>
              <TouchableOpacity
                style={[ap.pageBtn, { borderColor: colors.border, backgroundColor: colors.surface }, page <= 1 && { opacity: 0.35 }]}
                onPress={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <Ionicons name="chevron-back" size={IconSize.sm} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[ap.pageBtn, { borderColor: colors.border, backgroundColor: colors.surface }, page >= totalPages && { opacity: 0.35 }]}
                onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[ap.pageInfo, { color: colors.text2 }]}>
              Page <Text style={{ color: colors.primary }}>{page}/{totalPages}</Text>
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const ap = StyleSheet.create({
  filterBar:  { flexDirection: 'row', gap: Spacing[2] + 2, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  filterBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2] + 1, borderRadius: Radius.full, borderWidth: 1.5 },
  filterTxt:  { fontSize: Typography.sm, fontWeight: '600' },
  empty:      { alignItems: 'center', paddingVertical: 60, gap: Spacing[3] },
  emptyTxt:   { fontSize: Typography.base },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[3] + 2, borderRadius: Radius.lg, borderWidth: 1 },
  pageInfo:   { fontSize: Typography.sm },
  pageNav:    { flexDirection: 'row', gap: Spacing[2] },
  pageBtn:    { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

// ─── Earn Calculator ──────────────────────────────────────────────────────────
function EarnCalculator({ colors, isDark }: { colors: any; isDark: boolean }) {
  const { data: products = [] } = useEarnProducts();
  const calculatorMutation      = useEarnCalculator();
  const primaryGrad             = getPrimaryGradient(isDark);

  const [selProduct, setSelProduct] = useState<EarnProduct | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [amount,     setAmount]     = useState('');
  const [days,       setDays]       = useState('30');
  const [earlyExit,  setEarlyExit]  = useState(false);

  const handleCalc = useCallback(async () => {
    if (!selProduct) { showAlert('Required', 'Please select a product'); return; }
    if (!amount || parseFloat(amount) <= 0) { showAlert('Required', 'Please enter an amount'); return; }
    try {
      await calculatorMutation.mutateAsync({
        productId: selProduct.id,
        amount,
        days: selProduct.type === 'fixed' ? String(selProduct.duration ?? 30) : String(days),
        isEarly: String(earlyExit),
      });
    } catch (e: any) {
      showAlert('Error', e?.message ?? 'Calculation failed');
    }
  }, [selProduct, amount, days, earlyExit, calculatorMutation]);

  const handleToggleEarlyExit = useCallback((v: boolean) => {
    setEarlyExit(v);
    calculatorMutation.reset();
  }, [calculatorMutation]);

  const handleSelectProduct = useCallback((p: EarnProduct) => {
    setSelProduct(p);
    setDays(String(p.duration ?? 30));
    calculatorMutation.reset();
    setShowPicker(false);
  }, [calculatorMutation]);

  const result = calculatorMutation.data;

  const resultRows = useMemo(() => {
    if (!result || !selProduct) return [];
    const sym = selProduct.symbol;
    return [
      { l: 'Daily Earn',   v: result.dailyEarn   != null ? `${fmtNum(result.dailyEarn, 8)} ${sym}`   : '—', isRed: false },
      { l: 'Monthly Earn', v: result.monthlyEarn != null ? `${fmtNum(result.monthlyEarn, 6)} ${sym}` : '—', isRed: false },
      { l: 'Yearly Earn',  v: result.yearlyEarn  != null ? `${fmtNum(result.yearlyEarn, 6)} ${sym}`  : '—', isRed: false },
      { l: 'Total Earn',   v: result.totalEarn   != null ? `${fmtNum(result.totalEarn, 6)} ${sym}`   : '—', isRed: false },
      ...(earlyExit && result.penalty != null && result.penalty > 0
        ? [{ l: 'Penalty', v: `-${fmtNum(result.penalty, 6)} ${sym}`, isRed: true }]
        : []),
      { l: 'Total Return', v: result.totalReturn != null ? `${fmtNum(result.totalReturn, 6)} ${sym}` : '—', isRed: false },
    ];
  }, [result, selProduct, earlyExit]);

  return (
    <View style={[cl.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cl.headRow}>
        {/* primary dim for icon bg */}
        <View style={[cl.headIcon, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="calculator-outline" size={IconSize.md} color={colors.primary} />
        </View>
        <View>
          <Text style={[cl.title, { color: colors.text }]}>Earning Calculator</Text>
          <Text style={[cl.sub, { color: colors.text2 }]}>Estimate your staking rewards</Text>
        </View>
      </View>

      {/* Product selector */}
      <View>
        <Text style={[cl.fieldLabel, { color: colors.text2 }]}>Product *</Text>
        <TouchableOpacity
          style={[cl.selector, { backgroundColor: colors.surface, borderColor: selProduct ? colors.primary : colors.border }]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.8}
        >
          {selProduct ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] + 2, flex: 1 }}>
              <LinearGradient colors={coinColors(selProduct.symbol)} style={cl.selCircle}>
                <Text style={cl.selCircleTxt}>{(selProduct.symbol ?? '?')[0]}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={[cl.selName, { color: colors.text }]} numberOfLines={1}>{selProduct.name}</Text>
                <Text style={[cl.selSub, { color: colors.text2 }]}>
                  {selProduct.symbol} · {selProduct.apy}% APY ·{' '}
                  {selProduct.type === 'fixed' ? `${selProduct.duration}D Fixed` : 'Flexible'}
                </Text>
              </View>
            </View>
          ) : (
            <Text style={[cl.selPlaceholder, { color: colors.text3 }]}>Select a Product</Text>
          )}
          <Ionicons name="chevron-down" size={IconSize.xs} color={colors.text3} />
        </TouchableOpacity>
      </View>

      {/* Amount + Days */}
      <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
        <View style={[cl.inputBox, { flex: 1, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[cl.inputLbl, { color: colors.text3 }]}>Amount</Text>
          <TextInput
            style={[cl.inputVal, { color: colors.text }, webReset]}
            placeholder="0.00"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={v => setAmount(v.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))}
            underlineColorAndroid="transparent"
          />
          {selProduct && <Text style={[cl.inputUnit, { color: colors.text3 }]}>{selProduct.symbol}</Text>}
        </View>

        <View style={[
          cl.inputBox,
          { flex: 1, backgroundColor: colors.surface, borderColor: colors.border },
          selProduct?.type === 'fixed' && { opacity: 0.6 },
        ]}>
          <Text style={[cl.inputLbl, { color: colors.text3 }]}>Days</Text>
          <TextInput
            style={[cl.inputVal, { color: colors.text }, webReset]}
            placeholder="30"
            placeholderTextColor={colors.text3}
            keyboardType="number-pad"
            value={selProduct?.type === 'fixed' ? String(selProduct.duration ?? 30) : days}
            onChangeText={setDays}
            editable={selProduct?.type !== 'fixed'}
            underlineColorAndroid="transparent"
          />
          {selProduct?.type === 'fixed' && (
            <Text style={[cl.inputUnit, { color: colors.primary }]}>fixed</Text>
          )}
        </View>
      </View>

      {/* Hints */}
      {selProduct?.type === 'flexible' && <Text style={[cl.hint, { color: colors.text3 }]}>Any duration</Text>}
      {selProduct?.type === 'fixed'    && <Text style={[cl.hint, { color: colors.primary }]}>✓ Duration locked: {selProduct.duration} days</Text>}
      {!selProduct                     && <Text style={[cl.hint, { color: colors.text3 }]}>Select a product first</Text>}

      {/* Toggle */}
      <View style={[cl.toggleRow, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
        <View style={{ flex: 1 }}>
          <Text style={[cl.toggleTitle, { color: colors.text }]}>Early withdrawal simulation</Text>
          <Text style={[cl.toggleSub, { color: colors.text3 }]}>see penalty-adjusted returns</Text>
        </View>
        <Switch
          value={earlyExit}
          onValueChange={handleToggleEarlyExit}
          trackColor={{ false: colors.border, true: colors.primaryBright }}
          thumbColor="#fff"
        />
      </View>

      {/* Calculate button — primary gradient */}
      <TouchableOpacity
        style={[cl.btn, (!selProduct || !amount || calculatorMutation.isPending) && { opacity: 0.5 }]}
        onPress={handleCalc}
        disabled={!selProduct || !amount || calculatorMutation.isPending}
        activeOpacity={0.85}
      >
        <LinearGradient colors={primaryGrad} style={cl.btnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          {calculatorMutation.isPending
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={cl.btnTxt}>Calculate Earning</Text>
          }
        </LinearGradient>
      </TouchableOpacity>

      {/* Result */}
      {result && selProduct && (
        <View style={[cl.resultBox, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder }]}>
          <View style={cl.resultHead}>
            <LinearGradient colors={coinColors(selProduct.symbol)} style={cl.resultHeadDot}>
              <Text style={cl.resultHeadDotTxt}>{(selProduct.symbol ?? '?')[0]}</Text>
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: Spacing[2] + 2 }}>
              <Text style={[cl.resultProdName, { color: colors.text }]}>{selProduct.name}</Text>
              <Text style={[cl.resultProdSub, { color: colors.text2 }]}>
                {selProduct.symbol} · {selProduct.type === 'fixed' ? `${selProduct.duration}D Fixed` : 'Flexible'}
              </Text>
            </View>
            <Text style={[cl.resultApy, { color: colors.greenBright }]}>{selProduct.apy}%</Text>
          </View>

          <View style={[cl.resultDivider, { backgroundColor: colors.primaryBorder }]} />

          {resultRows.map(r => (
            <View key={r.l} style={cl.resultRow}>
              <Text style={[cl.resultL, { color: colors.text2 }]}>{r.l}</Text>
              <Text style={[cl.resultV, { color: r.isRed ? colors.red : colors.greenBright }]}>{r.v}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Product Picker Modal */}
      <Modal visible={showPicker} transparent animationType={IS_WEB ? 'fade' : 'slide'}>
        <View style={IS_WEB ? cl.webPickerOverlay : cl.pickerOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowPicker(false)} activeOpacity={1} />
          <View style={[
            cl.pickerSheet, { backgroundColor: colors.card },
            IS_WEB && { borderRadius: Radius['2xl'], maxWidth: 440, width: '100%', borderWidth: 1, borderColor: colors.border },
          ]}>
            <View style={[cl.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[cl.pickerTitle, { color: colors.text }]}>Select Product</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {products.length === 0 ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
              ) : (
                products.map(p => {
                  const isSel      = selProduct?.id === p.id;
                  const isF        = p.type === 'fixed';
                  const ac         = isF ? colors.red : colors.primary;
                  const [pc1, pc2] = coinColors(p.symbol);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        cl.pickerRow,
                        { borderBottomColor: colors.borderSoft },
                        isSel && { backgroundColor: colors.primaryDim },
                      ]}
                      onPress={() => handleSelectProduct(p)}
                      activeOpacity={0.8}
                    >
                      <LinearGradient colors={[pc1, pc2]} style={cl.pickerDot}>
                        <Text style={cl.pickerDotTxt}>{(p.symbol ?? '?')[0]}</Text>
                      </LinearGradient>
                      <View style={{ flex: 1, marginLeft: Spacing[3] }}>
                        <Text style={{ fontSize: Typography.base, fontWeight: '700', color: colors.text }}>{p.name}</Text>
                        <Text style={{ fontSize: Typography.xs, color: colors.text2, marginTop: 1 }}>{p.symbol}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: 5 }}>
                          <Text style={{ fontSize: Typography.sm, color: colors.greenBright, fontWeight: '700' }}>{p.apy}% APY</Text>
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 3,
                            paddingHorizontal: Spacing[2], paddingVertical: 3,
                            borderRadius: Radius.full, borderWidth: 1,
                            borderColor: ac, backgroundColor: `${ac}18`,
                          }}>
                            <Ionicons name={isF ? 'lock-closed' : 'lock-open'} size={10} color={ac} />
                            <Text style={{ fontSize: Typography.xs, fontWeight: '700', color: ac }}>
                              {isF ? `${p.duration}D Fixed` : 'Flexible'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: Typography.xs, color: colors.text3 }}>
                            Min: {p.minAmount} {p.symbol}
                          </Text>
                        </View>
                      </View>
                      {isSel && <Ionicons name="checkmark-circle" size={IconSize.md} color={colors.primary} />}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const cl = StyleSheet.create({
  wrap:             { borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing[4] + 2, gap: Spacing[3] + 2 },
  headRow:          { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  headIcon:         { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  title:            { fontSize: Typography.md, fontWeight: '700' },
  sub:              { fontSize: Typography.xs, marginTop: 2 },
  fieldLabel:       { fontSize: Typography.sm, fontWeight: '600', marginBottom: Spacing[1] + 2 },
  selector:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[3] },
  selCircle:        { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  selCircleTxt:     { fontSize: Typography.base, fontWeight: '800', color: '#fff' },
  selName:          { fontSize: Typography.base, fontWeight: '700' },
  selSub:           { fontSize: Typography.xs, marginTop: 2 },
  selPlaceholder:   { fontSize: Typography.base, flex: 1 },
  inputBox:         { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[2] + 2 },
  inputLbl:         { fontSize: Typography.xs, marginBottom: 4 },
  inputVal:         { fontSize: Typography.lg, fontWeight: '700', padding: 0 },
  inputUnit:        { fontSize: Typography.xs, marginTop: 2 },
  hint:             { fontSize: Typography.xs, marginTop: -6 },
  toggleRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3] + 2 },
  toggleTitle:      { fontSize: Typography.sm, fontWeight: '600' },
  toggleSub:        { fontSize: Typography.xs, marginTop: 2 },
  btn:              { borderRadius: Radius.lg, overflow: 'hidden' },
  btnGrad:          { paddingVertical: Spacing[3] + 3, alignItems: 'center', justifyContent: 'center' },
  btnTxt:           { fontSize: Typography.base, fontWeight: '700', color: '#fff' },
  resultBox:        { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3] + 2, gap: Spacing[2] },
  resultHead:       { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  resultHeadDot:    { width: 36, height: 36, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  resultHeadDotTxt: { fontSize: Typography.base, fontWeight: '800', color: '#fff' },
  resultProdName:   { fontSize: Typography.base, fontWeight: '700' },
  resultProdSub:    { fontSize: Typography.xs, marginTop: 2 },
  resultApy:        { fontSize: Typography.xl, fontWeight: '800' },
  resultDivider:    { height: 1, marginVertical: 4 },
  resultRow:        { flexDirection: 'row', justifyContent: 'space-between' },
  resultL:          { fontSize: Typography.sm },
  resultV:          { fontSize: Typography.sm, fontWeight: '700' },
  pickerOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  webPickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: Spacing[6] },
  pickerSheet:      { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[5], paddingBottom: Spacing[10] },
  pickerHandle:     { width: 40, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing[4] },
  pickerTitle:      { fontSize: Typography.md, fontWeight: '700', marginBottom: Spacing[4] },
  pickerRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[4], paddingHorizontal: 4, borderBottomWidth: 1 },
  pickerDot:        { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  pickerDotTxt:     { fontSize: Typography.md, fontWeight: '800', color: '#fff' },
});

// ─── Position Card ────────────────────────────────────────────────────────────
function PositionCard({ p, colors, onRedeem }: { p: any; colors: any; onRedeem: (pos: any) => void }) {
  const prod        = p.productId;
  const isFixed     = prod?.type === 'FIXED';
  const primaryColor = isFixed ? colors.red : colors.primary;
  const [c1, c2]   = coinColors(p.asset);

  const statusColor = (status: string) => {
    if (status === 'ACTIVE')    return colors.greenBright;
    if (status === 'COMPLETED') return colors.orange;
    return colors.text3;
  };

  return (
    <View style={[pv.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[pv.primary, { backgroundColor: primaryColor }]} />
      <View style={{ flex: 1, padding: Spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <LinearGradient colors={[c1, c2]} style={pv.icon}>
            <Text style={pv.iconTxt}>{(p.asset ?? '?')[0]}</Text>
          </LinearGradient>
          <View style={{ flex: 1, marginLeft: Spacing[3] }}>
            <Text style={[pv.name, { color: colors.text }]}>{prod?.name ?? p.asset}</Text>
            <Text style={[pv.sub, { color: colors.text2 }]}>
              {p.asset} · {isFixed ? `${prod?.durationDays}D Fixed` : 'Flexible'} · {prod?.apy}% APY
            </Text>
          </View>
          <View style={[pv.statusBadge, { backgroundColor: `${statusColor(p.status)}18` }]}>
            <Text style={[pv.statusTxt, { color: statusColor(p.status) }]}>{p.status}</Text>
          </View>
        </View>

        <View style={[pv.divider, { backgroundColor: colors.borderSoft }]} />

        <View style={pv.statsRow}>
          {[
            { label: 'Staked', val: fmtNum(p.amount, 4),                 color: colors.text       },
            { label: 'Earned', val: fmtNum(p.liveEarned ?? p.earned, 8), color: colors.greenBright },
            { label: 'APY',    val: `${prod?.apy ?? 0}%`,                color: primaryColor        },
          ].map((stat, i, arr) => (
            <React.Fragment key={stat.label}>
              <View style={pv.stat}>
                <Text style={[pv.statVal, { color: stat.color }]}>{stat.val}</Text>
                <Text style={[pv.statLbl, { color: colors.text3 }]}>{stat.label}</Text>
              </View>
              {i < arr.length - 1 && <View style={[pv.sep, { backgroundColor: colors.borderSoft }]} />}
            </React.Fragment>
          ))}
        </View>

        <View style={[pv.datesRow, { borderTopColor: colors.borderSoft }]}>
          <Text style={[pv.dateText, { color: colors.text3 }]}>Started: {fmtDate(p.startAt)}</Text>
          {p.endAt && <Text style={[pv.dateText, { color: colors.text3 }]}>Ends: {fmtDate(p.endAt)}</Text>}
        </View>

        {p.status === 'ACTIVE' && (
          <TouchableOpacity
            style={[pv.redeemBtn, { borderColor: colors.red }]}
            onPress={() => onRedeem(p)}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-undo-outline" size={IconSize.xs} color={colors.red} />
            <Text style={[pv.redeemTxt, { color: colors.red }]}>Redeem</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const pv = StyleSheet.create({
  card:        { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  primary:      { width: 5 },
  icon:        { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  iconTxt:     { fontSize: Typography.md, fontWeight: '700', color: '#FFF' },
  name:        { fontSize: Typography.base, fontWeight: '700' },
  sub:         { fontSize: Typography.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: Spacing[2] + 2, paddingVertical: 4, borderRadius: Radius.full },
  statusTxt:   { fontSize: Typography.xs, fontWeight: '700' },
  divider:     { height: 1, marginVertical: Spacing[3] },
  statsRow:    { flexDirection: 'row', alignItems: 'center' },
  stat:        { flex: 1, alignItems: 'center' },
  statVal:     { fontSize: Typography.base, fontWeight: '700' },
  statLbl:     { fontSize: Typography.xs, marginTop: 2 },
  sep:         { width: 1, height: 32 },
  datesRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing[3], paddingTop: Spacing[2] + 2, borderTopWidth: 1 },
  dateText:    { fontSize: Typography.xs },
  redeemBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[1] + 2, marginTop: Spacing[2] + 2, paddingVertical: Spacing[2] + 2, borderRadius: Radius.md, borderWidth: 1.5 },
  redeemTxt:   { fontSize: Typography.sm, fontWeight: '700' },
  empty:       { alignItems: 'center', padding: Spacing[12], borderRadius: Radius['2xl'], borderWidth: 1, gap: Spacing[3] },
  emptyTitle:  { fontSize: Typography.md, fontWeight: '700' },
  emptySub:    { fontSize: Typography.sm, textAlign: 'center', lineHeight: Typography.lineHeightBase },
  emptyBtn:    { paddingHorizontal: Spacing[7], paddingVertical: Spacing[3] + 1, borderRadius: Radius.full, marginTop: 4 },
  emptyBtnTxt: { color: '#fff', fontWeight: '700', fontSize: Typography.base },
});

const lb = StyleSheet.create({
  card:      { flexDirection: 'row', alignItems: 'center', padding: Spacing[4], borderRadius: Radius.lg, borderWidth: 1, gap: Spacing[3] + 2, overflow: 'hidden' },
  rank:      { fontSize: Typography.xl, width: 40, textAlign: 'center' },
  email:     { fontSize: Typography.base, fontWeight: '600' },
  staked:    { fontSize: Typography.xs, marginTop: 2 },
  earned:    { fontSize: Typography.md, fontWeight: '700' },
  earnedLbl: { fontSize: Typography.xs, marginTop: 2 },
});

const hy = StyleSheet.create({
  card:       { flexDirection: 'row', alignItems: 'center', padding: Spacing[3] + 2, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing[3] },
  icon:       { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  type:       { fontSize: Typography.sm, fontWeight: '700' },
  prod:       { fontSize: Typography.xs, marginTop: 2 },
  date:       { fontSize: Typography.xs, marginTop: 3 },
  amt:        { fontSize: Typography.base, fontWeight: '700' },
  sym:        { fontSize: Typography.xs, marginTop: 2 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[3] + 2, borderRadius: Radius.lg, borderWidth: 1 },
  pgInfo:     { fontSize: Typography.sm },
  pgBtn:      { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

const hm = StyleSheet.create({
  heroCard:    { borderRadius: Radius['2xl'], borderWidth: 1, padding: Spacing[5] + 2 },
  heroLabel:   { fontSize: Typography.sm, fontWeight: '500', marginBottom: Spacing[1] + 2 },
  heroAmt:     { fontSize: Typography['3xl'], fontWeight: '800', letterSpacing: -1 },
  heroDivider: { height: 1, marginVertical: Spacing[4] },
  heroRow:     { flexDirection: 'row', alignItems: 'center', gap: Spacing[7] },
  heroStatLbl: { fontSize: Typography.xs, marginBottom: 4 },
  heroStatVal: { fontSize: Typography.md, fontWeight: '700' },
  heroStatSep: { width: 1, height: 36 },
  grid:        { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  statCard:    { width: '47%', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], alignItems: 'center', gap: Spacing[2] },
  statIcon:    { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  statLbl:     { fontSize: Typography.xs, fontWeight: '500' },
  statVal:     { fontSize: Typography.lg, fontWeight: '700' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle:{ fontSize: Typography.md, fontWeight: '700' },
  hotDot:      { width: 8, height: 8, borderRadius: 4 },
  viewAll:     { fontSize: Typography.sm, fontWeight: '600' },
  emptyBox:    { alignItems: 'center', padding: Spacing[8], borderRadius: Radius.lg, borderWidth: 1, gap: Spacing[2] + 2 },
  qaRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3] + 2, borderWidth: 1, gap: Spacing[3] + 2 },
  qaIcon:      { width: IconBox.sm, height: IconBox.sm, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  qaTitle:     { fontSize: Typography.base, fontWeight: '600' },
  qaSub:       { fontSize: Typography.xs, marginTop: 2 },
  cta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[5], borderRadius: Radius['2xl'], borderWidth: 1 },
  ctaTitle:    { fontSize: Typography.md, fontWeight: '800' },
  ctaSub:      { fontSize: Typography.xs, marginTop: 4, lineHeight: Typography.lineHeightBase },
  ctaBtn:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
});

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingBottom: Spacing[3], borderBottomWidth: 1 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontWeight: '700' },
  iconBtn:     { width: 38, height: 38, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
type ViewType = 'home' | 'products' | 'positions' | 'leaderboard' | 'history';

export default function EarnScreen() {
  const { colors, isDark } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const [view,         setView]         = useState<ViewType>('home');
  const [histPage,     setHistPage]     = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useEarnDashboard();
  const { data: allProducts = [], refetch: refetchProducts } = useEarnProducts();
  const { data: leaderboard = [] } = useEarnLeaderboard();
  const { data: historyData, isLoading: historyLoading } = useEarnHistory(histPage, 10);

  const positions = useMemo(() => (dashboard?.positions ?? []) as any[], [dashboard?.positions]);
  const activePositions = useMemo(
    () => positions.filter((p: any) => p.status === 'ACTIVE').length,
    [positions]
  );
  const hotProducts = useMemo(() => allProducts.slice(0, 3), [allProducts]);

  const history   = historyData?.data  ?? [];
  const histTotal = historyData?.total ?? 0;
  const loading   = dashboardLoading && view === 'home';

  const [subProduct, setSubProduct] = useState<EarnProduct | null>(null);
  const [redeemPos,  setRedeemPos]  = useState<EarnPosition | null>(null);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await Promise.all([refetchDashboard(), refetchProducts()]); }
    catch (err) { console.error('Refresh error:', err); }
    finally { setIsRefreshing(false); }
  }, [refetchDashboard, refetchProducts]);

  const handleSubscribeSuccess = useCallback(() => { setSubProduct(null); handleRefresh(); }, [handleRefresh]);
  const handleRedeemSuccess    = useCallback(() => { setRedeemPos(null);  handleRefresh(); }, [handleRefresh]);
  const handleCloseSubscribe   = useCallback(() => setSubProduct(null), []);
  const handleCloseRedeem      = useCallback(() => setRedeemPos(null),  []);
  const handleSetRedeemPos     = useCallback((p: any) => setRedeemPos(p), []);

  const goProducts  = useCallback(() => setView('products'),    []);
  const goPositions = useCallback(() => setView('positions'),   []);
  const goLeader    = useCallback(() => setView('leaderboard'), []);
  const goHistory   = useCallback(() => setView('history'),     []);

  // ── Positions ──────────────────────────────────────────────────────────────
  const renderPositions = useCallback(() => {
    if (positions.length === 0) {
      return (
        <View style={{ flex: 1, padding: Spacing[4] }}>
          <View style={[pv.empty, { backgroundColor: colors.card, borderColor: colors.borderSoft }]}>
            <Ionicons name="layers-outline" size={56} color={colors.text3} />
            <Text style={[pv.emptyTitle, { color: colors.text }]}>No Positions Yet</Text>
            <Text style={[pv.emptySub, { color: colors.text2 }]}>
              Subscribe to an earn product to start growing your assets
            </Text>
            <TouchableOpacity
              style={[pv.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={goProducts}
              activeOpacity={0.85}
            >
              <Text style={pv.emptyBtnTxt}>Browse Products</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[3], paddingBottom: insets.bottom + 80 }}
      >
        {positions.map((p: any) => (
          <PositionCard key={p._id} p={p} colors={colors} onRedeem={handleSetRedeemPos} />
        ))}
      </ScrollView>
    );
  }, [positions, colors, insets.bottom, goProducts, handleSetRedeemPos]);

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const renderLeaderboard = useCallback(() => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: Spacing[4], gap: Spacing[2] + 2, paddingBottom: insets.bottom + 80 }}
    >
      {leaderboard.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing[3] }}>
          <Ionicons name="trophy-outline" size={56} color={colors.text3} />
          <Text style={{ fontSize: Typography.md, color: colors.text2, fontWeight: '600' }}>No leaderboard data</Text>
        </View>
      ) : (
        (leaderboard as any[]).map((item: any, i: number) => {
          const rankNum = item.rank ?? i + 1;
          const medals  = ['🥇', '🥈', '🥉'];
          const isTop   = rankNum <= 3;
          return (
            <View
              key={item._id}
              style={[lb.card, {
                backgroundColor: colors.card,
                borderColor: isTop ? colors.primaryBorder : colors.border,
              }]}
            >
              {isTop && (
                <LinearGradient
                  colors={[colors.primaryDim, `${colors.primary}06`]}
                  style={StyleSheet.absoluteFillObject}
                />
              )}
              <Text style={lb.rank}>{isTop ? medals[rankNum - 1] : `#${rankNum}`}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[lb.email, { color: colors.text }]} numberOfLines={1}>{item.userId?.email}</Text>
                <Text style={[lb.staked, { color: colors.text2 }]}>Staked: {fmtNum(item.totalStaked)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                {/* Earned = greenBright for positive number */}
                <Text style={[lb.earned, { color: colors.greenBright }]}>{fmtNum(item.totalEarned)}</Text>
                <Text style={[lb.earnedLbl, { color: colors.text3 }]}>Earned</Text>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  ), [leaderboard, colors, insets.bottom]);

  // ── History ────────────────────────────────────────────────────────────────
  const renderHistory = useCallback(() => {
    const totalPages = Math.max(1, Math.ceil(histTotal / 10));
    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[2] + 2, paddingBottom: insets.bottom + 80 }}
      >
        {historyLoading ? (
          [1, 2, 3].map(i => <SkeletonBox key={i} h={66} r={Radius.lg} />)
        ) : history.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, gap: Spacing[3] }}>
            <Ionicons name="receipt-outline" size={56} color={colors.text3} />
            <Text style={{ fontSize: Typography.md, color: colors.text2, fontWeight: '600' }}>No reward history yet</Text>
          </View>
        ) : (
          (history as any[]).map((item: any) => {
            const meta  = TYPE_META[item.type] ?? { label: item.type, icon: 'flash-outline', colorKey: 'primary' };
            const color = (colors as any)[meta.colorKey] ?? colors.primary;
            return (
              <View key={item._id} style={[hy.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[hy.icon, { backgroundColor: `${color}18` }]}>
                  <Ionicons name={meta.icon as any} size={IconSize.md} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[hy.type, { color }]}>{meta.label}</Text>
                  <Text style={[hy.prod, { color: colors.text2 }]} numberOfLines={1}>
                    {item.positionId?.productId?.name ?? 'Earn Position'}
                  </Text>
                  <Text style={[hy.date, { color: colors.text3 }]}>{fmtDate(item.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[hy.amt, { color }]}>
                    {item.type === 'PENALTY' || item.type === 'REDEEM' ? '' : '+'}
                    {fmtNum(item.amount, 6)}
                  </Text>
                  <Text style={[hy.sym, { color: colors.text3 }]}>{item.asset?.symbol}</Text>
                </View>
              </View>
            );
          })
        )}

        {histTotal > 10 && (
          <View style={[hy.pagination, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[hy.pgInfo, { color: colors.text2 }]}>
              Page <Text style={{ color: colors.primary }}>{histPage}/{totalPages}</Text>
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing[2] }}>
              <TouchableOpacity
                style={[hy.pgBtn, { borderColor: colors.border, backgroundColor: colors.surface }, histPage <= 1 && { opacity: 0.35 }]}
                onPress={() => { if (histPage > 1) setHistPage(p => p - 1); }}
                disabled={histPage <= 1}
              >
                <Ionicons name="chevron-back" size={IconSize.sm} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[hy.pgBtn, { borderColor: colors.border, backgroundColor: colors.surface }, histPage >= totalPages && { opacity: 0.35 }]}
                onPress={() => { if (histPage < totalPages) setHistPage(p => p + 1); }}
                disabled={histPage >= totalPages}
              >
                <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.primary} />
              </TouchableOpacity>
            </View>
            <Text style={[hy.pgInfo, { color: colors.text2 }]}>
              <Text style={{ color: colors.primary }}>{histTotal}</Text> total
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }, [history, histTotal, histPage, historyLoading, colors, insets.bottom]);

  // ── Home ───────────────────────────────────────────────────────────────────
  const renderHome = useCallback(() => {
    const primaryGrad = getPrimaryGradient(isDark);

    const STAT_ITEMS = [
      { icon: 'bar-chart-outline', label: 'Rank',      val: dashboard?.rank ? `#${dashboard.rank}` : '#—', col: colors.orange,  onPress: goLeader    },
      { icon: 'gift-outline',      label: 'Rewards',   val: 'Track',                                        col: colors.primary,  onPress: goHistory   },
      { icon: 'cube-outline',      label: 'Products',  val: String(hotProducts.length || '—'),               col: colors.primary, onPress: goProducts  },
      { icon: 'locate-outline',    label: 'Positions', val: String(activePositions),                         col: colors.purple,  onPress: goPositions },
    ];

    const QA_ITEMS = [
      { icon: 'compass-outline', title: 'Explore Products', sub: 'Find new earning opportunities', onPress: goProducts  },
      { icon: 'layers-outline',  title: 'My Positions',     sub: 'Manage your investment',         onPress: goPositions },
      { icon: 'trophy-outline',  title: 'Leaderboard',      sub: 'Compete with top earners',       onPress: goLeader    },
      { icon: 'receipt-outline', title: 'Rewards History',  sub: 'View all transactions',          onPress: goHistory   },
    ];

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={{ padding: Spacing[4], gap: Spacing[4], paddingBottom: insets.bottom + 100 }}
      >
        {/* Hero Card — primary gradient */}
        <LinearGradient
          colors={primaryGrad}
          style={[hm.heroCard, { borderColor: colors.primaryBorder }]}
        >
          <Text style={[hm.heroLabel, { color: 'rgba(255,255,255,0.65)' }]}>Total Staked</Text>
          <Text style={[hm.heroAmt, { color: '#FFFFFF' }]}>
            {fmtUsd(dashboard?.totalStaked ?? 0)}
          </Text>
          <View style={[hm.heroDivider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
          <View style={hm.heroRow}>
            <View>
              <Text style={[hm.heroStatLbl, { color: 'rgba(255,255,255,0.65)' }]}>Total Earned</Text>
              <Text style={[hm.heroStatVal, { color: colors.greenBright }]}>
                {fmtUsd(dashboard?.totalEarned ?? 0)}
              </Text>
            </View>
            <View style={[hm.heroStatSep, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View>
              <Text style={[hm.heroStatLbl, { color: 'rgba(255,255,255,0.65)' }]}>Active</Text>
              <Text style={[hm.heroStatVal, { color: '#FFFFFF' }]}>{activePositions}</Text>
            </View>
            <View style={[hm.heroStatSep, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View>
              <Text style={[hm.heroStatLbl, { color: 'rgba(255,255,255,0.65)' }]}>Rank</Text>
              <Text style={[hm.heroStatVal, { color: colors.orange }]}>
                {dashboard?.rank ? `#${dashboard.rank}` : '—'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats Grid */}
        <View style={hm.grid}>
          {STAT_ITEMS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={[hm.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <View style={[hm.statIcon, { backgroundColor: `${item.col}18` }]}>
                <Ionicons name={item.icon as any} size={IconSize.md} color={item.col} />
              </View>
              <Text style={[hm.statLbl, { color: colors.text2 }]}>{item.label}</Text>
              <Text style={[hm.statVal, { color: colors.text }]}>{item.val}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hot Products */}
        <View style={hm.sectionHead}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing[2] }}>
            <View style={[hm.hotDot, { backgroundColor: colors.red }]} />
            <Text style={[hm.sectionTitle, { color: colors.text }]}>Hot Products</Text>
          </View>
          <TouchableOpacity onPress={goProducts} activeOpacity={0.7}>
            <Text style={[hm.viewAll, { color: colors.primary }]}>View all</Text>
          </TouchableOpacity>
        </View>

        {hotProducts.length === 0 ? (
          <View style={[hm.emptyBox, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
            <Ionicons name="cube-outline" size={36} color={colors.text3} />
            <Text style={{ fontSize: Typography.sm, color: colors.text2 }}>No products available</Text>
          </View>
        ) : (
          <View style={{ gap: Spacing[3] }}>
            {hotProducts.map(p => (
              <ProductCard key={p.id} product={p} onSubscribe={setSubProduct} colors={colors} isDark={isDark} />
            ))}
          </View>
        )}

        {/* Calculator */}
        <EarnCalculator colors={colors} isDark={isDark} />

        {/* Quick Actions */}
        <Text style={[hm.sectionTitle, { color: colors.text }]}>Quick Actions</Text>

        {QA_ITEMS.map((qa, i, arr) => (
          <TouchableOpacity
            key={qa.title}
            style={[
              hm.qaRow,
              { backgroundColor: colors.card, borderColor: colors.border },
              i === 0              && { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl },
              i === arr.length - 1 && { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
              i > 0 && { borderTopWidth: 0 },
            ]}
            onPress={qa.onPress}
            activeOpacity={0.8}
          >
            <View style={[hm.qaIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name={qa.icon as any} size={IconSize.md} color={colors.primaryBright} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[hm.qaTitle, { color: colors.text }]}>{qa.title}</Text>
              <Text style={[hm.qaSub, { color: colors.text2 }]}>{qa.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={IconSize.sm} color={colors.text3} />
          </TouchableOpacity>
        ))}

        {/* CTA Banner */}
        <LinearGradient
          colors={primaryGrad}
          style={[hm.cta, { borderColor: colors.primaryBorder }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[hm.ctaTitle, { color: '#FFFFFF' }]}>Ready to earn?</Text>
            <Text style={[hm.ctaSub, { color: 'rgba(255,255,255,0.70)' }]}>
              Start with our most popular products today
            </Text>
          </View>
          <TouchableOpacity
            style={[hm.ctaBtn, { backgroundColor: 'rgba(255,255,255,0.20)' }]}
            onPress={goProducts}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-forward" size={IconSize.md} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    );
  }, [
    isDark, colors, dashboard, activePositions, hotProducts,
    insets.bottom, isRefreshing, handleRefresh,
    goProducts, goPositions, goLeader, goHistory,
  ]);

  const titles: Record<ViewType, string> = {
    home: 'Earn', products: 'Earn',
    positions: 'My Positions', leaderboard: 'Leaderboard', history: 'Rewards History',
  };

  const handleHeaderBack = useCallback(() => {
    if (view !== 'home') setView('home');
    else router.back();
  }, [view, router]);

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={handleHeaderBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>{titles[view]}</Text>
        <View style={s.iconBtn} />
      </View>

      {loading && view === 'home' ? (
        <HomeSkeleton />
      ) : view === 'home' ? (
        renderHome()
      ) : view === 'products' ? (
        <AllProductsScreen onSubscribe={setSubProduct} colors={colors} isDark={isDark} />
      ) : view === 'positions' ? (
        renderPositions()
      ) : view === 'leaderboard' ? (
        renderLeaderboard()
      ) : view === 'history' ? (
        renderHistory()
      ) : null}

      <SubscribeModal
        visible={!!subProduct}
        product={subProduct}
        onClose={handleCloseSubscribe}
        onSuccess={handleSubscribeSuccess}
        colors={colors}
        isDark={isDark}
      />

      <RedeemModal
        visible={!!redeemPos}
        position={redeemPos}
        onClose={handleCloseRedeem}
        onSuccess={handleRedeemSuccess}
        colors={colors}
        isDark={isDark}
      />
    </View>
  );
}