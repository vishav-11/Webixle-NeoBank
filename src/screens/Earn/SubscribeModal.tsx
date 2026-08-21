import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal, Platform, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  useEarnPreview,
  useSubscribeEarn,
  type EarnProduct,
} from '@/hooks/queires';

import {
  Spacing, Typography, Radius, IconSize, IconBox,
  getPrimaryGradient,
} from '@/styles/theme';

// ─── Constants ────────────────────────────────────────────────────────────────
const IS_WEB = Platform.OS === 'web';

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

const fmtNum = (v: number | string, d = 6) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return '0.000000';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: d,
  });
};

// ─── Coin Colors ──────────────────────────────────────────────────────────────
const COIN_COLORS: Record<string, [string, string]> = {
  BTC:   ['#F7931A', '#E8830A'],
  ETH:   ['#627EEA', '#4A6DD8'],
  TRX:   ['#E83050', '#C0202A'],
  BNB:   ['#F5A623', '#E09510'],
  USDT:  ['#26A17B', '#1A8A66'],
  USDC:  ['#2775CA', '#1A60B5'],
  SOL:   ['#9945FF', '#7B35E0'],
  MATIC: ['#8247E5', '#6535CC'],
};
const coinColors = (sym: string): [string, string] =>
  COIN_COLORS[sym?.toUpperCase()] ?? ['#334155', '#1E293B'];

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({ w, h, r = Radius.sm }: { w?: any; h: number; r?: number }) {
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
      style={{ width: w ?? '100%', height: h, borderRadius: r, backgroundColor: '#334155', opacity }}
    />
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface SubscribeModalProps {
  visible:   boolean;
  product:   EarnProduct | null;
  onClose:   () => void;
  onSuccess: () => void;
  colors:    any;
  isDark:    boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubscribeModal({
  visible, product, onClose, onSuccess, colors, isDark,
}: SubscribeModalProps) {
  const [amount, setAmount] = useState('');
  const prevTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const previewMutation   = useEarnPreview();
  const subscribeMutation = useSubscribeEarn();

  const previewMutateRef = useRef(previewMutation.mutate);
  const previewResetRef  = useRef(previewMutation.reset);

  useEffect(() => { previewMutateRef.current = previewMutation.mutate;  }, [previewMutation.mutate]);
  useEffect(() => { previewResetRef.current  = previewMutation.reset;   }, [previewMutation.reset]);

  // Reset on open/close
  useEffect(() => {
    if (!visible) {
      setAmount('');
      previewResetRef.current();
    }
  }, [visible]);

  // Debounced preview
  useEffect(() => {
    if (prevTimer.current) { clearTimeout(prevTimer.current); prevTimer.current = null; }

    const amtNum = parseFloat(amount);
    if (!product || !amount || isNaN(amtNum) || amtNum <= 0) {
      previewResetRef.current();
      return;
    }

    prevTimer.current = setTimeout(() => {
      previewMutateRef.current({ productId: product.id, amount });
    }, 600);

    return () => {
      if (prevTimer.current) { clearTimeout(prevTimer.current); prevTimer.current = null; }
    };
  }, [amount, product]);

  // Subscribe handler
  const handleConfirm = useCallback(async () => {
    if (!product || !amount) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount');
      return;
    }
    if (amt < product.minAmount) {
      showAlert('Too Low', `Minimum deposit is ${product.minAmount} ${product.symbol}`);
      return;
    }
    try {
      await subscribeMutation.mutateAsync({ productId: product.id, amount });
      onClose();
      showAlert(
        'Subscribed! 🎉',
        `You staked ${amount} ${product.symbol} at ${product.apy}% APY`,
        [{ text: 'OK', onPress: onSuccess }],
      );
    } catch (e: any) {
      showAlert('Subscription Failed', e?.message ?? 'Please try again.');
    }
  }, [product, amount, subscribeMutation, onClose, onSuccess]);

  // Close handler
  const handleClose = useCallback(() => {
    if (prevTimer.current) { clearTimeout(prevTimer.current); prevTimer.current = null; }
    onClose();
  }, [onClose]);

  if (!visible || !product) return null;

  const isFixed     = product.type === 'fixed';
  // fixed = red accent, flexible = theme accent (blue)
  const accentColor = isFixed ? colors.red : colors.accent;
  const [c1, c2]    = coinColors(product.symbol);
  const amtNum      = parseFloat(amount) || 0;
  const isValid     = amtNum >= product.minAmount;
  const primaryGrad = getPrimaryGradient(isDark);

  const preview   = previewMutation.data;
  const prevLoad  = previewMutation.isPending;
  const prevError = (previewMutation.error as any)?.message ?? '';
  const loading   = subscribeMutation.isPending;

  // Input border color based on validity
  const inputBorderColor = amount
    ? isValid
      ? colors.greenBorder   // valid — green border
      : colors.redBorder     // invalid — red border
    : colors.border;

  // ── Inner Content ─────────────────────────────────────────────────────────
  const Inner = (
    <View style={[s.inner, { backgroundColor: colors.card }, IS_WEB && s.innerWeb]}>

      {/* Handle (mobile only) */}
      {!IS_WEB && <View style={[s.handle, { backgroundColor: colors.border }]} />}

      {/* Header */}
      <View style={s.header}>
        <LinearGradient colors={[c1, c2]} style={s.headerIcon}>
          <Text style={s.headerIconTxt}>{(product.symbol ?? '?')[0]}</Text>
        </LinearGradient>

        <View style={{ flex: 1 }}>
          <Text style={[s.headerName, { color: colors.text }]} numberOfLines={1}>
            {product.name}
          </Text>
          <View style={s.headerMeta}>
            <View style={[s.typeBadge, { borderColor: accentColor, backgroundColor: `${accentColor}18` }]}>
              <Ionicons
                name={isFixed ? 'lock-closed' : 'lock-open'}
                size={10}
                color={accentColor}
              />
              <Text style={[s.typeBadgeTxt, { color: accentColor }]}>
                {isFixed ? `${product.duration ?? 0}D Fixed` : 'Flexible'}
              </Text>
            </View>
            {/* APY = greenBright — it's a positive earning metric */}
            <Text style={[s.apyText, { color: colors.greenBright }]}>
              {product.apy}% APY
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[s.closeBtn, { backgroundColor: colors.surface }]}
          onPress={handleClose}
        >
          <Ionicons name="close" size={IconSize.sm} color={colors.text2} />
        </TouchableOpacity>
      </View>

      {/* Info chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipsScroll}
        contentContainerStyle={{ gap: Spacing[2] }}
      >
        {[
          { icon: 'arrow-down-circle-outline', label: `Min: ${product.minAmount} ${product.symbol}` },
          { icon: 'time-outline',              label: isFixed ? `${product.duration} Days` : 'Flexible' },
          { icon: 'trending-up-outline',       label: `${product.apy}% APY` },
          { icon: 'wallet-outline',            label: `Balance: ${fmtNum(product.balance ?? 0, 4)}` },
        ].map((c: any) => (
          <View
            key={c.label}
            style={[s.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name={c.icon} size={12} color={colors.text3} />
            <Text style={[s.chipTxt, { color: colors.text2 }]}>{c.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Amount Input */}
      <Text style={[s.inputLabel, { color: colors.text2 }]}>Amount to Stake</Text>
      <View style={[s.inputRow, { backgroundColor: colors.surface, borderColor: inputBorderColor }]}>
        <LinearGradient colors={[c1, c2]} style={s.inputIcon}>
          <Text style={s.inputIconTxt}>{(product.symbol ?? '?')[0]}</Text>
        </LinearGradient>
        <TextInput
          style={[s.input, { color: colors.text }, webReset]}
          placeholder={`Min ${product.minAmount}`}
          placeholderTextColor={colors.text3}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={v =>
            setAmount(v.replace(/[^0-9.]/g, '').replace(/(\..*?)\..*/g, '$1'))
          }
          underlineColorAndroid="transparent"
          autoFocus={IS_WEB}
        />
        <Text style={[s.inputSym, { color: accentColor }]}>{product.symbol}</Text>
        {amount.length > 0 && (
          <TouchableOpacity onPress={() => setAmount('')} style={{ marginLeft: Spacing[1] + 2 }}>
            <Ionicons name="close-circle" size={IconSize.sm} color={colors.text3} />
          </TouchableOpacity>
        )}
      </View>

      {/* Validation hint */}
      {amount.length > 0 && !isValid && (
        <View style={s.validRow}>
          <Ionicons name="alert-circle-outline" size={13} color={colors.red} />
          <Text style={[s.validTxt, { color: colors.red }]}>
            Minimum deposit: {product.minAmount} {product.symbol}
          </Text>
        </View>
      )}

      {/* Preview Box */}
      <View style={[s.previewBox, { backgroundColor: colors.surface, borderColor: colors.borderSoft }]}>
        <Text style={[s.previewTitle, { color: colors.text2 }]}>Estimated Earnings</Text>

        {prevLoad ? (
          <View style={{ gap: Spacing[2] + 2, marginTop: Spacing[2] + 2 }}>
            <SkeletonBox h={13} r={Radius.xs} />
            <SkeletonBox h={13} r={Radius.xs} />
            <SkeletonBox h={13} r={Radius.xs} />
          </View>
        ) : prevError ? (
          <Text style={[s.previewErr, { color: colors.red }]}>{prevError}</Text>
        ) : preview ? (
          <View style={{ gap: Spacing[2] + 2, marginTop: Spacing[2] + 2 }}>
            {([
              { label: 'Daily',   val: fmtNum(preview.dailyEarn)   + ' ' + product.symbol },
              { label: 'Monthly', val: fmtNum(preview.monthlyEarn) + ' ' + product.symbol },
              { label: 'Yearly',  val: fmtNum(preview.yearlyEarn)  + ' ' + product.symbol },
            ] as { label: string; val: string }[]).map(r => (
              <View key={r.label} style={s.previewRow}>
                <Text style={[s.previewLbl, { color: colors.text2 }]}>{r.label}</Text>
                {/* Earned values = greenBright */}
                <Text style={[s.previewVal, { color: colors.greenBright }]}>{r.val}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={[s.previewPlaceholder, { color: colors.text3 }]}>
            Enter an amount to see estimated earnings
          </Text>
        )}
      </View>

      {/* CTA Button — primary gradient to match navy theme */}
      <TouchableOpacity
        style={[s.btn, (!isValid || loading) && { opacity: 0.5 }]}
        onPress={handleConfirm}
        disabled={!isValid || loading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={primaryGrad}
          style={s.btnGrad}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={IconSize.sm} color="#fff" />
              <Text style={s.btnTxt}>
                Subscribe {amount ? `${amount} ${product.symbol}` : ''}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

    </View>
  );

  // ── Web: centered modal ────────────────────────────────────────────────────
  if (IS_WEB) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={[s.webOverlay, { backgroundColor: colors.overlay }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={handleClose}
            activeOpacity={1}
          />
          <View style={[s.webPanel, { borderColor: colors.border }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {Inner}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Mobile: bottom sheet ───────────────────────────────────────────────────
  return (
    <Modal visible transparent animationType="slide">
      <View style={[s.mobileOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          onPress={handleClose}
          activeOpacity={1}
        />
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ justifyContent: 'flex-end', flexGrow: 1 }}
        >
          {Inner}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Web
  webOverlay:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing[6] },
  webPanel:           { width: '100%', maxWidth: 460, borderRadius: Radius['2xl'], borderWidth: 1, overflow: 'hidden', maxHeight: '90%' as any },

  // Mobile
  mobileOverlay:      { flex: 1, justifyContent: 'flex-end' },

  // Inner
  inner:              { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[6], paddingBottom: Spacing[8] + 4 },
  innerWeb:           { borderRadius: Radius['2xl'] },
  handle:             { width: 40, height: 4, borderRadius: Radius.xs, alignSelf: 'center', marginBottom: Spacing[5] },

  // Header
  header:             { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] + 2, marginBottom: Spacing[4] },
  headerIcon:         { width: IconBox.md, height: IconBox.md, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  headerIconTxt:      { fontSize: Typography.xl, fontWeight: '800', color: '#FFF' },
  headerName:         { fontSize: Typography.md, fontWeight: '700', marginBottom: Spacing[1] + 2 },
  headerMeta:         { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  typeBadge:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[2] + 2, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1 },
  typeBadgeTxt:       { fontSize: Typography.xs, fontWeight: '700' },
  apyText:            { fontSize: Typography.base, fontWeight: '700' },
  closeBtn:           { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  // Chips
  chipsScroll:        { marginBottom: Spacing[4] },
  chip:               { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1] + 3, borderRadius: Radius.full, borderWidth: 1 },
  chipTxt:            { fontSize: Typography.xs },

  // Input
  inputLabel:         { fontSize: Typography.sm, fontWeight: '600', marginBottom: Spacing[2] },
  inputRow:           { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing[3] + 2, paddingVertical: Spacing[3], gap: Spacing[2] + 2, marginBottom: Spacing[2] },
  inputIcon:          { width: 32, height: 32, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  inputIconTxt:       { fontSize: Typography.sm, fontWeight: '700', color: '#FFF' },
  input:              { flex: 1, fontSize: Typography.xl, fontWeight: '700', padding: 0 },
  inputSym:           { fontSize: Typography.base, fontWeight: '700' },

  // Validation
  validRow:           { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: Spacing[2] + 2 },
  validTxt:           { fontSize: Typography.xs },

  // Preview
  previewBox:         { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[4], marginVertical: Spacing[3] },
  previewTitle:       { fontSize: Typography.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  previewRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  previewLbl:         { fontSize: Typography.sm },
  previewVal:         { fontSize: Typography.sm, fontWeight: '700' },
  previewErr:         { fontSize: Typography.sm, marginTop: Spacing[2] },
  previewPlaceholder: { fontSize: Typography.sm, marginTop: Spacing[2], fontStyle: 'italic' },

  // Button
  btn:                { borderRadius: Radius.lg, overflow: 'hidden', marginTop: 4 },
  btnGrad:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[2], paddingVertical: Spacing[4] },
  btnTxt:             { fontSize: Typography.md, fontWeight: '700', color: '#fff' },
});