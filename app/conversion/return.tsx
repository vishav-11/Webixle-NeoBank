// app/conversion/return.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useTabCloser } from '@/hooks/useTabCloser';

/**
 * MoonPay redirects here after a WEB checkout (new tab, opened via
 * window.open() from BuyMain). This page is intentionally lightweight:
 *
 *   - No transaction-status API calls, no polling.
 *   - The original tab already has TransactionStatusModal open and polling
 *     the same transaction — this page's only job is to hand control back.
 *
 * This is what removes the slow load time the full detail screen had when
 * it was being used as the return target for every web checkout.
 */

const STATUS_META: Record<string, { color: string; icon: string; title: string }> = {
  COMPLETED:            { color: '#10B981', icon: 'checkmark-circle', title: 'Payment Received' },
  PENDING:               { color: '#F59E0B', icon: 'time-outline',     title: 'Payment Submitted' },
  PROCESSING:            { color: '#3B82F6', icon: 'sync-outline',     title: 'Payment Submitted' },
  WAITINGPAYMENT:        { color: '#8B5CF6', icon: 'wallet-outline',   title: 'Payment Submitted' },
  WAITINGAUTHORIZATION:  { color: '#F59E0B', icon: 'shield-outline',   title: 'Authorization Needed' },
  FAILED:                { color: '#EF4444', icon: 'close-circle',     title: 'Payment Failed' },
  CANCELLED:             { color: '#6B7280', icon: 'ban-outline',      title: 'Payment Cancelled' },
};

function getMeta(status: string) {
  return STATUS_META[(status ?? 'PENDING').toUpperCase()] ?? STATUS_META.PENDING;
}

export default function ConversionReturnScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{
    transactionId?:      string;
    baseCurrencyCode?:   string;
    baseCurrencyAmount?: string;
    transactionStatus?:  string;
  }>();

  const { hasOpener, manualCloseHint, attemptClose } = useTabCloser();
  const notifiedRef = useRef(false);

  const meta = getMeta(params.transactionStatus ?? 'PENDING');

  // Notify the original tab and auto-close — only works when this tab was
  // opened via window.open() (hasOpener), which is the case for our
  // standard web flow now that BuyMain opens MoonPay in a new tab.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    if (!hasOpener || notifiedRef.current) return;
    notifiedRef.current = true;

    try {
      window.opener?.postMessage(
        {
          type: 'MOONPAY_COMPLETE',
          params: {
            transactionId:      params.transactionId      ?? '',
            baseCurrencyCode:   params.baseCurrencyCode   ?? '',
            baseCurrencyAmount: params.baseCurrencyAmount ?? '',
            transactionStatus:  params.transactionStatus  ?? '',
          },
        },
        window.location.origin
      );
    } catch (err) {
      console.error('[Return] postMessage failed:', err);
    }

    const timer = setTimeout(() => attemptClose(), 1200);
    return () => clearTimeout(timer);
  }, [
    hasOpener,
    attemptClose,
    params.transactionId,
    params.baseCurrencyCode,
    params.baseCurrencyAmount,
    params.transactionStatus,
  ]);

  return (
    <View style={[
      s.root,
      { backgroundColor: colors.bg, paddingTop: insets.top + 40, paddingBottom: insets.bottom + 24 },
    ]}>
      <View style={[s.iconWrap, { backgroundColor: `${meta.color}18` }]}>
        <Ionicons name={meta.icon as any} size={44} color={meta.color} />
      </View>

      <Text style={[s.title, { color: colors.text }]}>{meta.title}</Text>

      <Text style={[s.sub, { color: colors.text2 }]}>
        {hasOpener
          ? "Head back to the MetaVault tab — your transaction status will update there automatically."
          : 'You can now return to MetaVault to see your transaction status.'}
      </Text>

      {manualCloseHint ? (
        <View style={[s.hint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.text2} />
          <Text style={[s.hintTxt, { color: colors.text2 }]}>
            This tab couldn't be closed automatically — please close it manually to return to MetaVault.
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.btn, { backgroundColor: meta.color }]}
          onPress={attemptClose}
          activeOpacity={0.85}
        >
          <Ionicons name="close-circle-outline" size={18} color="#fff" />
          <Text style={s.btnTxt}>Close Tab · Return to MetaVault</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center', paddingHorizontal: Spacing[5] },
  iconWrap:{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title:   { fontSize: 22, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  sub:     { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20, marginBottom: 28, paddingHorizontal: 12 },
  btn:     {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius:    Radius.xl,
    width:           '100%',
    maxWidth:        360,
  },
  btnTxt:  { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
  hint:    {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           8,
    borderWidth:   1,
    borderRadius:  Radius.xl,
    padding:       14,
    width:         '100%',
    maxWidth:      360,
  },
  hintTxt: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },
});