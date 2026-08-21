import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from '@/styles/theme';
import { DashboardSkeleton } from '../skeletons/Skeletons';
import type { CreditAccount, SupportedAsset, CreditRisk } from '@/types/credit';

// ✅ Risk color mapping — theme aware
const getRiskColor = (level: string, colors: ColorScheme): string => {
  const map: Record<string, keyof ColorScheme> = {
    Safe:    'primary',
    Healthy: 'primary',
    Warning: 'orange',
    Danger:  'red',
  };
  return colors[map[level] ?? 'primary'] as string;
};

const COIN_COLORS: Record<string, [string, string]> = {
  USDT: ['#26A17B', '#1A8A66'],
  ETH:  ['#627EEA', '#4A6DD8'],
  BTC:  ['#F7931A', '#E8830A'],
  BNB:  ['#F5A623', '#E09510'],
  TRX:  ['#EF0027', '#CC0022'],
};

const getCoinColors = (sym: string): [string, string] =>
  COIN_COLORS[sym?.toUpperCase()] ?? ['#334155', '#1E293B'];

const safeNum = (v: any, fallback = 0): number => {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
};

const fmt = (n?: number, d = 2) =>
  safeNum(n).toLocaleString('en-US', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const fmtUsd = (n?: number) => `$${fmt(n)}`;

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label, value, valueColor, colors,
}: {
  label: string;
  value: string;
  valueColor?: string;
  colors: ColorScheme;
}) {
  return (
    <View style={[stat.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[stat.label, { color: colors.text2 }]}>{label}</Text>
      <Text style={[stat.value, { color: valueColor ?? colors.text }]}>{value}</Text>
    </View>
  );
}

const stat = StyleSheet.create({
  card:  { flex: 1, borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[2] },
  label: { fontSize: Typography.xs },
  value: { fontSize: Typography.lg, fontWeight: Typography.bold },
});

// ── Asset Row ──────────────────────────────────────────────────────────────────

function AssetRow({
  asset, colors, onAdd,
}: {
  asset: SupportedAsset;
  colors: ColorScheme;
  onAdd: (a: SupportedAsset) => void;
}) {
  return (
    <TouchableOpacity style={ar.row} onPress={() => onAdd(asset)} activeOpacity={0.75}>
      <LinearGradient colors={getCoinColors(asset.symbol)} style={ar.icon}>
        <Text style={ar.iconTxt}>{asset.symbol.slice(0, 2)}</Text>
      </LinearGradient>

      <View style={{ flex: 1, marginLeft: Spacing[3] }}>
        <Text style={[ar.sym, { color: colors.text }]}>{asset.symbol}</Text>
        <Text style={[ar.meta, { color: colors.text2 }]}>
          {asset.chainId} · {safeNum(asset.ltv)}% LTV · {safeNum(asset.apr).toFixed(2)}% APR
        </Text>
        <View style={ar.balRow}>
          <Ionicons name="wallet-outline" size={IconSize.xs} color={colors.primary} />
          <Text style={[ar.bal, { color: colors.primary }]}>
            {fmt(asset.balance, 0)} {asset.symbol} = {fmtUsd(asset.balanceUsd)}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[ar.addBtn, {
          borderColor: colors.primaryBorder,
          backgroundColor: colors.primaryDim,
        }]}
        onPress={() => onAdd(asset)}
        activeOpacity={0.7}
      >
        <Ionicons name="add" size={IconSize.xs} color={colors.primary} />
        <Text style={[ar.addTxt, { color: colors.primary }]}>Add</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const ar = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[3] },
  icon:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  iconTxt:{ fontSize: Typography.xs, fontWeight: Typography.bold, color: '#fff' },
  sym:    { fontSize: Typography.sm, fontWeight: Typography.bold },
  meta:   { fontSize: Typography.xs, marginTop: 2 },
  balRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginTop: 3 },
  bal:    { fontSize: Typography.xs },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full, borderWidth: 1 },
  addTxt: { fontSize: Typography.xs, fontWeight: Typography.bold },
});

