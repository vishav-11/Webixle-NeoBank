// app/conversion/success.tsx
import React, {
  useEffect, useRef, useState, useCallback,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, Image, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useMoonPayTransactionStatus } from '@/hooks/queires';
import { useTabCloser } from '@/hooks/useTabCloser';
import type {
  MoonPayTransactionListItem,
  MoonPayData,
  MoonPayStage,
} from '@/services/moonpayService';

const { width: SCREEN_W } = Dimensions.get('window');

// ─── Constants ─────────────────────────────────────────────────────────────────
const TERMINAL_STATUSES  = ['COMPLETED', 'FAILED', 'CANCELLED'] as const;
const HASH_MIN_LEN       = 20;
const HASH_PREFIX        = 10;
const HASH_SUFFIX        = 10;
const ADDR_MIN_LEN       = 12;
const ADDR_PREFIX        = 6;
const ADDR_SUFFIX        = 4;

type TerminalStatus = typeof TERMINAL_STATUSES[number];

function isTerminalStatus(s: string): s is TerminalStatus {
  return TERMINAL_STATUSES.includes(s.toUpperCase() as TerminalStatus);
}

// ─── Platform Detection ────────────────────────────────────────────────────────
// True when running inside the native app (iOS/Android), false in a web browser.
const IS_NATIVE         = Platform.OS !== 'web';
const IS_WEB_IN_BROWSER = Platform.OS === 'web';

// ─── Status Config ─────────────────────────────────────────────────────────────
interface StatusConfig {
  color:     string;
  icon:      string;
  title:     string;
  subtitle:  string;
  isPending: boolean;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  COMPLETED: {
    color:     '#10B981',
    icon:      'checkmark-circle',
    title:     'Transaction Successful! 🎉',
    subtitle:  'Your crypto purchase was completed successfully.',
    isPending: false,
  },
  PENDING: {
    color:     '#F59E0B',
    icon:      'time-outline',
    title:     'Transaction Pending',
    subtitle:  'Your transaction is being processed.',
    isPending: true,
  },
  PROCESSING: {
    color:     '#3B82F6',
    icon:      'sync-outline',
    title:     'Processing...',
    subtitle:  'MoonPay is processing your transaction.',
    isPending: true,
  },
  FAILED: {
    color:     '#EF4444',
    icon:      'close-circle',
    title:     'Transaction Failed',
    subtitle:  'Something went wrong. Please try again.',
    isPending: false,
  },
  CANCELLED: {
    color:     '#6B7280',
    icon:      'ban-outline',
    title:     'Cancelled',
    subtitle:  'This transaction was cancelled.',
    isPending: false,
  },
  WAITINGPAYMENT: {
    color:     '#8B5CF6',
    icon:      'wallet-outline',
    title:     'Waiting for Payment',
    subtitle:  'Please complete your payment.',
    isPending: true,
  },
  WAITINGAUTHORIZATION: {
    color:     '#F59E0B',
    icon:      'shield-outline',
    title:     'Awaiting Authorization',
    subtitle:  'Authorization required to proceed.',
    isPending: true,
  },
};

function getStatusConfig(status: string): StatusConfig {
  const key = (status ?? 'PENDING').toUpperCase();
  return STATUS_CONFIG[key] ?? STATUS_CONFIG['PENDING'];
}

// ─── Stage Labels ──────────────────────────────────────────────────────────────
const STAGE_LABELS: Record<string, string> = {
  stage_one_ordering:     'Order Placed',
  stage_two_verification: 'Verification',
  stage_three_processing: 'Payment Processing',
  stage_four_delivery:    'Crypto Delivery',
};

// ─── Payment Method Labels ─────────────────────────────────────────────────────
interface PaymentInfo { label: string; icon: string }

const PAYMENT_INFO: Record<string, PaymentInfo> = {
  apple_pay:          { label: 'Apple Pay',     icon: 'logo-apple'    },
  google_pay:         { label: 'Google Pay',    icon: 'logo-google'   },
  credit_debit_card:  { label: 'Card',          icon: 'card-outline'  },
  sepa_bank_transfer: { label: 'Bank Transfer', icon: 'business-outline' },
  bank_transfer:      { label: 'Bank Transfer', icon: 'business-outline' },
};

