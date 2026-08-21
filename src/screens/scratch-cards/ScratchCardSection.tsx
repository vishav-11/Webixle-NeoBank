import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Radius, Spacing } from '@/styles/theme';
import { useMyScratchCards } from '@/hooks/queires/useScratchCards';
import ScratchCardItem from './ScratchCardItem';

interface Props {
  colors: any;
}

export default function ScratchCardSection({ colors }: Props) {
  const { data: cards, isLoading, isError } = useMyScratchCards();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[sec.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader colors={colors} count={0} loading />
        <View style={sec.loadingRow}>
          {[1, 2].map((i) => (
            <View
              key={i}
              style={[sec.skeleton, { backgroundColor: colors.surface }]}
            />
          ))}
        </View>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={[sec.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader colors={colors} count={0} />
        <View style={sec.emptyWrap}>
          <Text style={sec.emptyEmoji}>⚠️</Text>
          <Text style={[sec.emptyTxt, { color: colors.text2 }]}>
            Failed to load scratch cards
          </Text>
        </View>
      </View>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────────
  if (!cards || cards.length === 0) {
    return (
      <View style={[sec.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SectionHeader colors={colors} count={0} />
        <View style={sec.emptyWrap}>
          <Text style={sec.emptyEmoji}>🎟️</Text>
          <Text style={[sec.emptyTitle, { color: colors.text }]}>
            No Scratch Cards
          </Text>
          <Text style={[sec.emptyTxt, { color: colors.text2 }]}>
            You don't have any scratch cards yet.{'\n'}Complete tasks to earn them!
          </Text>
        </View>
      </View>
    );
  }

  const pendingCount = cards.filter((c) => c.status === 'pending').length;

  return (
    <View style={[sec.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <SectionHeader colors={colors} count={pendingCount} />

      {/* Grid */}
      <View style={sec.grid}>
        {cards.map((card) => (
          <ScratchCardItem key={card._id} card={card} colors={colors} />
        ))}
      </View>
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  colors,
  count,
  loading,
}: {
  colors: any;
  count: number;
  loading?: boolean;
}) {
  return (
    <View style={sec.header}>
      <View style={[sec.headerIcon, { backgroundColor: 'rgba(245,166,35,0.12)' }]}>
        <Text style={{ fontSize: 18 }}>🎟️</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[sec.title, { color: colors.text }]}>
          Scratch Cards
        </Text>
        <Text style={[sec.sub, { color: colors.text2 }]}>
          {loading
            ? 'Loading...'
            : count > 0
            ? `${count} card${count !== 1 ? 's' : ''} ready to scratch!`
            : 'Scratch & win rewards'}
        </Text>
      </View>
      {loading && <ActivityIndicator size="small" color={colors.green} />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const sec = StyleSheet.create({
  wrap: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[5],
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.md,
    fontWeight: '800',
    marginBottom: 2,
  },
  sub: {
    fontSize: Typography.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 0,
  },

  // Loading skeleton
  loadingRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeleton: {
    flex: 1,
    height: 180,
    borderRadius: Radius['2xl'],
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
  },
  emptyTxt: {
    fontSize: Typography.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});