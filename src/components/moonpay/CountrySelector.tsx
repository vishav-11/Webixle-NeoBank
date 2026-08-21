// components/moonpay/CountrySelector.tsx
import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useMoonPayCountries } from '@/hooks/queires';
import type { MoonPayCountry } from '@/services/moonpayService';

interface Props {
  visible:    boolean;
  mode:       'buy' | 'sell';
  selected?:  string;          // alpha2 code e.g. 'US'
  onSelect:   (country: MoonPayCountry) => void;
  onClose:    () => void;
}

const ITEM_HEIGHT = 60;

// alpha2 → flag emoji
function getFlagEmoji(alpha2: string): string {
  if (!alpha2 || alpha2.length !== 2) return '🏳️';
  const codePoints = alpha2
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function CountrySelector({ visible, mode, selected, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const GREEN = colors.green;

  const [search, setSearch] = useState('');

  // ── Fetch countries ───────────────────────────────────────────────────────
  const { data: allCountries = [], isLoading } = useMoonPayCountries();

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const modeFiltered = allCountries.filter(c =>
      mode === 'buy' ? c.isBuyAllowed : c.isSellAllowed
    );

    if (!search.trim()) return modeFiltered;

    const q = search.toLowerCase();
    return modeFiltered.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.alpha2.toLowerCase().includes(q) ||
      c.alpha3.toLowerCase().includes(q)
    );
  }, [allCountries, mode, search]);

  // ── Render item ───────────────────────────────────────────────────────────
  const renderItem = useCallback(({ item }: { item: MoonPayCountry }) => {
    const isSelected = item.alpha2 === selected;
    const flag = getFlagEmoji(item.alpha2);

    return (
      <TouchableOpacity
        style={[
          cs.row,
          { borderColor: isSelected ? GREEN : colors.border },
          isSelected && { backgroundColor: `${GREEN}12` },
        ]}
        onPress={() => { onSelect(item); onClose(); setSearch(''); }}
        activeOpacity={0.8}
      >
        <Text style={cs.flag}>{flag}</Text>

        <View style={{ flex: 1 }}>
          <Text style={[cs.name, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[cs.code, { color: colors.text2 }]}>
            {item.alpha2} · {item.alpha3}
          </Text>
        </View>

        {/* Buy/Sell indicators */}
        <View style={cs.badges}>
          {item.isBuyAllowed && (
            <View style={[cs.badge, { backgroundColor: `${GREEN}20` }]}>
              <Text style={[cs.badgeTxt, { color: GREEN }]}>Buy</Text>
            </View>
          )}
          {item.isSellAllowed && (
            <View style={[cs.badge, { backgroundColor: '#627eea20' }]}>
              <Text style={[cs.badgeTxt, { color: '#627eea' }]}>Sell</Text>
            </View>
          )}
        </View>

        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={GREEN} style={{ marginLeft: 4 }} />
        )}
      </TouchableOpacity>
    );
  }, [selected, colors, GREEN, onSelect, onClose]);

  const keyExtractor = useCallback((item: MoonPayCountry) => item.alpha2, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  if (!visible) return null;

  return (
    <View style={[cs.overlay, { backgroundColor: 'rgba(0,0,0,0.75)' }]}>
      <View style={[cs.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Header */}
        <View style={cs.header}>
          <Text style={[cs.title, { color: colors.text }]}>Select Country</Text>
          <TouchableOpacity onPress={() => { onClose(); setSearch(''); }}>
            <Ionicons name="close" size={22} color={colors.text2} />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <Text style={[cs.info, { color: colors.text3 }]}>
          Countries where MoonPay {mode} is available
        </Text>

        {/* Search */}
        <View style={[cs.searchBox, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={16} color={colors.text3} />
          <TextInput
            style={[cs.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search country..."
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
        <Text style={[cs.count, { color: colors.text3 }]}>
          {filtered.length} countries available
        </Text>

        {/* List */}
        {isLoading ? (
          <View style={cs.loader}>
            <ActivityIndicator color={GREEN} size="large" />
            <Text style={[cs.loaderTxt, { color: colors.text2 }]}>
              Loading countries...
            </Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={cs.empty}>
            <Ionicons name="globe-outline" size={40} color={colors.text3} />
            <Text style={[cs.emptyTxt, { color: colors.text3 }]}>
              No countries found for "{search}"
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
            style={{ maxHeight: 420 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

const cs = StyleSheet.create({
  overlay:    { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'flex-end' },
  sheet:      {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1, padding: Spacing[4],
    paddingBottom: 36, maxHeight: '90%',
  },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title:      { fontSize: Typography.lg, fontWeight: '700' },
  info:       { fontSize: Typography.xs, marginBottom: 12 },
  searchBox:  { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, paddingHorizontal: 12, height: 44, marginBottom: 8 },
  searchInput:{ flex: 1, fontSize: Typography.base },
  count:      { fontSize: Typography.xs, marginBottom: 8, paddingHorizontal: 2 },
  row:        {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, padding: 10,
    borderRadius: Radius.xl, borderWidth: 1,
    marginBottom: 6, height: ITEM_HEIGHT,
  },
  flag:       { fontSize: 24, width: 32, textAlign: 'center' },
  name:       { fontSize: Typography.sm, fontWeight: '600' },
  code:       { fontSize: 10, marginTop: 2 },
  badges:     { flexDirection: 'row', gap: 4 },
  badge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.full },
  badgeTxt:   { fontSize: 9, fontWeight: '700' },
  loader:     { paddingVertical: 60, alignItems: 'center', gap: 12 },
  loaderTxt:  { fontSize: Typography.sm },
  empty:      { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTxt:   { fontSize: Typography.sm, textAlign: 'center' },
});