// ── LIV Ratio Card ────────────────────────────────────────────────────────────

function LivRatioCard({ risk, colors }: { risk: CreditRisk; colors: ColorScheme }) {
  const riskColor  = getRiskColor(risk.level, colors);
  const barPercent = Math.min(safeNum(risk.livRatio), 100);

  return (
    <View style={[lv.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header row: "LIV Ratio" + risk badge */}
      <View style={lv.header}>
        <Text style={[lv.title, { color: colors.text }]}>LIV Ratio</Text>
        {/* badge background may be a string or an array in the theme; normalize to a string */}
        {(() => {
          const v = colors[`${risk.level.toLowerCase()}Dim` as keyof ColorScheme];
          const bg = Array.isArray(v) ? (v[0] as string) : (v as string | undefined) ?? `${riskColor}20`;
          return (
            <View style={[lv.badge, { backgroundColor: bg }]}>
              <Text style={[lv.badgeTxt, { color: riskColor }]}>{risk.level}</Text>
            </View>
          );
        })()}
        
      </View>

      {/* Big ratio number */}
      <Text style={[lv.ratio, { color: riskColor }]}>{safeNum(risk.livRatio).toFixed(2)}%</Text>

      {/* Progress Bar */}
      <View style={[lv.track, { backgroundColor: colors.primary }]}>
        <View style={[lv.fill, { width: `${barPercent}%` as any, backgroundColor: riskColor }]} />
      </View>

      {/* Message */}
      <Text style={[lv.msg, { color: colors.text2 }]}>{risk.message}</Text>

      {/* Divider */}
      <View style={[lv.divider, { borderTopColor: colors.borderSoft }]} />

      {/* Safe Borrow Limit */}
      <View style={lv.row}>
        <Text style={[lv.rowLabel, { color: colors.text2 }]}>Safe Borrow Limit</Text>
        <Text style={[lv.rowVal, { color: colors.primary }]}>{fmtUsd(risk.safeBorrowLimit)}</Text>
      </View>

      {/* Liquidation Price */}
      <View style={lv.row}>
        <Text style={[lv.rowLabel, { color: colors.text2 }]}>Liquidation Price</Text>
        <Text style={[lv.rowVal, { color: colors.red }]}>{fmtUsd(risk.liquidationPrice)}</Text>
      </View>
    </View>
  );
}

const lv = StyleSheet.create({
  card:     { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[2] },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontSize: Typography.base, fontWeight: Typography.bold },
  badge:    { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  badgeTxt: { fontSize: Typography.xs, fontWeight: Typography.bold },
  ratio:    { fontSize: 28, fontWeight: Typography.bold },
  track:    { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill:     { height: '100%', borderRadius: 4 },
  msg:      { fontSize: Typography.xs },
  divider:  { borderTopWidth: 1, marginVertical: Spacing[1] },
  row:      { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: Typography.sm },
  rowVal:   { fontSize: Typography.sm, fontWeight: Typography.semibold },
});

// ── Dashboard Tab ──────────────────────────────────────────────────────────────

interface Props {
  account:    CreditAccount | null;
  assets:     SupportedAsset[];
  risk:       CreditRisk | null;
  loading:    boolean;
  refreshing: boolean;
  onRefresh:  () => void;
  onAddAsset: (a: SupportedAsset) => void;
  bottomPad:  number;
}

export default function DashboardTab({
  account, assets, risk, loading, refreshing, onRefresh, onAddAsset, bottomPad,
}: Props) {
  const { colors } = useTheme();

  if (loading && !account) return <DashboardSkeleton />;

  const usedPct = account
    ? Math.min((account.usedCredit / account.creditLimit) * 100, 100)
    : 0;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[ds.scroll, { paddingBottom: bottomPad }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* ── Credit Limit Card ── */}
      {account && (
        <View style={[ds.limitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[ds.limitLabel, { color: colors.text2 }]}>Credit Limit</Text>
          <Text style={[ds.limitAmount, { color: colors.text }]}>
            {fmtUsd(account.creditLimit)}
          </Text>

          <View style={ds.limitRow}>
            <View>
              <Text style={[ds.subLabel, { color: colors.text2 }]}>Available</Text>
              <Text style={[ds.subVal, { color: colors.primary }]}>
                {fmtUsd(account.availableCredit)}
              </Text>
            </View>
            <Text style={[ds.usedText, { color: colors.primary }]}>
              {fmtUsd(account.usedCredit)} used of {fmtUsd(account.creditLimit)}
            </Text>
          </View>

          {/* Usage bar */}
          <View style={[ds.track, { backgroundColor: colors.primary}]}>
            <View style={[
              ds.trackFill,
              { width: `${usedPct}%` as any, backgroundColor: colors.primary },
            ]} />
          </View>
        </View>
      )}

      {/* ── 2×2 Stats grid ── */}
      {account && (
        <View style={ds.grid2}>
          <View style={ds.gridRow}>
            <StatCard
              label="Used credit"
              value={fmtUsd(account.usedCredit)}
              colors={colors}
            />
            <StatCard
              label="Interest Rate"
              value={`${safeNum(account.interestRate).toFixed(2)}%`}
              colors={colors}
            />
          </View>
          <View style={ds.gridRow}>
            <StatCard
              label="Accrued Interest"
              value={fmtUsd(account.accruedInterest)}
              valueColor={account.accruedInterest > 0 ? colors.red : colors.text}
              colors={colors}
            />
            <StatCard
              label="Risk Level"
              value={account.riskLevel}
              valueColor={getRiskColor(account.riskLevel, colors)}
              colors={colors}
            />
          </View>
        </View>
      )}

      {/* ── Increase Your Limit ── */}
      {assets.length > 0 && (
        <View style={[ds.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={ds.sectionHeader}>
            <Text style={[ds.sectionTitle, { color: colors.text }]}>Increase Your Limit</Text>
            <View style={[ds.assetBadge, { backgroundColor: colors.primaryDim }]}>
              <Text style={[ds.assetBadgeTxt, { color: colors.primary }]}>
                {assets.length} Asset{assets.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <Text style={[ds.sectionSub, { color: colors.text2 }]}>
            Add collateral from your wallet to unlock a higher credit limit.
          </Text>

          {assets.map((a, i) => (
            <React.Fragment key={a.id}>
              {i > 0 && <View style={[ds.sep, { backgroundColor: colors.borderSoft }]} />}
              <AssetRow asset={a} colors={colors} onAdd={onAddAsset} />
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── LIV Ratio ── */}
      {risk && <LivRatioCard risk={risk} colors={colors} />}
    </ScrollView>
  );
}

const ds = StyleSheet.create({
  scroll:       { padding: Spacing[4], gap: Spacing[3] },
  limitCard:    { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[2] },
  limitLabel:   { fontSize: Typography.sm },
  limitAmount:  { fontSize: Typography['3xl'], fontWeight: Typography.bold },
  limitRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  subLabel:     { fontSize: Typography.xs },
  subVal:       { fontSize: Typography.base, fontWeight: Typography.bold },
  usedText:     { fontSize: Typography.xs, textAlign: 'right', flex: 1, marginLeft: Spacing[3] },
  track:        { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: Spacing[1] },
  trackFill:    { height: '100%', borderRadius: 3 },
  grid2:        { gap: Spacing[3] },
  gridRow:      { flexDirection: 'row', gap: Spacing[3] },
  section:      { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[1] },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: Typography.base, fontWeight: Typography.bold },
  assetBadge:   { paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  assetBadgeTxt:{ fontSize: Typography.xs, fontWeight: Typography.semibold },
  sectionSub:   { fontSize: Typography.xs, marginBottom: Spacing[1] },
  sep:          { height: 1 },
});