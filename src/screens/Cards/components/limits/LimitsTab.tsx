/**
 * LimitsTab.tsx
 * "Limits" tab — matches PDF: 4 limit cards (Per Tx / Monthly / Yearly / Daily)
 * + category spending bars (Shopping, Travel, Groceries, Food, Entertainment, Gas).
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import {
  TrendingUp,
  Calendar,
  BarChart2,
  ShoppingBag,
  Plane,
  ShoppingCart,
  Utensils,
  Smile,
  Fuel,
} from 'lucide-react-native';
import type { NormalizedCard, CardLimitItem } from '@/types/cardTypes';
import type { ColorScheme } from '@/styles/theme';
import cardService from '@/services/cardService';

interface Props {
  activeCard: NormalizedCard | null;
  colors:     ColorScheme;
}

interface CategoryRow {
  icon:       any;
  name:       string;
  amount:     number;
  percentage: number;
}

const MOCK_CATEGORIES: CategoryRow[] = [
  { icon: ShoppingBag, name: 'Shopping',      amount: 1250, percentage: 32.9 },
  { icon: Plane,       name: 'Travel',        amount: 1250, percentage: 32.9 },
  { icon: ShoppingCart,name: 'Groceries',     amount: 1250, percentage: 32.9 },
  { icon: Utensils,    name: 'Food',          amount: 1250, percentage: 32.9 },
  { icon: Smile,       name: 'Entertainment', amount: 1250, percentage: 32.9 },
  { icon: Fuel,        name: 'Gas',           amount: 1250, percentage: 32.9 },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

export default function LimitsTab({ activeCard, colors }: Props) {
  const [limits,  setLimits]  = useState<CardLimitItem | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeCard?.cardId) return;
    setLoading(true);
    cardService
      .getCardLimit(activeCard.cardId)
      .then(setLimits)
      .catch(() => setLimits(null))
      .finally(() => setLoading(false));
  }, [activeCard?.cardId]);

  const perTx    = limits?.tradeQuotaAmt  ?? 15_000;
  const monthly  = limits?.monthQuotaAmt  ?? 1_000_000;
  const yearly   = limits?.yearQuotaAmt   ?? 2_000_000;
  const daily    = limits?.dayQuotaAmt    ?? 1_000_000;

  const LIMIT_CARDS = [
    { icon: TrendingUp,  label: 'Per Transaction', value: perTx,   bg: colors.orange + '33' },
    { icon: Calendar,    label: 'Monthly Limit',   value: monthly,  bg: colors.green  + '22' },
    { icon: BarChart2,   label: 'Yearly Limit',    value: yearly,   bg: colors.green  + '22' },
    { icon: TrendingUp,  label: 'Daily Limit',     value: daily,    bg: colors.green  + '22' },
  ];

  if (loading) {
    return (
      <View style={s.loader}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container} nestedScrollEnabled>
      <Text style={[s.sectionTitle, { color: colors.text }]}>Spending Limits</Text>

      {/* 2×2 Limit Cards */}
      <View style={s.grid}>
        {LIMIT_CARDS.map(({ icon: Icon, label, value, bg }) => (
          <View
            key={label}
            style={[s.limitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[s.limitIconWrap, { backgroundColor: bg }]}>
              <Icon size={20} color={bg.includes(colors.orange.slice(0, 7)) ? colors.orange : colors.green} />
            </View>
            <Text style={[s.limitValue, { color: colors.text }]}>{fmt(value)}</Text>
            <Text style={[s.limitLabel, { color: colors.text2 }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Category Rows */}
      {MOCK_CATEGORIES.map(({ icon: Icon, name, amount, percentage }) => (
        <View key={name} style={s.catRow}>
          <View style={s.catHeader}>
            <View style={s.catLeft}>
              <Icon size={16} color={colors.text2} />
              <Text style={[s.catName, { color: colors.text }]}>{name}</Text>
            </View>
            <View style={s.catRight}>
              <Text style={[s.catAmt,  { color: colors.text }]}>${amount.toLocaleString()}</Text>
              <Text style={[s.catPct,  { color: colors.text3 }]}>{percentage}%</Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={[s.barTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                s.barFill,
                { width: `${percentage}%`, backgroundColor: colors.orange },
              ]}
            />
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:    { paddingBottom: 24 },
  loader:       { paddingVertical: 40, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  limitCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'flex-start',
  },
  limitIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  limitValue: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  limitLabel: { fontSize: 12 },

  // Categories
  catRow: { marginBottom: 18 },
  catHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  catLeft:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catRight: { alignItems: 'flex-end' },
  catName:  { fontSize: 15, fontWeight: '500' },
  catAmt:   { fontSize: 14, fontWeight: '600' },
  catPct:   { fontSize: 11, marginTop: 1 },
  barTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill:  { height: 6, borderRadius: 3 },
});