function getPaymentInfo(method: string): PaymentInfo {
  return (
    PAYMENT_INFO[method?.toLowerCase() ?? ''] ??
    { label: method ?? 'Card', icon: 'card-outline' }
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function safeFloat(val: string | number | undefined | null, fallback = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  const n = parseFloat(val ?? '');
  return isNaN(n) ? fallback : n;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      month:  'short',
      day:    'numeric',
      year:   'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr ?? '';
  }
}

function shortenHash(hash: string): string {
  if (!hash || hash.length <= HASH_MIN_LEN) return hash ?? '';
  return `${hash.slice(0, HASH_PREFIX)}...${hash.slice(-HASH_SUFFIX)}`;
}

function shortenAddress(addr: string): string {
  if (!addr || addr.length <= ADDR_MIN_LEN) return addr ?? '';
  return `${addr.slice(0, ADDR_PREFIX)}...${addr.slice(-ADDR_SUFFIX)}`;
}

// ─── Skeleton Loader ───────────────────────────────────────────────────────────
// Shimmer placeholder shown while transaction data is loading.
function SkeletonBox({
  width, height, borderRadius = 8, colors,
}: {
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  colors: any;
}) {
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
    <View
      style={{
        width,
        height,
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: colors.border,
            opacity,
          },
        ]}
      />
    </View>
  );
}

// ─── Hero Skeleton ─────────────────────────────────────────────────────────────
function HeroSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[sk.hero]}>
      <SkeletonBox width={110} height={110} borderRadius={55} colors={colors} />
      <View style={{ height: 16 }} />
      <SkeletonBox width={220} height={24} borderRadius={8} colors={colors} />
      <View style={{ height: 8 }} />
      <SkeletonBox width={180} height={16} borderRadius={6} colors={colors} />
      <View style={{ height: 16 }} />
      <SkeletonBox width={SCREEN_W - Spacing[4] * 2} height={130} borderRadius={20} colors={colors} />
    </View>
  );
}

// ─── Card Skeleton ─────────────────────────────────────────────────────────────
function CardSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[sk.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sk.row}>
        <SkeletonBox width={16} height={16} borderRadius={4} colors={colors} />
        <View style={{ width: 8 }} />
        <SkeletonBox width={140} height={14} borderRadius={4} colors={colors} />
      </View>
      <View style={{ height: 14 }} />
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={[sk.row, { paddingVertical: 10 }]}>
          <SkeletonBox width={80} height={12} borderRadius={4} colors={colors} />
          <SkeletonBox width={120} height={12} borderRadius={4} colors={colors} />
        </View>
      ))}
    </View>
  );
}

const sk = StyleSheet.create({
  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20 },
  card: {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: Spacing[3],
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});

// ─── InfoRow ───────────────────────────────────────────────────────────────────
interface InfoRowProps {
  label:       string;
  value:       string | React.ReactNode;
  valueColor?: string;
  colors:      any;
  mono?:       boolean;
  last?:       boolean;
}

