/**
 * app/loanHistory.tsx
 * Loan History screen — dark theme matching design PDFs.
 * Uses loanService + DarkColors/LightColors from theme.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import loanService from '@/services/loanService';
import type { LoanData, LoanStats } from '@/types/loanType';

// ─── Asset colour map (same as p2p) ──────────────────────────────────────────
const ASSET_COLORS: Record<string, { bg: string; text: string }> = {
  BTC:   { bg: '#f7931a',  text: '#fff' },
  ETH:   { bg: '#627eea',  text: '#fff' },
  USDT:  { bg: '#26a17b',  text: '#fff' },
  USDC:  { bg: '#2775ca',  text: '#fff' },
  BNB:   { bg: '#f3ba2f',  text: '#000' },
  SOL:   { bg: '#9945ff',  text: '#fff' },
  TRX:   { bg: '#ef0027',  text: '#fff' },
  XRP:   { bg: '#23292f',  text: '#fff' },
  ADA:   { bg: '#0033ad',  text: '#fff' },
  DOT:   { bg: '#e6007a',  text: '#fff' },
  MATIC: { bg: '#8247e5',  text: '#fff' },
};
const assetColor = (sym: string) =>
  ASSET_COLORS[sym?.toUpperCase()] ?? { bg: '#3D6170', text: '#fff' };

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  ACTIVE:     { label: 'Active',     color: '#00D395' },
  REPAID:     { label: 'Repaid',     color: '#4A9EFF' },
  LIQUIDATED: { label: 'Liquidated', color: '#FF4D6A' },
  CLOSED:     { label: 'Closed',     color: '#7A9BA8'  },
} as const;

type FilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n?: number | string | null, prefix = '') => {
  const v = Number(n ?? 0);
  if (v >= 1e6) return `${prefix}${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${prefix}${(v / 1e3).toFixed(1)}k`;
  return `${prefix}${v.toFixed(2)}`;
};

const fmtDate = (d: string) => {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${String(dt.getDate()).padStart(2, '0')}/${dt.getFullYear()}`;
};

const collSymbol = (loan: LoanData): string =>
  typeof loan.collateralAsset === 'object'
    ? (loan.collateralAsset as any).symbol ?? '?'
    : '?';

const borSymbol = (loan: LoanData): string =>
  typeof loan.borrowAsset === 'object'
    ? (loan.borrowAsset as any).symbol ?? '?'
    : '?';

// ─── Loan Card ────────────────────────────────────────────────────────────────
function LoanCard({
  loan,
  colors,
  onPress,
}: {
  loan: LoanData;
  colors: any;
  onPress: () => void;
}) {
  const cSym = collSymbol(loan);
  const bSym = borSymbol(loan);
  const cClr = assetColor(cSym);
  const bClr = assetColor(bSym);
  const status = STATUS_CFG[loan.status] ?? STATUS_CFG.CLOSED;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Row 1 — symbols + pair name + status */}
      <View style={s.cardRow}>
        <View style={s.assetIcons}>
          <View style={[s.assetBadge, { backgroundColor: cClr.bg }]}>
            <Text style={[s.assetBadgeText, { color: cClr.text }]}>{cSym}</Text>
          </View>
          <View style={[s.assetBadge, s.assetBadgeRight, { backgroundColor: bClr.bg }]}>
            <Text style={[s.assetBadgeText, { color: bClr.text }]}>{bSym}</Text>
          </View>
          <View style={s.swapIcon}>
            <Ionicons name="swap-horizontal" size={12} color={colors.text2} />
          </View>
        </View>

        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={[s.pairTitle, { color: colors.text }]}>
            {cSym} - {bSym}
          </Text>
          <Text style={[s.pairDate, { color: colors.text2 }]}>
            {fmtDate(loan.createdAt)}
          </Text>
        </View>

        <View style={[s.statusBadge, { borderColor: status.color }]}>
          <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Row 2 — Collateral / Borrowed */}
      <View style={[s.dividerRow, { borderTopColor: colors.border }]}>
        <View style={s.halfCol}>
          <Text style={[s.miniLabel, { color: colors.text3 }]}>Collateral</Text>
          <Text style={[s.bigVal, { color: colors.text }]}>
            {Number(loan.collateralAmount).toFixed(4)} {cSym}
          </Text>
          <Text style={[s.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.collateralUsd, '$')}
          </Text>
        </View>
        <View style={[s.vertDivider, { backgroundColor: colors.border }]} />
        <View style={[s.halfCol, { alignItems: 'flex-end' }]}>
          <Text style={[s.miniLabel, { color: colors.text3 }]}>Borrowed</Text>
          <Text style={[s.bigVal, { color: colors.text }]}>
            {Number(loan.borrowedAmount).toFixed(4)} {bSym}
          </Text>
          <Text style={[s.subVal, { color: colors.text2 }]}>
            ~ {fmt(loan.borrowedUsd, '$')}
          </Text>
        </View>
      </View>

      {/* Row 3 — APR / LTV / Interest */}
      <View style={[s.statsRow, { borderTopColor: colors.border }]}>
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>APR</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{loan.interestRate}%</Text>
        </View>
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>LTV</Text>
          <Text style={[s.statVal, { color: colors.text }]}>{loan.ltv}%</Text>
        </View>
        <View style={s.statItem}>
          <Text style={[s.statLabel, { color: colors.text3 }]}>Interest</Text>
          <Text style={[s.statVal, { color: colors.text }]}>
            {Number(loan.totalInterestAccrued).toFixed(4)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function LoanHistoryScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loans, setLoans]         = useState<LoanData[]>([]);
  const [stats, setStats]         = useState<LoanStats | null>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]       = useState<FilterTab>('ALL');
  const [selLoan, setSelLoan]     = useState<LoanData | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [active, completed, statsData] = await Promise.allSettled([
        loanService.getMyLoans(),
        loanService.getCompleted(),
        loanService.getStats(),
      ]);
      const all = [
        ...(active.status === 'fulfilled' ? active.value : []),
        ...(completed.status === 'fulfilled' ? completed.value : []),
      ];
      setLoans(all);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
    } catch {
      setLoans([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter counts
  const activeCount    = loans.filter(l => l.status === 'ACTIVE').length;
  const completedCount = loans.filter(l => l.status !== 'ACTIVE').length;
  const allCount       = loans.length;

  const filtered = loans.filter(l => {
    if (filter === 'ACTIVE')    return l.status === 'ACTIVE';
    if (filter === 'COMPLETED') return l.status !== 'ACTIVE';
    return true;
  });

  const GREEN = colors.green;

  // ── Selected loan handler ────────────────────────────────────────────────
  const handleManage = () => {
    if (!selLoan) return;
    router.push({ pathname: '/loanDetails', params: { loanId: selLoan._id } });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.surface }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={18} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Loan History</Text>
          <View style={{ width: 38 }} />
        </View>
        <View style={s.center}>
          <ActivityIndicator size="large" color={GREEN} />
        </View>
      </View>
    );
  }

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 10, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Loan History</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={GREEN} />
        }
      >
        {/* ── Stats Banner ── */}
        <View style={[s.statsBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.bannerItem}>
            <Text style={[s.bannerLabel, { color: colors.text2 }]}>Total Borrowed</Text>
            <Text style={[s.bannerVal, { color: colors.text }]}>
              {fmt(stats?.totalBorrowedUsd, '$')}
            </Text>
          </View>
          <View style={[s.bannerDivider, { backgroundColor: colors.border }]} />
          <View style={s.bannerItem}>
            <Text style={[s.bannerLabel, { color: colors.text2 }]}>Active Loans</Text>
            <Text style={[s.bannerVal, { color: colors.text }]}>{stats?.activeLoans ?? 0}</Text>
          </View>
          <View style={[s.bannerDivider, { backgroundColor: colors.border }]} />
          <View style={s.bannerItem}>
            <Text style={[s.bannerLabel, { color: colors.text2 }]}>Avg APR</Text>
            <Text style={[s.bannerVal, { color: colors.text }]}>
              {(stats?.avgInterestRate ?? 0).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* ── Section Title + Filter Tabs ── */}
        <View style={[s.section, { paddingHorizontal: Spacing[4] }]}>
          <Text style={[s.sectionTitle, { color: colors.text }]}>Your Loans</Text>

          <View style={s.tabRow}>
            {([
              { key: 'ALL',       label: `All (${allCount})` },
              { key: 'ACTIVE',    label: `Active (${activeCount})` },
              { key: 'COMPLETED', label: `Completed (${completedCount})` },
            ] as { key: FilterTab; label: string }[]).map(t => {
              const active = filter === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[
                    s.tabBtn,
                    { borderColor: active ? GREEN : colors.border },
                    active && { backgroundColor: `${GREEN}18` },
                  ]}
                  onPress={() => { setFilter(t.key); setSelLoan(null); }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.tabTxt, { color: active ? GREEN : colors.text2 }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Loan Cards ── */}
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="document-outline" size={40} color={colors.text3} />
              <Text style={[s.emptyText, { color: colors.text2 }]}>No loans found</Text>
            </View>
          ) : (
            filtered.map(loan => (
              <LoanCard
                key={loan._id}
                loan={loan}
                colors={colors}
                onPress={() => setSelLoan(selLoan?._id === loan._id ? null : loan)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Manage Loan CTA ── */}
      {filtered.length > 0 && (
        <View style={[s.ctaWrap, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bg, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[s.ctaBtn, { backgroundColor: selLoan ? colors.orange : `${colors.orange}60` }]}
            onPress={handleManage}
            disabled={!selLoan}
            activeOpacity={0.85}
          >
            <Ionicons name="options-outline" size={18} color="#fff" />
            <Text style={s.ctaBtnText}>
              {selLoan ? `Manage Loan` : 'Select a Loan to Manage'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:         { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle:  { flex: 1, textAlign: 'center', fontSize: Typography.lg, fontWeight: '700' },
  iconBtn:      { width: 38, height: 38, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },

  // Stats Banner
  statsBanner:  { flexDirection: 'row', marginHorizontal: Spacing[4], marginTop: Spacing[4], borderRadius: Radius.xl, borderWidth: 1, padding: Spacing[4] },
  bannerItem:   { flex: 1, alignItems: 'center' },
  bannerLabel:  { fontSize: Typography.xs, fontWeight: '500', marginBottom: 4 },
  bannerVal:    { fontSize: Typography.md, fontWeight: '700' },
  bannerDivider:{ width: 1, alignSelf: 'stretch' },

  // Section
  section:      { paddingTop: Spacing[5] },
  sectionTitle: { fontSize: Typography['2xl'], fontWeight: '700', marginBottom: Spacing[4] },

  // Filter tabs
  tabRow:       { flexDirection: 'row', gap: 8, marginBottom: Spacing[4] },
  tabBtn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1.5 },
  tabTxt:       { fontSize: Typography.sm, fontWeight: '600' },

  // Loan Card
  card:         { borderRadius: Radius['2xl'], borderWidth: 1, marginBottom: 12, overflow: 'hidden' },
  cardRow:      { flexDirection: 'row', alignItems: 'center', padding: Spacing[4] },

  assetIcons:   { flexDirection: 'row', alignItems: 'center', position: 'relative' },
  assetBadge:   { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  assetBadgeRight: { marginLeft: -10 },
  assetBadgeText: { fontSize: 11, fontWeight: '700' },
  swapIcon:     { position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#1A3540', alignItems: 'center', justifyContent: 'center' },

  pairTitle:    { fontSize: Typography.base, fontWeight: '700' },
  pairDate:     { fontSize: Typography.xs, marginTop: 2 },

  statusBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full, borderWidth: 1.5 },
  statusText:   { fontSize: 11, fontWeight: '700' },

  dividerRow:   { flexDirection: 'row', borderTopWidth: 1, padding: Spacing[4] },
  halfCol:      { flex: 1 },
  vertDivider:  { width: 1, marginHorizontal: Spacing[3] },
  miniLabel:    { fontSize: Typography.xs, marginBottom: 4 },
  bigVal:       { fontSize: Typography.md, fontWeight: '700' },
  subVal:       { fontSize: Typography.xs, marginTop: 2 },

  statsRow:     { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 12, paddingHorizontal: Spacing[4] },
  statItem:     { flex: 1, alignItems: 'center' },
  statLabel:    { fontSize: 10, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
  statVal:      { fontSize: Typography.base, fontWeight: '700' },

  // Empty
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: Typography.base, fontWeight: '500' },

  // CTA
  ctaWrap:      { paddingHorizontal: Spacing[4], paddingTop: 12, borderTopWidth: 1 },
  ctaBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: Radius.xl },
  ctaBtnText:   { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});