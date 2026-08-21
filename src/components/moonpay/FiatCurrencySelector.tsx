// components/moonpay/FiatCurrencySelector.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useMoonPayFiatCurrencies } from '@/hooks/queires';
import type { MoonPayFiatCurrency } from '@/services/moonpayService';

interface Props {
  visible:       boolean;
  mode:          'buy' | 'sell';   // buy = isBuySupported, sell = isSellSupported
  selected:      string;           // selected currency code e.g. 'usd'
  onSelect:      (currency: MoonPayFiatCurrency) => void;
  onClose:       () => void;
}

const ITEM_HEIGHT = 64;

export function FiatCurrencySelector({
  visible, mode, selected, onSelect, onClose,
}: Props) {
  const { colors } = useTheme();
  const GREEN = colors.green;

  const [search, setSearch] = useState('');

  // ── Fetch fiat currencies ─────────────────────────────────────────────────
  const { data: allFiats = [], isLoading } = useMoonPayFiatCurrencies();

  // ── Filter: mode ke hisab se + search ────────────────────────────────────
  const filtered = useMemo(() => {
    const modeFiltered = allFiats.filter(c =>
      mode === 'buy' ? c.isBuySupported : c.isSellSupported
    );

    if (!search.trim()) return modeFiltered;

    const q = search.toLowerCase();
    return modeFiltered.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    );
  }, [allFiats, mode, search]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: MoonPayFiatCurrency }) => {
    const isSelected = item.code.toLowerCase() === selected.toLowerCase();
    return (
      <TouchableOpacity
        style={[
          fcs.row,
          { borderColor: isSelected ? GREEN : colors.border },
          isSelected && { backgroundColor: `${GREEN}12` },
        ]}
        onPress={() => { onSelect(item); onClose(); setSearch(''); }}
        activeOpacity={0.8}
      >
        {/* Flag + Code */}
        <View style={fcs.left}>
          <Text style={fcs.flag}>{item.flagEmoji ?? '🏳️'}</Text>
          <View>
            <Text style={[fcs.code, { color: colors.text }]}>
              {item.code.toUpperCase()}
            </Text>
            <Text style={[fcs.name, { color: colors.text2 }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>

        {/* Symbol + Check */}
        <View style={fcs.right}>
          <Text style={[fcs.symbol, { color: colors.text2 }]}>
            {item.symbol ?? item.code.toUpperCase()}
          </Text>
          {isSelected && (
            <Ionicons name="checkmark-circle" size={18} color={GREEN} />
          )}
        </View>
      </TouchableOpacity>
    );
  }, [selected, colors, GREEN, onSelect, onClose]);

  const keyExtractor = useCallback((item: MoonPayFiatCurrency) => item.code, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  if (!visible) return null;

  return (
    <View style={[fcs.overlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
      <View style={[fcs.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Header */}
        <View style={fcs.header}>
          <Text style={[fcs.title, { color: colors.text }]}>
            {mode === 'buy' ? 'Pay With Currency' : 'Receive Currency'}
          </Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(''); }}>
            <Ionicons name="close" size={22} color={colors.text2} />
          </TouchableOpacity>
        </View>

        {/* Mode info */}
        <View style={[fcs.modeBadge, { backgroundColor: `${GREEN}15` }]}>
          <Ionicons
            name={mode === 'buy' ? 'card-outline' : 'cash-outline'}
            size={14}
            color={GREEN}
          />
          <Text style={[fcs.modeText, { color: GREEN }]}>
            {mode === 'buy'
              ? 'Currencies accepted for payment'
              : 'Currencies you can receive'}
          </Text>
        </View>

        {/* Search */}
        <View style={[fcs.searchBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={16} color={colors.text3} />
          <TextInput
            style={[fcs.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search currency..."
            placeholderTextColor={colors.text3}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.text3} />
            </TouchableOpacity>
          )}
        </View>

        {/* Count */}
        <Text style={[fcs.count, { color: colors.text3 }]}>
          {filtered.length} currencies available
        </Text>

        {/* List */}
        {isLoading ? (
          <View style={fcs.loader}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={[fcs.loaderTxt, { color: colors.text2 }]}>
              Loading currencies...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={fcs.empty}>
            <Ionicons name="search-outline" size={40} color={colors.text3} />
            <Text style={[fcs.emptyTxt, { color: colors.text3 }]}>
              No currencies found for "{search}"
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={20}
            windowSize={5}
            style={{ maxHeight: 400 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

const fcs = StyleSheet.create({
  overlay:    { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'flex-end' },
  sheet:      {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1, padding: Spacing[4],
    paddingBottom: 36, maxHeight: '85%',
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title:      { fontSize: Typography.lg, fontWeight: '700' },
  modeBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  modeText:   { fontSize: Typography.xs, fontWeight: '600' },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput:{ flex: 1, fontSize: Typography.base },
  count:      { fontSize: Typography.xs, marginBottom: 8, paddingHorizontal: 2 },
  row:        {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12, borderRadius: Radius.xl,
    borderWidth: 1, marginBottom: 6,
    height: ITEM_HEIGHT,
  },
  left:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  flag:       { fontSize: 24 },
  code:       { fontSize: Typography.base, fontWeight: '700' },
  name:       { fontSize: Typography.xs, marginTop: 2, maxWidth: 180 },
  right:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  symbol:     { fontSize: Typography.sm, fontWeight: '600' },
  loader:     { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loaderTxt:  { fontSize: Typography.sm },
  empty:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTxt:   { fontSize: Typography.sm, textAlign: 'center' },
});