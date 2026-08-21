// CardModule/screens/CardTransactionsScreen.tsx

import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useCards, useCardTransactions } from '../hooks';
import { STATUS_META } from '../constants';
import type { CardTransaction } from '../types';

const PAGE_LIMIT = 30;

function txStatusTone(status?: string) {
  const s = (status ?? '').toUpperCase();
  const meta = STATUS_META[s];
  return meta?.tone ?? 'neutral';
}

function formatAmount(amount?: string, currency?: string) {
  if (amount == null || amount === '') return '--';
  const n = parseFloat(amount);
  if (Number.isNaN(n)) return `${amount} ${currency ?? ''}`.trim();
  const sign = n < 0 ? '-' : '+';
  return `${sign}$ ${Math.abs(n).toFixed(2)}`;
}

function formatDate(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return (
    d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' • ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  );
}

// Optional `cardId` prop: pass it to scope the list to one card (e.g. from
// a per-card "View transactions" action). Omit it to show every card's
// transactions, each row labelled with its own card.
export default function CardTransactionsScreen({
  onBack,
  cardId,
}: {
  onBack: () => void;
  cardId?: string;
}) {
  const { colors } = useTheme();
  const { scrollPaddingBottom } = useLayout();
  const [refreshing, setRefreshing] = useState(false);

  const { data: cardsData } = useCards();
  const cards = cardsData?.items ?? [];
  const cardMap = useMemo(() => {
    const m = new Map<string, (typeof cards)[number]>();
    cards.forEach((c) => m.set(c.id, c));
    return m;
  }, [cards]);

  const query = cardId ? { cardId, limit: PAGE_LIMIT } : { limit: PAGE_LIMIT };
  const { data, isLoading, isFetching, refetch } = useCardTransactions(query);
  const transactions = data?.items ?? [];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: CardTransaction }) => {
    const card = item.cardId ? cardMap.get(item.cardId) : undefined;
    const tone = txStatusTone(item.status);
    const toneColor =
      tone === 'success' ? colors.green
        : tone === 'pending' ? colors.orange
          : tone === 'error' ? colors.red
            : colors.text2;
    const toneBg =
      tone === 'success' ? colors.greenDim
        : tone === 'pending' ? colors.orangeDim
          : tone === 'error' ? colors.redDim
            : colors.cardHover;

    const amountText = formatAmount(item.amount, item.currency);
    const isNegative = amountText.startsWith('-');

    return (
      <View style={[S.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[S.iconBox, { backgroundColor: colors.cardHover }]}>
          <Ionicons name="card-outline" size={18} color={colors.text2} />
        </View>

        <View style={S.rowMain}>
          <View style={S.rowTop}>
            <Text style={[S.txType, { color: colors.text }]} numberOfLines={1}>
              {item.description || item.merchantName || item.type || 'Card transaction'}
            </Text>
            <Text style={[S.txAmount, { color: isNegative ? colors.text : colors.green }]}>
              {amountText}
            </Text>
          </View>

          <View style={S.rowBottom}>
            <Text style={[S.cardLabel, { color: colors.text2 }]} numberOfLines={1}>
              {card
                ? `${card.typeLabel ?? 'Card'} •••• ${card.last4}`
                : item.cardId
                  ? `Card •••• ${String(item.cardId).slice(-4)}`
                  : 'Unknown card'}
            </Text>
            <View style={[S.statusPill, { backgroundColor: toneBg }]}>
              <Text style={[S.statusText, { color: toneColor }]}>{item.status ?? '—'}</Text>
            </View>
          </View>

          {!!item.createTime && (
            <Text style={[S.date, { color: colors.text3 }]}>{formatDate(item.createTime)}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <View style={S.header}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.text }]}>Card Transactions</Text>
        <View style={{ width: 32 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing[8] }} />
      ) : transactions.length === 0 ? (
        <View style={S.emptyWrap}>
          <Ionicons name="receipt-outline" size={40} color={colors.text3} />
          <Text style={[S.emptyText, { color: colors.text2 }]}>No transactions yet</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t, i) => t.id ?? String(i)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: Spacing[4],
            paddingBottom: scrollPaddingBottom,
            gap: Spacing[3],
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || (isFetching && !isLoading)}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
  },
  backBtn: { width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: Spacing[3] },
  emptyText: { fontSize: Typography.sm, fontWeight: '500' },
  row: {
    flexDirection: 'row',
    gap: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[3],
  },
  iconBox: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing[2] },
  txType: { flex: 1, fontSize: Typography.sm, fontWeight: '700' },
  txAmount: { fontSize: Typography.sm, fontWeight: '800' },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing[2] },
  cardLabel: { flex: 1, fontSize: Typography.xs, fontWeight: '500' },
  statusPill: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
  statusText: { fontSize: 10, fontWeight: '700' },
  date: { fontSize: 10, fontWeight: '500' },
});