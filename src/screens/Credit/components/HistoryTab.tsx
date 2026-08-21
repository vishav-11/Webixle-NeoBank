import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from '@/styles/theme';
import { creditService } from '@/services/creditService';
import { HistorySkeleton } from '../skeletons/Skeletons';
import type { CreditTransaction, TxFilter } from '@/types/credit';

// ── Filter chips ──────────────────────────────────────────────────────────────

const FILTERS: { id: TxFilter; label: string }[] = [
  { id: 'all',         label: 'All'         },
  { id: 'borrow',      label: 'Borrow'      },
  { id: 'repay',       label: 'Repay'       },
  { id: 'interest',    label: 'Interest'    },
  { id: 'liquidation', label: 'Liquidation' },
];

// ── Tx Row ────────────────────────────────────────────────────────────────────

const TxRow = React.memo(function TxRow({
  tx, colors,
}: {
  tx: CreditTransaction;
  colors: ColorScheme;
}) {
  const isCredit = tx.direction === 'credit';
  const iconBg   = isCredit ? colors.primaryDim : colors.redDim;
  const iconColor = isCredit ? colors.primary : colors.red;
  const amtColor  = isCredit ? colors.primary : colors.red;
  const amtPrefix = isCredit ? '+' : '-';

  const date = new Date(tx.createdAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[row.wrap, { borderBottomColor: colors.borderSoft }]}>
      <View style={[row.icon, { backgroundColor: iconBg }]}>
        <Ionicons
          name={isCredit ? 'chevron-up' : 'chevron-down'}
          size={IconSize.sm}
          color={iconColor}
        />
      </View>
      <View style={{ flex: 1, marginLeft: Spacing[3] }}>
        <Text style={[row.label, { color: colors.text }]}>{tx.label}</Text>
        <Text style={[row.date, { color: colors.text2 }]}>{dateStr}</Text>
      </View>
      <Text style={[row.amt, { color: amtColor }]}>
        {amtPrefix}${tx.amountUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
});

const row = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[4], borderBottomWidth: 1 },
  icon:  { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  date:  { fontSize: Typography.xs, marginTop: 3 },
  amt:   { fontSize: Typography.base, fontWeight: Typography.bold },
});

// ── HistoryTab ────────────────────────────────────────────────────────────────

interface Props { bottomPad: number; }

export default function HistoryTab({ bottomPad }: Props) {
  const { colors } = useTheme();

  const [filter,     setFilter]     = useState<TxFilter>('all');
  const [txns,       setTxns]       = useState<CreditTransaction[]>([]);
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [loadingMore,setLoadingMore]= useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const abortRef = useRef(false);

  const load = useCallback(async (f: TxFilter, p: number, append = false) => {
    if (p === 1) { append ? null : setLoading(true); }
    else         { setLoadingMore(true); }

    try {
      const res = await creditService.getTransactions(f, p);
      if (abortRef.current) return;
      setTxns(prev => append ? [...prev, ...res.data] : res.data);
      setTotalPages(res.totalPages);
      setPage(p);
    } catch { /* silent */ }
    finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  // Load on filter change
  useEffect(() => {
    abortRef.current = false;
    setTxns([]);
    setPage(1);
    load(filter, 1, false);
    return () => { abortRef.current = true; };
  }, [filter]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    creditService.bustAll();
    load(filter, 1, false);
  }, [filter]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || page >= totalPages) return;
    load(filter, page + 1, true);
  }, [loadingMore, page, totalPages, filter]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading && txns.length === 0) return <HistorySkeleton />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={txns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[ht.list, { paddingBottom: bottomPad }]}

        // Header = filter chips + section title
        ListHeaderComponent={
          <View style={{ gap: Spacing[3] }}>
            {/* Filter chips */}
            <FlatList
              data={FILTERS}
              horizontal
              keyExtractor={f => f.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={ht.chips}
              renderItem={({ item: f }) => {
                const active = f.id === filter;
                return (
                  <TouchableOpacity
                    style={[
                      ht.chip,
                      {
                        backgroundColor: active ? colors.primary       : colors.surface,
                        borderColor:     active ? colors.primaryBorder : colors.border,
                      },
                    ]}
                    onPress={() => setFilter(f.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      ht.chipTxt,
                      { color: active ? '#fff' : colors.text2 },
                      active && { fontWeight: Typography.bold },
                    ]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            {/* Section title */}
            <View style={ht.sectionTitle}>
              <Ionicons name="time-outline" size={IconSize.sm} color={colors.text2} />
              <Text style={[ht.sectionTxt, { color: colors.text }]}>
                Transaction History
              </Text>
            </View>
          </View>
        }

        renderItem={({ item }) => <TxRow tx={item} colors={colors} />}

        // Empty state
        ListEmptyComponent={
          <View style={ht.empty}>
            <View style={[ht.emptyIconBox, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="receipt-outline" size={IconSize.xl} color={colors.primary} />
            </View>
            <Text style={[ht.emptyTitle, { color: colors.text }]}>
              No transactions found
            </Text>
            <Text style={[ht.emptyTxt, { color: colors.text2 }]}>
              Your transaction history will appear here
            </Text>
          </View>
        }

        // Pagination footer
        ListFooterComponent={
          loadingMore
            ? <ActivityIndicator color={colors.primary} style={{ padding: Spacing[4] }} />
            : null
        }

        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }

        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const ht = StyleSheet.create({
  list:         { padding: Spacing[4], gap: Spacing[3] },
  chips:        { gap: Spacing[2], paddingBottom: Spacing[1] },
  chip:         { paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5 },
  chipTxt:      { fontSize: Typography.sm, fontWeight: Typography.semibold },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  sectionTxt:   { fontSize: Typography.base, fontWeight: Typography.bold },
  empty:        { alignItems: 'center', paddingVertical: Spacing[16], gap: Spacing[3] },
  emptyIconBox: { 
    width: 72, 
    height: 72, 
    borderRadius: Radius['2xl'], 
    alignItems: 'center', 
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  emptyTitle:   { fontSize: Typography.base, fontWeight: Typography.bold },
  emptyTxt:     { fontSize: Typography.sm },
});