function InfoRow({ label, value, valueColor, colors, mono = false, last = false }: InfoRowProps) {
  return (
    <View style={[
      ir.row,
      !last && {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.12)',
      },
    ]}>
      <Text style={[ir.label, { color: colors.text3 }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text
          style={[
            ir.value,
            { color: valueColor ?? colors.text },
            mono && {
              fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
              fontSize:   11,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
      ) : value}
    </View>
  );
}

const ir = StyleSheet.create({
  row:   {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: 11,
  },
  label: { fontSize: Typography.xs, fontWeight: '600' },
  value: {
    fontSize:   Typography.sm,
    fontWeight: '700',
    maxWidth:   '65%',
    textAlign:  'right',
  },
});

// ─── StageProgress ─────────────────────────────────────────────────────────────
interface StageProgressProps {
  stages: MoonPayStage[];
  color:  string;
  colors: any;
}

function StageProgress({ stages, color, colors }: StageProgressProps) {
  if (!stages?.length) return null;
  return (
    <View style={spp.wrap}>
      {stages.map((stage, idx) => {
        const isSuccess = stage.status === 'success';
        const isFailed  = stage.status === 'failed';
        const isLast    = idx === stages.length - 1;
        const dotColor  = isSuccess ? color : isFailed ? '#EF4444' : colors.text3;
        const label     = STAGE_LABELS[stage.stage] ?? stage.stage;

        return (
          <View key={stage.stage} style={spp.row}>
            <View style={spp.leftCol}>
              <View style={[
                spp.dot,
                {
                  backgroundColor:
                    isSuccess ? color :
                    isFailed  ? '#EF4444' :
                    colors.surface,
                  borderColor:
                    isSuccess ? color :
                    isFailed  ? '#EF4444' :
                    colors.border,
                },
              ]}>
                {isSuccess ? (
                  <Ionicons name="checkmark" size={11} color="#fff" />
                ) : isFailed ? (
                  <Ionicons name="close" size={11} color="#fff" />
                ) : (
                  <View style={[spp.dotInner, { backgroundColor: colors.text3 }]} />
                )}
              </View>
              {!isLast && (
                <View style={[spp.line, { backgroundColor: isSuccess ? `${color}50` : colors.border }]} />
              )}
            </View>
            <View style={spp.rightCol}>
              <Text style={[spp.label, { color: dotColor }]}>{label}</Text>
              {stage.failureReason ? (
                <Text style={spp.failReason}>{stage.failureReason}</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const spp = StyleSheet.create({
  wrap:       { paddingVertical: 4 },
  row:        { flexDirection: 'row', alignItems: 'flex-start' },
  leftCol:    { alignItems: 'center', width: 28 },
  dot:        {
    width:          22,
    height:         22,
    borderRadius:   11,
    borderWidth:    2,
    alignItems:     'center',
    justifyContent: 'center',
  },
  dotInner:   { width: 6, height: 6, borderRadius: 3 },
  line:       { width: 2, height: 24, marginTop: 2 },
  rightCol:   {
    flex:          1,
    paddingBottom: 20,
    paddingLeft:   10,
    justifyContent:'center',
    marginTop:     1,
  },
  label:      { fontSize: Typography.sm, fontWeight: '600' },
  failReason: { fontSize: Typography.xs, color: '#EF4444', marginTop: 2 },
});

// ─── Web Mobile Banner ─────────────────────────────────────────────────────────
// Shown only when accessed via a web browser (instead of the native app),
// prompting the user to continue in-app for a better experience.
interface WebMobileBannerProps {
  transactionId:      string;
  baseCurrencyCode:   string;
  baseCurrencyAmount: string;
  transactionStatus:  string;
  colors:             any;
  config:             StatusConfig;
  manualCloseHint:    boolean;
  onCloseTab:         () => void;
}

function WebMobileBanner({
  transactionId,
  baseCurrencyCode,
  baseCurrencyAmount,
  transactionStatus,
  colors,
  config,
  manualCloseHint,
  onCloseTab,
}: WebMobileBannerProps) {
  // App deep link scheme — update to match your app's registered scheme.
  const deepLink = `yourapp://conversion/return`;

  const handleOpenApp = useCallback(() => {
    if (IS_NATIVE) return;
    if (typeof window !== 'undefined') {
      window.location.href = deepLink;
    }
  }, [deepLink]);

  // Only relevant in a web browser context.
  if (!IS_WEB_IN_BROWSER) return null;

  return (
    <View style={[wmb.wrap, { backgroundColor: `${config.color}10`, borderColor: `${config.color}30` }]}>
      <View style={wmb.iconRow}>
        <Ionicons name="phone-portrait-outline" size={20} color={config.color} />
        <Text style={[wmb.title, { color: colors.text }]}>
          Opened in Browser?
        </Text>
      </View>
      <Text style={[wmb.desc, { color: colors.text2 }]}>
        You're viewing this in your browser. Open it in the app for the best experience.
      </Text>
      <View style={wmb.btnRow}>
        <TouchableOpacity
          style={[wmb.btnApp, { backgroundColor: config.color }]}
          onPress={handleOpenApp}
          activeOpacity={0.85}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
          <Text style={wmb.btnAppTxt}>Open in App</Text>
        </TouchableOpacity>

        {manualCloseHint ? (
          <View style={[wmb.btnClose, { borderColor: colors.border, opacity: 0.7 }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.text2} />
            <Text style={[wmb.btnCloseTxt, { color: colors.text2 }]}>Close manually</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[wmb.btnClose, { borderColor: colors.border }]}
            onPress={onCloseTab}
            activeOpacity={0.8}
          >
            <Ionicons name="close-outline" size={14} color={colors.text2} />
            <Text style={[wmb.btnCloseTxt, { color: colors.text2 }]}>Close Tab</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const wmb = StyleSheet.create({
  wrap:       {
    borderWidth:  1,
    borderRadius: Radius['2xl'],
    padding:      Spacing[4],
    marginBottom: Spacing[3],
  },
  iconRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  title:      { fontSize: Typography.sm, fontWeight: '700' },
  desc:       { fontSize: Typography.xs, lineHeight: 18, marginBottom: 12 },
  btnRow:     { flexDirection: 'row', gap: 10 },
  btnApp:     {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical: 10,
    borderRadius:   Radius.xl,
  },
  btnAppTxt:  { color: '#fff', fontSize: Typography.xs, fontWeight: '700' },
  btnClose:   {
    flex:           1,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            6,
    paddingVertical: 10,
    borderRadius:   Radius.xl,
    borderWidth:    1,
  },
  btnCloseTxt:{ fontSize: Typography.xs, fontWeight: '600' },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ConversionSuccessScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const qc         = useQueryClient();

  // ── URL Params ─────────────────────────────────────────────────────────────
  const params = useLocalSearchParams<{
    transactionId:      string;
    baseCurrencyCode:   string;
    baseCurrencyAmount: string;
    transactionStatus:  string;
  }>();

  const {
    transactionId,
    baseCurrencyCode,
    baseCurrencyAmount,
    transactionStatus,
  } = params;

  // ── Tab closing (web only) ────────────────────────────────────────────────
  const { hasOpener, manualCloseHint, attemptClose } = useTabCloser();

  // ── Live Status ────────────────────────────────────────────────────────────
  const [liveStatus, setLiveStatus] = useState<string>(
    (transactionStatus ?? 'PENDING').toUpperCase()
  );

  // ── Polling ────────────────────────────────────────────────────────────────
  const shouldPoll = !!transactionId && !isTerminalStatus(liveStatus);

  const {
    data:       rawTx,
    isFetching: txFetching,
    isLoading:  txLoading,
    refetch,
  } = useMoonPayTransactionStatus(transactionId ?? null, shouldPoll);

  // ── Normalize ──────────────────────────────────────────────────────────────
  const tx = rawTx as MoonPayTransactionListItem | undefined;
  const md = tx?.moonpayData as MoonPayData | undefined;

  useEffect(() => {
    if (tx?.status) setLiveStatus(tx.status.toUpperCase());
  }, [tx?.status]);

  const currentStatus = liveStatus;
  const config        = getStatusConfig(currentStatus);
  const isBuy         = (tx?.type ?? 'buy') === 'buy';

  // ── Amounts ────────────────────────────────────────────────────────────────
  const paidAmount   = safeFloat(md?.baseCurrencyAmount   ?? baseCurrencyAmount);
  const cryptoAmount = safeFloat(md?.quoteCurrencyAmount  ?? tx?.cryptoAmount);
  const feeAmount    = safeFloat(md?.feeAmount);
  const networkFee   = safeFloat(md?.networkFeeAmount);
  const totalFee     = feeAmount + networkFee;
  const subtotal     = Math.max(0, paidAmount - totalFee);

  const cryptoCode  = tx?.currencyCode                    ?? '';
  const fiatCode    = tx?.baseCurrencyCode                ?? (baseCurrencyCode?.toUpperCase() ?? 'USD');
  const cryptoIcon  = md?.currency?.icon                  ?? '';
  const txHash      = md?.cryptoTransactionId             ?? null;
  const stages      = md?.stages                          ?? [];
  const networkCode = md?.currency?.metadata?.networkCode ?? '';
  const paymentInfo = getPaymentInfo(md?.paymentMethod    ?? '');

  // ── Notify opener + auto-close (only works for script-opened tabs) ─────────
  const postParams = useRef({
    transactionId, baseCurrencyCode, baseCurrencyAmount, transactionStatus,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || !hasOpener || typeof window === 'undefined') return;
    try {
      window.opener.postMessage(
        { type: 'MOONPAY_COMPLETE', params: postParams.current },
        window.location.origin
      );
    } catch (err) {
      console.error('[Success] postMessage error:', err);
      return;
    }
    const timer = setTimeout(() => attemptClose(), 1500);
    return () => clearTimeout(timer);
  }, [hasOpener, attemptClose]);

  // ── Wallet Invalidate ──────────────────────────────────────────────────────
  useEffect(() => {
    if (currentStatus === 'COMPLETED') {
      qc.invalidateQueries({ queryKey: ['wallet'] });
      qc.invalidateQueries({ queryKey: ['moonpay', 'transactions'] });
    }
  }, [currentStatus, qc]);

  // ── Animations ─────────────────────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const hasData = !!tx || !transactionId;

  useEffect(() => {
    if (!hasData) return;
    const entry = Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 50, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 60, friction: 8, useNativeDriver: true,
      }),
    ]);
    entry.start();
    return () => entry.stop();
  }, [hasData, fadeAnim, scaleAnim, slideAnim]);

  useEffect(() => {
    if (!config.isPending) { pulseAnim.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [config.isPending, pulseAnim]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => refetch(), [refetch]);
  const goToWallet    = useCallback(() => router.replace('/(app)'),                        [router]);
  const goToBuy       = useCallback(() => router.replace('/(screens)/Buy/BuyMain' as any), [router]);

  // ── Loading State ──────────────────────────────────────────────────────────
  const showSkeleton = !!transactionId && txLoading && !tx;

  if (showSkeleton) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.header, {
          paddingTop:        insets.top + 8,
          borderBottomColor: colors.border,
          backgroundColor:   colors.bg,
        }]}>
          <View style={[s.closeBtn, { backgroundColor: colors.surface }]}>
            <Ionicons name="close" size={18} color={colors.text} />
          </View>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            Transaction Details
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]}
        >
          <HeroSkeleton colors={colors} />
          <CardSkeleton colors={colors} />
          <CardSkeleton colors={colors} />
        </ScrollView>

        <View style={[s.loadingBar, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="small" color={colors.blue ?? '#10B981'} />
          <Text style={[s.loadingTxt, { color: colors.text2 }]}>
            Loading transaction...
          </Text>
        </View>
      </View>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View style={[s.header, {
        paddingTop:        insets.top + 8,
        borderBottomColor: colors.border,
        backgroundColor:   colors.bg,
      }]}>
        <TouchableOpacity
          style={[s.closeBtn, { backgroundColor: colors.surface }]}
          onPress={IS_NATIVE ? goToWallet : attemptClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={IS_NATIVE ? 'arrow-back' : 'close'}
            size={18}
            color={colors.text}
          />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>
          Transaction Details
        </Text>

        {config.isPending ? (
          <TouchableOpacity
            style={[s.refreshBtn, { backgroundColor: colors.surface }]}
            onPress={handleRefresh}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {txFetching ? (
              <ActivityIndicator size="small" color={config.color} />
            ) : (
              <Ionicons name="refresh" size={16} color={config.color} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.scroll, { paddingBottom: 120 + insets.bottom }]}
      >

        {/* ── Web Mobile Banner ── */}
        {IS_WEB_IN_BROWSER && (
          <View style={{ paddingTop: Spacing[3] }}>
            <WebMobileBanner
              transactionId={transactionId ?? ''}
              baseCurrencyCode={baseCurrencyCode ?? ''}
              baseCurrencyAmount={baseCurrencyAmount ?? ''}
              transactionStatus={transactionStatus ?? ''}
              colors={colors}
              config={config}
              manualCloseHint={manualCloseHint}
              onCloseTab={attemptClose}
            />
          </View>
        )}

        {/* ── Hero ── */}
        <Animated.View style={[s.hero, { opacity: fadeAnim }]}>

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Animated.View style={[
              s.iconOuter,
              {
                backgroundColor: `${config.color}12`,
                transform:       [{ scale: pulseAnim }],
              },
            ]}>
              <View style={[s.iconInner, { backgroundColor: `${config.color}22` }]}>
                <Ionicons name={config.icon as any} size={48} color={config.color} />
              </View>
            </Animated.View>
          </Animated.View>

          <Text style={[s.heroTitle, { color: colors.text }]}>{config.title}</Text>
          <Text style={[s.heroSub, { color: colors.text2 }]}>{config.subtitle}</Text>

          {cryptoAmount > 0 && (
            <Animated.View style={[
              s.amountBox,
              {
                backgroundColor: `${config.color}10`,
                borderColor:     `${config.color}30`,
                opacity:         fadeAnim,
                transform:       [{ translateY: slideAnim }],
              },
            ]}>
              {cryptoIcon ? (
                <Image
                  source={{ uri: cryptoIcon }}
                  style={s.cryptoIcon}
                  resizeMode="contain"
                />
              ) : (
                <View style={[s.cryptoIconFallback, { backgroundColor: `${config.color}30` }]}>
                  <Text style={[s.cryptoIconTxt, { color: config.color }]}>
                    {cryptoCode[0] ?? '?'}
                  </Text>
                </View>
              )}

              <Text style={[s.cryptoAmt, { color: config.color }]}>
                {cryptoAmount.toFixed(6)} {cryptoCode}
              </Text>
              <Text style={[s.fiatAmt, { color: colors.text2 }]}>
                ≈ {fiatCode} {paidAmount.toFixed(2)}
              </Text>

              {md?.paymentMethod ? (
                <View style={[s.payBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name={paymentInfo.icon as any} size={13} color={colors.text2} />
                  <Text style={[s.payBadgeTxt, { color: colors.text2 }]}>
                    {paymentInfo.label}
                  </Text>
                </View>
              ) : null}
            </Animated.View>
          )}

          {config.isPending && (
            <View style={[s.pollBadge, { backgroundColor: `${config.color}15` }]}>
              <ActivityIndicator size="small" color={config.color} />
              <Text style={[s.pollTxt, { color: config.color }]}>
                {txFetching ? 'Checking status...' : 'Auto-refreshing every 8s'}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── Stage Progress ── */}
        {stages.length > 0 && (
          <Animated.View style={[
            s.card,
            {
              backgroundColor: colors.card,
              borderColor:     colors.border,
              opacity:         fadeAnim,
              transform:       [{ translateY: slideAnim }],
            },
          ]}>
            <View style={s.cardHeader}>
              <Ionicons name="git-branch-outline" size={16} color={config.color} />
              <Text style={[s.cardTitle, { color: colors.text }]}>Progress</Text>
            </View>
            <StageProgress stages={stages} color={config.color} colors={colors} />
          </Animated.View>
        )}

        {/* ── Transaction Details ── */}
        <Animated.View style={[
          s.card,
          {
            backgroundColor: colors.card,
            borderColor:     colors.border,
            opacity:         fadeAnim,
            transform:       [{ translateY: slideAnim }],
          },
        ]}>
          <View style={s.cardHeader}>
            <Ionicons name="receipt-outline" size={16} color={config.color} />
            <Text style={[s.cardTitle, { color: colors.text }]}>Transaction Details</Text>
          </View>

          <InfoRow
            label="Status" colors={colors}
            value={
              <View style={[s.statusPill, { backgroundColor: `${config.color}20` }]}>
                <View style={[s.statusDot, { backgroundColor: config.color }]} />
                <Text style={[s.statusPillTxt, { color: config.color }]}>
                  {currentStatus.charAt(0) + currentStatus.slice(1).toLowerCase()}
                </Text>
              </View>
            }
          />

          <InfoRow
            label="Type" colors={colors}
            value={isBuy ? 'Buy Crypto' : 'Sell Crypto'}
            valueColor={isBuy ? colors.green : colors.red}
          />

          <InfoRow
            label="Cryptocurrency" colors={colors}
            value={
              <View style={s.rowInline}>
                {cryptoIcon ? <Image source={{ uri: cryptoIcon }} style={s.miniIcon} /> : null}
                <Text style={[ir.value, { color: colors.text, maxWidth: '100%' }]}>
                  {md?.currency?.name ?? cryptoCode}{cryptoCode ? ` (${cryptoCode})` : ''}
                </Text>
              </View>
            }
          />

          {networkCode ? (
            <InfoRow
              label="Network" colors={colors}
              value={networkCode.charAt(0).toUpperCase() + networkCode.slice(1)}
            />
          ) : null}

          <InfoRow
            label="Amount Paid" colors={colors}
            value={`${fiatCode} ${paidAmount.toFixed(2)}`}
          />

          <InfoRow
            label={isBuy ? 'Crypto Received' : 'Crypto Sent'} colors={colors}
            value={`${cryptoAmount.toFixed(6)} ${cryptoCode}`}
            valueColor={colors.green}
          />

          {feeAmount > 0 ? (
            <InfoRow
              label="MoonPay Fee" colors={colors}
              value={`${fiatCode} ${feeAmount.toFixed(2)}`}
            />
          ) : null}

          {networkFee > 0 ? (
            <InfoRow
              label="Network Fee" colors={colors}
              value={`${fiatCode} ${networkFee.toFixed(2)}`}
            />
          ) : null}

          {md?.paymentMethod ? (
            <InfoRow
              label="Payment Method" colors={colors}
              value={
                <View style={s.rowInline}>
                  <Ionicons name={paymentInfo.icon as any} size={14} color={colors.text2} />
                  <Text style={[ir.value, { color: colors.text, maxWidth: '100%' }]}>
                    {paymentInfo.label}
                  </Text>
                </View>
              }
            />
          ) : null}

          {tx?.createdAt ? (
            <InfoRow label="Created At" colors={colors} value={formatDate(tx.createdAt)} />
          ) : null}

          {tx?.completedAt ? (
            <InfoRow
              label="Completed At" colors={colors}
              value={formatDate(tx.completedAt)}
              valueColor={colors.green}
            />
          ) : null}

          {md?.country ? (
            <InfoRow
              label="Country" colors={colors} last
              value={`${md.country}${md.state ? ` · ${md.state}` : ''}`}
            />
          ) : null}
        </Animated.View>

        {/* ── IDs & Addresses ── */}
        <Animated.View style={[
          s.card,
          { backgroundColor: colors.card, borderColor: colors.border, opacity: fadeAnim },
        ]}>
          <View style={s.cardHeader}>
            <Ionicons name="key-outline" size={16} color={config.color} />
            <Text style={[s.cardTitle, { color: colors.text }]}>IDs & Addresses</Text>
          </View>

          <InfoRow
            label="Transaction ID" colors={colors} mono
            value={
              tx?.moonpayTransactionId
                ? shortenHash(tx.moonpayTransactionId)
                : shortenHash(transactionId ?? '')
            }
          />

          {tx?.walletAddress ? (
            <InfoRow
              label="Wallet Address" colors={colors} mono
              value={shortenAddress(tx.walletAddress)}
            />
          ) : null}

          {txHash ? (
            <InfoRow
              label="Blockchain TX" colors={colors} mono
              value={shortenHash(txHash)}
              valueColor={colors.green}
            />
          ) : null}

          {tx?.email ? (
            <InfoRow label="Account" colors={colors} last value={tx.email} />
          ) : null}
        </Animated.View>

        {/* ── Fee Summary ── */}
        {totalFee > 0 && (
          <Animated.View style={[
            s.feeSummary,
            {
              backgroundColor: `${colors.green}08`,
              borderColor:     `${colors.green}25`,
              opacity:         fadeAnim,
            },
          ]}>
            <View style={s.feeRow}>
              <Text style={[s.feeTxt, { color: colors.text2 }]}>Subtotal</Text>
              <Text style={[s.feeTxt, { color: colors.text }]}>
                {fiatCode} {subtotal.toFixed(2)}
              </Text>
            </View>
            <View style={s.feeRow}>
              <Text style={[s.feeTxt, { color: colors.text2 }]}>Fees (incl. network)</Text>
              <Text style={[s.feeTxt, { color: colors.text }]}>
                {fiatCode} {totalFee.toFixed(2)}
              </Text>
            </View>
            <View style={[s.feeDivider, { backgroundColor: colors.border }]} />
            <View style={s.feeRow}>
              <Text style={[s.feeTotalTxt, { color: colors.text }]}>Total Paid</Text>
              <Text style={[s.feeTotalTxt, { color: colors.green }]}>
                {fiatCode} {paidAmount.toFixed(2)}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ── Banners ── */}
        {currentStatus === 'COMPLETED' && (
          <View style={[s.banner, {
            backgroundColor: `${colors.green}10`,
            borderColor:     `${colors.green}30`,
          }]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.green} />
            <Text style={[s.bannerTxt, { color: colors.text2 }]}>
              Your crypto will appear in your wallet within a few minutes.
            </Text>
          </View>
        )}

        {currentStatus === 'FAILED' && (
          <View style={[s.banner, { backgroundColor: '#EF444410', borderColor: '#EF444430' }]}>
            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
            <Text style={[s.bannerTxt, { color: colors.text2 }]}>
              You have not been charged. Please try again.
            </Text>
          </View>
        )}

        {txHash ? (
          <View style={[s.banner, {
            backgroundColor: `${colors.green}08`,
            borderColor:     `${colors.green}20`,
          }]}>
            <Ionicons name="cube-outline" size={16} color={colors.green} />
            <Text style={[s.bannerTxt, { color: colors.text2 }]}>
              Transaction confirmed on the blockchain.{'\n'}
              <Text style={{
                fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                fontSize:   10,
              }}>
                {shortenHash(txHash)}
              </Text>
            </Text>
          </View>
        ) : null}

        {IS_WEB_IN_BROWSER && manualCloseHint && (
          <View style={[s.banner, {
            backgroundColor: `${colors.text2}10`,
            borderColor:     colors.border,
          }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.text2} />
            <Text style={[s.bannerTxt, { color: colors.text2 }]}>
              This tab couldn't be closed automatically. You can close it manually now — your browser blocks scripts from closing tabs they didn't open.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── Bottom Buttons ── */}
      <View style={[s.btnWrap, {
        paddingBottom:   insets.bottom + 16,
        backgroundColor: colors.bg,
        borderTopColor:  colors.border,
      }]}>

        {config.isPending && (
          <TouchableOpacity
            style={[s.btnSecondary, { borderColor: colors.border }]}
            onPress={handleRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={15} color={colors.text2} />
            <Text style={[s.btnSecTxt, { color: colors.text2 }]}>Refresh Status</Text>
          </TouchableOpacity>
        )}

        {IS_NATIVE ? (
          <TouchableOpacity
            style={[s.btnPrimary, {
              backgroundColor:
                currentStatus === 'COMPLETED' ? colors.green  :
                currentStatus === 'FAILED'    ? colors.red    :
                colors.surface,
            }]}
            onPress={goToWallet}
            activeOpacity={0.85}
          >
            <Ionicons
              name="wallet-outline" size={18}
              color={['COMPLETED', 'FAILED'].includes(currentStatus) ? '#fff' : colors.text2}
            />
            <Text style={[s.btnPriTxt, {
              color: ['COMPLETED', 'FAILED'].includes(currentStatus) ? '#fff' : colors.text2,
            }]}>
              {currentStatus === 'COMPLETED' ? 'View Wallet 🎉' : 'Go to Wallet'}
            </Text>
          </TouchableOpacity>
        ) : manualCloseHint ? (
          // Browser blocked the close — give the user a clear, non-actionable
          // instruction instead of a button that visibly does nothing.
          <View style={[s.btnPrimary, s.btnManualClose, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.text2} />
            <Text style={[s.btnPriTxt, { color: colors.text2 }]}>
              Please close this tab manually
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.btnPrimary, {
              backgroundColor:
                currentStatus === 'COMPLETED' ? colors.green  :
                currentStatus === 'FAILED'    ? colors.red    :
                colors.surface,
            }]}
            onPress={attemptClose}
            activeOpacity={0.85}
          >
            <Ionicons
              name="close-circle-outline" size={18}
              color={['COMPLETED', 'FAILED'].includes(currentStatus) ? '#fff' : colors.text2}
            />
            <Text style={[s.btnPriTxt, {
              color: ['COMPLETED', 'FAILED'].includes(currentStatus) ? '#fff' : colors.text2,
            }]}>
              {currentStatus === 'COMPLETED' ? 'Close Tab ✓' : 'Close This Tab'}
            </Text>
          </TouchableOpacity>
        )}

        {IS_NATIVE && (
          <TouchableOpacity
            style={[s.btnOutline, { borderColor: colors.border }]}
            onPress={goToBuy}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={15} color={colors.text2} />
            <Text style={[s.btnOutlineTxt, { color: colors.text2 }]}>Buy More Crypto</Text>
          </TouchableOpacity>
        )}

      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { paddingHorizontal: Spacing[4] },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom:     12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: Typography.base, fontWeight: '700' },
  closeBtn: {
    width:          36,
    height:         36,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  refreshBtn: {
    width:          36,
    height:         36,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },

  loadingBar: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    paddingVertical: 14,
    borderTopWidth:  StyleSheet.hairlineWidth,
    borderTopColor:  'rgba(128,128,128,0.2)',
  },
  loadingTxt: { fontSize: Typography.xs, fontWeight: '600' },

  hero: { alignItems: 'center', paddingTop: 28, paddingBottom: 20 },
  iconOuter: {
    width:          110,
    height:         110,
    borderRadius:   55,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   16,
  },
  iconInner: {
    width:          80,
    height:         80,
    borderRadius:   40,
    alignItems:     'center',
    justifyContent: 'center',
  },
  heroTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  heroSub: {
    fontSize:          Typography.sm,
    textAlign:         'center',
    lineHeight:        20,
    marginBottom:      16,
    paddingHorizontal: 20,
  },

  amountBox: {
    alignItems:        'center',
    borderWidth:       1,
    borderRadius:      Radius['2xl'],
    paddingVertical:   20,
    paddingHorizontal: 28,
    marginBottom:      14,
    width:             SCREEN_W - Spacing[4] * 2,
  },
  cryptoIcon:         { width: 42, height: 42, borderRadius: 21, marginBottom: 10 },
  cryptoIconFallback: {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   10,
  },
  cryptoIconTxt: { fontSize: 18, fontWeight: '800' },
  cryptoAmt:     { fontSize: 28, fontWeight: '900', marginBottom: 4 },
  fiatAmt:       { fontSize: Typography.sm, marginBottom: 12 },
  payBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    borderWidth:       1,
    borderRadius:      Radius.full,
    paddingHorizontal: 12,
    paddingVertical:   5,
  },
  payBadgeTxt: { fontSize: Typography.xs, fontWeight: '600' },

  pollBadge: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               8,
    borderRadius:      Radius.full,
    paddingHorizontal: 14,
    paddingVertical:   7,
    marginTop:         8,
  },
  pollTxt: { fontSize: Typography.xs, fontWeight: '600' },

  card: {
    borderRadius: Radius['2xl'],
    borderWidth:  1,
    padding:      Spacing[4],
    marginBottom: Spacing[3],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           7,
    marginBottom:  12,
  },
  cardTitle: { fontSize: Typography.sm, fontWeight: '800' },

  statusPill: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               5,
    paddingHorizontal: 10,
    paddingVertical:   4,
    borderRadius:      Radius.full,
  },
  statusDot:     { width: 6, height: 6, borderRadius: 3 },
  statusPillTxt: { fontSize: Typography.xs, fontWeight: '700' },

  rowInline: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           6,
    justifyContent:'flex-end',
  },
  miniIcon: { width: 16, height: 16, borderRadius: 8 },

  feeSummary: {
    borderWidth:  1,
    borderRadius: Radius['2xl'],
    padding:      Spacing[4],
    marginBottom: Spacing[3],
  },
  feeRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  feeDivider: { height: 1, marginVertical: 8 },
  feeTxt:     { fontSize: Typography.xs },
  feeTotalTxt:{ fontSize: Typography.sm, fontWeight: '800' },

  banner: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
    borderWidth:   1,
    borderRadius:  Radius.xl,
    padding:       12,
    marginBottom:  Spacing[3],
  },
  bannerTxt: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },

  btnWrap: {
    paddingHorizontal: Spacing[4],
    paddingTop:        12,
    borderTopWidth:    1,
    gap:               10,
  },
  btnPrimary: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 15,
    borderRadius:    Radius.xl,
  },
  btnManualClose: { borderWidth: 1 },
  btnPriTxt: { fontSize: Typography.base, fontWeight: '700' },
  btnSecondary: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 12,
    borderRadius:    Radius.xl,
    borderWidth:     1,
  },
  btnSecTxt: { fontSize: Typography.sm, fontWeight: '600' },
  btnOutline: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 12,
    borderRadius:    Radius.xl,
    borderWidth:     1,
  },
  btnOutlineTxt: { fontSize: Typography.sm, fontWeight: '600' },
});