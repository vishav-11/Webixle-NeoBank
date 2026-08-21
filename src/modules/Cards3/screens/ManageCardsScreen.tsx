// CardModule/screens/ManageCardsScreen.tsx
//
// "Manage all cards" — reached from CardSettingsSheet. Two pieces the
// per-card carousel/settings sheet doesn't cover:
//   1. Negative-balance cards (GET /cards/negative-balance) — a heads-up
//      list of cards on this account currently owing money.
//   2. Multi-select batch delete (DELETE /cards/batch-delete) — pick
//      several cards and remove them in one call.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useCards, useNegativeBalanceCards, useBatchDeleteCards } from '../hooks';
import { CARD_FACE, STATUS_META } from '../constants';
import type { CardInfo } from '../types';

function Header({ title, onBack, colors, insets }: { title: string; onBack: () => void; colors: any; insets: any }) {
  return (
    <View style={[H.row, { paddingTop: insets.top + Spacing[3] }]}>
      <TouchableOpacity onPress={onBack} hitSlop={10} style={[H.backBtn, { backgroundColor: colors.cardHover }]}>
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </TouchableOpacity>
      <Text style={[H.title, { color: colors.text }]}>{title}</Text>
      <View style={{ width: 36 }} />
    </View>
  );
}

function NegativeBalanceSection({ colors }: { colors: any }) {
  const { data: negativeCards, isLoading } = useNegativeBalanceCards(true);
  const hasNegative = !!negativeCards?.length;

  if (isLoading) {
    return <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing[4] }} />;
  }
  if (!hasNegative) return null;

  return (
    <View style={[N.card, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
      <View style={N.headerRow}>
        <Ionicons name="warning-outline" size={18} color={colors.red} />
        <Text style={[N.title, { color: colors.red }]}>
          {negativeCards!.length} card{negativeCards!.length > 1 ? 's' : ''} with negative balance
        </Text>
      </View>
      {negativeCards!.map((c) => (
        <View key={c.cardId} style={N.row}>
          <Text style={[N.label, { color: colors.text }]} numberOfLines={1}>
            {c.label || `Card •••• ${c.last4 ?? ''}`}
          </Text>
          <Text style={[N.amount, { color: colors.red }]}>
            {c.currency ?? 'USD'} {c.balance}
          </Text>
        </View>
      ))}
      <Text style={[N.hint, { color: colors.red }]}>
        Top up these cards to bring the balance back to zero and avoid restrictions.
      </Text>
    </View>
  );
}

function CardRow({
  card, selected, onToggle, colors,
}: { card: CardInfo; selected: boolean; onToggle: () => void; colors: any }) {
  const face = CARD_FACE[card.design as keyof typeof CARD_FACE] ?? CARD_FACE.virtual_black;
  const meta = STATUS_META[card.status] ?? { label: card.status, tone: 'neutral' as const };
  const toneColor =
    meta.tone === 'success' ? colors.green
    : meta.tone === 'pending' ? colors.orange
    : meta.tone === 'error' ? colors.red
    : colors.text2;

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.85}
      style={[
        RW.row,
        { backgroundColor: colors.cardHover, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <Ionicons
        name={selected ? 'checkbox' : 'square-outline'}
        size={22}
        color={selected ? colors.primary : colors.text3}
      />
      {face.image ? (
        <Image source={face.image} resizeMode="cover" style={RW.thumb} />
      ) : (
        <View style={[RW.thumb, { backgroundColor: face.chip }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[RW.name, { color: colors.text }]} numberOfLines={1}>
          {card.label || card.typeLabel}
        </Text>
        <Text style={[RW.sub, { color: colors.text2 }]}>{card.maskedNumber}</Text>
      </View>
      <Text style={[RW.status, { color: toneColor }]}>{meta.label}</Text>
    </TouchableOpacity>
  );
}

export default function ManageCardsScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout();

  const { data: cardsData, isLoading } = useCards();
  const cards = cardsData?.items ?? [];

  const batchDelete = useBatchDeleteCards();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleCard = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected([]);
    setConfirming(false);
    setError(null);
  };

  const handleDeleteSelected = () => {
    setError(null);
    batchDelete.mutate(
      { cardIds: selected },
      {
        onSuccess: () => exitSelectMode(),
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? err?.message ?? 'Could not delete selected cards.'),
      },
    );
  };

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <Header title="Manage cards" onBack={onBack} colors={colors} insets={insets} />

      <ScrollView
        contentContainerStyle={{ padding: Spacing[4], paddingBottom: scrollPaddingBottom }}
        showsVerticalScrollIndicator={false}
      >
        <NegativeBalanceSection colors={colors} />

        <View style={S.sectionHeaderRow}>
          <Text style={[S.sectionTitle, { color: colors.text }]}>
            Your cards ({cards.length})
          </Text>
          {cards.length > 0 && (
            <TouchableOpacity onPress={() => (selectMode ? exitSelectMode() : setSelectMode(true))} hitSlop={8}>
              <Text style={[S.selectToggle, { color: colors.primary }]}>
                {selectMode ? 'Cancel' : 'Select'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing[6] }} />
        ) : cards.length === 0 ? (
          <Text style={[S.empty, { color: colors.text2 }]}>You don't have any cards yet.</Text>
        ) : (
          <View style={{ gap: Spacing[3] }}>
            {cards.map((c) => (
              <CardRow
                key={c.id}
                card={c}
                selected={selected.includes(c.id)}
                onToggle={() => (selectMode ? toggleCard(c.id) : undefined)}
                colors={colors}
              />
            ))}
          </View>
        )}

        {error && (
          <View style={[S.errorBox, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
            <Text style={[S.errorText, { color: colors.red }]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {selectMode && selected.length > 0 && (
        <View style={[S.footer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: insets.bottom + Spacing[3] }]}>
          {!confirming ? (
            <TouchableOpacity
              style={[S.deleteBtn, { backgroundColor: colors.red }]}
              onPress={() => setConfirming(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="trash-outline" size={16} color="#fff" />
              <Text style={S.deleteBtnText}>
                Delete {selected.length} card{selected.length > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: Spacing[2] }}>
              <Text style={[S.confirmText, { color: colors.text2 }]}>
                This permanently removes {selected.length} card{selected.length > 1 ? 's' : ''}. This can't be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing[3] }}>
                <TouchableOpacity
                  style={[S.footerBtn, { backgroundColor: colors.cardHover }]}
                  onPress={() => setConfirming(false)}
                  disabled={batchDelete.isPending}
                >
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: Typography.sm }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.footerBtn, { backgroundColor: colors.red }]}
                  onPress={handleDeleteSelected}
                  disabled={batchDelete.isPending}
                >
                  {batchDelete.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.sm }}>Confirm delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const H = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingBottom: Spacing[3] },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: Typography.base, fontWeight: '800' },
});

const N = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: Spacing[4], marginBottom: Spacing[5] },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing[3] },
  title: { fontSize: Typography.sm, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  label: { fontSize: Typography.xs, flex: 1, marginRight: Spacing[2] },
  amount: { fontSize: Typography.xs, fontWeight: '800' },
  hint: { fontSize: 11, marginTop: Spacing[3], lineHeight: 15 },
});

const RW = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.xl, borderWidth: 1.5 },
  thumb: { width: 44, height: 30, borderRadius: 6 },
  name: { fontSize: Typography.sm, fontWeight: '700' },
  sub: { fontSize: 11, marginTop: 2 },
  status: { fontSize: 11, fontWeight: '700' },
});

const S = StyleSheet.create({
  root: { flex: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] },
  sectionTitle: { fontSize: Typography.base, fontWeight: '800' },
  selectToggle: { fontSize: Typography.sm, fontWeight: '700' },
  empty: { fontSize: Typography.sm, textAlign: 'center', marginTop: Spacing[8] },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[4],
  },
  errorText: { fontSize: Typography.xs, fontWeight: '600', flex: 1 },
  footer: { borderTopWidth: 1, padding: Spacing[4] },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Spacing[4], borderRadius: Radius.xl },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: Typography.sm },
  confirmText: { fontSize: Typography.xs, lineHeight: 16 },
  footerBtn: { flex: 1, paddingVertical: Spacing[3], borderRadius: Radius.lg, alignItems: 'center' },
});
