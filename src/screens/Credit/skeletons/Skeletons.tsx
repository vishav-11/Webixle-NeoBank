import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, DimensionValue } from 'react-native';
import { Spacing, Radius } from '@/styles/theme';
import { useTheme } from '@/context/ThemeContext';

// ── Bone ───────────────────────────────────────────────────────────────────────

function Bone({
  w, h, r = 8, boneColor, style,
}: {
  w?: DimensionValue;
  h: number;
  r?: number;
  boneColor: string;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View
      style={[
        { width: w ?? '100%', height: h, borderRadius: r, backgroundColor: boneColor },
        { opacity },
        style,
      ]}
    />
  );
}

// ── DashboardSkeleton ──────────────────────────────────────────────────────────

export function DashboardSkeleton() {
  const { colors } = useTheme();
  const bone = colors.border;
  const card = colors.card;

  const B = (props: Omit<React.ComponentProps<typeof Bone>, 'boneColor'>) =>
    <Bone {...props} boneColor={bone} />;

  return (
    <View style={[sk.wrap]}>
      {/* Credit Limit Card */}
      <View style={[sk.card, { backgroundColor: card }]}>
        <B w={100} h={12} />
        <B w={180} h={36} r={8} style={{ marginTop: 8 }} />
        <View style={sk.row}>
          <B w={120} h={12} />
          <B w={150} h={12} />
        </View>
      </View>

      {/* Stats 2x2 */}
      <View style={sk.grid2}>
        <View style={sk.gridRow}>
          {[0, 1].map((i) => (
            <View key={i} style={[sk.statCard, { backgroundColor: card }]}>
              <B w={80}  h={11} />
              <B w={100} h={22} r={6} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
        <View style={sk.gridRow}>
          {[0, 1].map((i) => (
            <View key={i} style={[sk.statCard, { backgroundColor: card }]}>
              <B w={80}  h={11} />
              <B w={100} h={22} r={6} style={{ marginTop: 6 }} />
            </View>
          ))}
        </View>
      </View>

      {/* Increase Limit */}
      <View style={[sk.card, { backgroundColor: card }]}>
        <View style={sk.row}>
          <B w={130} h={14} />
          <B w={60}  h={12} />
        </View>
        <B h={12} style={{ marginTop: 6 }} />
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={[sk.row, { marginTop: 14 }]}>
            <B w={40} h={40} r={20} />
            <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
              <B w={80}  h={12} />
              <B w={120} h={11} />
            </View>
            <B w={50} h={12} />
          </View>
        ))}
      </View>

      {/* LIV Ratio */}
      <View style={[sk.card, { backgroundColor: card }]}>
        <View style={sk.row}>
          <B w={80} h={12} />
          <B w={50} h={12} />
        </View>
        <B w={80}  h={28} r={6}  style={{ marginTop: 8 }} />
        <B h={8}   r={4}         style={{ marginTop: 12 }} />
        <B w={200} h={11}        style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

// ── HistorySkeleton ────────────────────────────────────────────────────────────

export function HistorySkeleton() {
  const { colors } = useTheme();
  const bone = colors.border;
  const card = colors.card;

  const B = (props: Omit<React.ComponentProps<typeof Bone>, 'boneColor'>) =>
    <Bone {...props} boneColor={bone} />;

  return (
    <View style={{ padding: Spacing[4], gap: Spacing[3] }}>
      {/* Filter chips */}
      <View style={hsk.chips}>
        {[60, 70, 60, 80, 100].map((w, i) => (
          <B key={i} w={w} h={32} r={20} />
        ))}
      </View>

      {/* Rows */}
      <View style={[hsk.card, { backgroundColor: card }]}>
        <B w={120} h={14} />
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={hsk.row}>
            <B w={40} h={40} r={20} />
            <View style={{ flex: 1, gap: 6, marginLeft: 12 }}>
              <B w={120} h={13} />
              <B w={90}  h={11} />
            </View>
            <B w={80} h={16} />
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const sk = StyleSheet.create({
  wrap:     { padding: Spacing[4], gap: Spacing[3] },
  card:     { borderRadius: Radius.xl, padding: Spacing[4], gap: 6 },
  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid2:    { gap: Spacing[3] },
  gridRow:  { flexDirection: 'row', gap: Spacing[3] },
  statCard: { flex: 1, borderRadius: Radius.xl, padding: Spacing[4] },
});

const hsk = StyleSheet.create({
  chips: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' },
  card:  { borderRadius: Radius.xl, padding: Spacing[4], gap: Spacing[3] },
  row:   { flexDirection: 'row', alignItems: 'center' },
});