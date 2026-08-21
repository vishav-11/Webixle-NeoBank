/**
 * modules/account/index.tsx
 * ─────────────────────────────────────────────────────────────────
 * Single self-contained "Account" module.
 * Contains: Types, Endpoints, Query Keys, Demo Data, Service, Hooks,
 * AND the full Accounts screen UI — all in one place.
 *
 * Usage anywhere in the app:
 *   import Account from '@/modules/account';
 *   ...
 *   <Account />
 *
 * Or if you only need the data layer elsewhere (no UI):
 *   import { useFiatAccounts, accountService, type FiatAccount } from '@/modules/account';
 *
 * ⚠️ BACKEND STATUS: Not live yet. USE_DEMO_DATA = true makes every
 * hook resolve with realistic mock data instead of hitting the network.
 * Once the backend endpoint is ready, flip USE_DEMO_DATA to false —
 * nothing else in the app needs to change.
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, LayoutAnimation, Platform, UIManager,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { api } from '@/services/apiClient';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ═══════════════════════════════════════════════════════════════════
// ─── FLAG ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const USE_DEMO_DATA = true; // ⚠️ set to false once backend is live

// ═══════════════════════════════════════════════════════════════════
// ─── TYPES ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export interface FiatAccount {
  currency:       string;   // 'USD' | 'EUR' | ...
  currencyName:   string;
  balance:        string;
  accountHolder:  string;
  bankName:       string;
  accountNumber?: string;   // used for USD-style accounts
  routingNumber?: string;   // ACH/wire routing (USD)
  iban?:          string;   // used for EUR-style accounts
  swiftBic:       string;
  bankAddress:    string;
  status:         'active' | 'pending' | 'unavailable';
}

export interface FiatAccountListResponse {
  accounts: FiatAccount[];
}

export interface RequestCurrencyResponse {
  success: boolean;
  message?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ─── ENDPOINTS ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export const ACCOUNT_ENDPOINTS = {
  list:            '/accounts/fiat',
  requestCurrency: '/accounts/fiat/request',
} as const;

// ═══════════════════════════════════════════════════════════════════
// ─── QUERY KEYS ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export const ACCOUNT_QK = {
  fiatList: ['account', 'fiatList'] as const,
};

// ═══════════════════════════════════════════════════════════════════
// ─── DEMO DATA (used while USE_DEMO_DATA = true) ─────────────────
// ═══════════════════════════════════════════════════════════════════

const DEMO_ACCOUNTS: FiatAccount[] = [
  {
    currency:      'USD',
    currencyName:  'US Dollar',
    balance:       '0.00',
    accountHolder: 'Alex',
    bankName:      'Community Federal Savings Bank',
    accountNumber: '8890123456',
    routingNumber: '026073150',
    swiftBic:      'CMFGUS33',
    bankAddress:   '89-16 Jamaica Ave, Woodhaven, NY 11421, USA',
    status:        'active',
  },
  {
    currency:      'EUR',
    currencyName:  'Euro',
    balance:       '0.00',
    accountHolder: 'Alex',
    bankName:      'Webixle EU Payments B.V.',
    iban:          'NL91 PAIS 0417 1643 00',
    swiftBic:      'PAISNL2A',
    bankAddress:   'Herengracht 182, 1016 BR Amsterdam, Netherlands',
    status:        'active',
  },
];

function delay<T>(value: T, ms = 500): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

// ═══════════════════════════════════════════════════════════════════
// ─── SERVICE ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export const accountService = {
  async listFiatAccounts(): Promise<FiatAccountListResponse> {
    if (USE_DEMO_DATA) {
      return delay({ accounts: DEMO_ACCOUNTS });
    }
    const res = await api.get<{ data: FiatAccountListResponse }>(ACCOUNT_ENDPOINTS.list);
    return (res as any)?.data ?? (res as any);
  },

  async requestCurrency(currency: string): Promise<RequestCurrencyResponse> {
    if (USE_DEMO_DATA) {
      return delay({ success: true, message: `${currency} account request submitted.` });
    }
    return api.post<RequestCurrencyResponse>(ACCOUNT_ENDPOINTS.requestCurrency, { currency });
  },
};

// ═══════════════════════════════════════════════════════════════════
// ─── HOOKS ────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function useFiatAccounts() {
  return useQuery({
    queryKey: ACCOUNT_QK.fiatList,
    queryFn:  () => accountService.listFiatAccounts(),
    staleTime: 60_000,
  });
}

export function useRequestFiatCurrency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currency: string) => accountService.requestCurrency(currency),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ACCOUNT_QK.fiatList });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ─── UI CONSTANTS ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ',
};

// ═══════════════════════════════════════════════════════════════════
// ─── UI: DetailRow ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function DetailRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  return (
    <View style={styles.detailRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.detailLabel, { color: colors.text2 }]}>{label}</Text>
        <Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <TouchableOpacity
        onPress={handleCopy}
        style={[styles.copyBtn, { backgroundColor: copied ? colors.greenDim : colors.borderSoft }]}
      >
        <Ionicons
          name={copied ? 'checkmark' : 'copy-outline'}
          size={14}
          color={copied ? colors.green : colors.text2}
        />
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── UI: AccountCard ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function AccountCard({ account, colors }: { account: FiatAccount; colors: any }) {
  const [expanded, setExpanded] = useState(false);
  const symbol = CURRENCY_SYMBOL[account.currency] ?? account.currency;
  const isPending = account.status === 'pending';

  const toggle = useCallback(() => {
    if (isPending) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  }, [isPending]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.75} style={styles.cardHeader} disabled={isPending}>
        <View style={[styles.currencyIcon, { backgroundColor: colors.primaryDim }]}>
          <Text style={[styles.currencySymbol, { color: colors.primary }]}>{symbol}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.currencyName, { color: colors.text }]}>{account.currencyName}</Text>
          <Text style={[styles.currencyCode, { color: colors.text2 }]}>
            {account.currency} Account
          </Text>
        </View>

        {isPending ? (
          <View style={[styles.pendingPill, { backgroundColor: colors.orangeDim }]}>
            <Text style={[styles.pendingPillText, { color: colors.orange }]}>Pending</Text>
          </View>
        ) : (
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.balance, { color: colors.text }]}>
              {symbol}{parseFloat(account.balance || '0').toFixed(2)}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.text2}
              style={{ marginTop: 4 }}
            />
          </View>
        )}
      </TouchableOpacity>

      {expanded && !isPending && (
        <View style={[styles.detailsWrap, { borderTopColor: colors.borderSoft }]}>
          <DetailRow label="Account Holder" value={account.accountHolder} colors={colors} />
          <DetailRow label="Bank Name" value={account.bankName} colors={colors} />
          {account.accountNumber && (
            <DetailRow label="Account Number" value={account.accountNumber} colors={colors} />
          )}
          {account.routingNumber && (
            <DetailRow label="Routing Number (ACH)" value={account.routingNumber} colors={colors} />
          )}
          {account.iban && <DetailRow label="IBAN" value={account.iban} colors={colors} />}
          <DetailRow label="SWIFT / BIC" value={account.swiftBic} colors={colors} />
          <DetailRow label="Bank Address" value={account.bankAddress} colors={colors} />

          <View style={[styles.infoNote, { backgroundColor: colors.orangeDim }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.orange} />
            <Text style={[styles.infoNoteText, { color: colors.orange }]}>
              Only send transfers from an account in your own name. Transfers from
              third-party accounts may be delayed or rejected.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── UI: AccountSkeleton ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function AccountSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.currencyIcon, { backgroundColor: colors.borderSoft }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skelLine, { width: '50%', backgroundColor: colors.borderSoft }]} />
          <View style={[styles.skelLine, { width: '30%', backgroundColor: colors.borderSoft }]} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN SCREEN COMPONENT ────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function AccountsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isError, isFetching, refetch } = useFiatAccounts();
  const accounts = data?.accounts ?? [];

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => (router.canGoBack() ? router.back() : router.push('/'))}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Accounts</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing[8] }]}
        refreshControl={
          <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.sectionIntro, { color: colors.text2 }]}>
          These are your personal bank accounts. Anyone can send a bank transfer
          to these details to deposit fiat into your wallet.
        </Text>

        {isLoading ? (
          <>
            <AccountSkeleton colors={colors} />
            <AccountSkeleton colors={colors} />
          </>
        ) : isError ? (
          <View style={styles.stateWrap}>
            <View style={[styles.stateIcon, { backgroundColor: colors.redDim }]}>
              <Ionicons name="alert-circle-outline" size={28} color={colors.red} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>Couldn't load accounts</Text>
            <Text style={[styles.stateSub, { color: colors.text2 }]}>
              Something went wrong. Please try again.
            </Text>
            <TouchableOpacity
              onPress={() => refetch()}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : accounts.length === 0 ? (
          <View style={styles.stateWrap}>
            <View style={[styles.stateIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="wallet-outline" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.stateTitle, { color: colors.text }]}>No accounts yet</Text>
            <Text style={[styles.stateSub, { color: colors.text2 }]}>
              Your fiat bank accounts will appear here once they're issued.
            </Text>
          </View>
        ) : (
          accounts.map((acc) => (
            <AccountCard key={acc.currency} account={acc} colors={colors} />
          ))
        )}

        {!isLoading && (
          <TouchableOpacity
            style={[styles.addMoreBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            activeOpacity={0.75}
          >
            <View style={[styles.addMoreIcon, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="add" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.addMoreTitle, { color: colors.text }]}>Request Another Currency</Text>
              <Text style={[styles.addMoreSub, { color: colors.text2 }]}>
                More currencies coming soon
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.text2} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── STYLES ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[4], paddingBottom: 12, borderBottomWidth: 1,
  },
  iconBtn: { width: 38, height: 38, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontWeight: '700' },

  scroll: { padding: Spacing[4], gap: Spacing[3] },
  sectionIntro: { fontSize: Typography.sm, lineHeight: 20, marginBottom: Spacing[2] },

  card: { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[4] },
  currencyIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  currencySymbol: { fontSize: 20, fontWeight: '800' },
  currencyName: { fontSize: Typography.base, fontWeight: '700' },
  currencyCode: { fontSize: Typography.xs, marginTop: 2 },
  balance: { fontSize: Typography.base, fontWeight: '800' },

  pendingPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  pendingPillText: { fontSize: 11, fontWeight: '700' },

  detailsWrap: { borderTopWidth: 1, padding: Spacing[4], gap: Spacing[3] },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  detailLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: Typography.sm, fontWeight: '700' },
  copyBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  infoNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    borderRadius: Radius.md, padding: Spacing[3], marginTop: Spacing[1],
  },
  infoNoteText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 16 },

  addMoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4], marginTop: Spacing[2],
  },
  addMoreIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  addMoreTitle: { fontSize: Typography.sm, fontWeight: '700' },
  addMoreSub: { fontSize: 11, marginTop: 2 },

  skelLine: { height: 12, borderRadius: 6 },

  stateWrap: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  stateIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { fontSize: Typography.base, fontWeight: '700' },
  stateSub: { fontSize: Typography.sm, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
  retryBtn: { marginTop: 4, paddingVertical: 10, paddingHorizontal: 24, borderRadius: Radius.full },
  retryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: Typography.sm },
});

// ═══════════════════════════════════════════════════════════════════
// ─── DEFAULT EXPORT — the screen itself ───────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default AccountsScreen;