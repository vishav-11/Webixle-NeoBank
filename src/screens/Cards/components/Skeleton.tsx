/**
 * Skeleton.tsx
 * Reusable shimmer skeleton loader — replaces ActivityIndicator for loading states.
 * Uses the theme's color system.
 * No react-native-reanimated dependency.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface SkeletonProps {
  width?:        number | string;
  height?:       number;
  borderRadius?: number;
  style?:        ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue:         1,
          duration:        900,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue:         0.4,
          duration:        900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        {
          width:           width as any,
          height,
          borderRadius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ── Pre-built skeleton layouts ─────────────────────────────────────────────────

export function CardInfoSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        sk.cardBox,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={sk.cardLeft}>
        <Skeleton width={48} height={48} borderRadius={14} />
        <View style={{ gap: 6 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={80}  height={11} />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <Skeleton width={60} height={11} />
        <Skeleton width={90} height={22} />
      </View>
    </View>
  );
}

export function NetworkSelectorSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        sk.networkBox,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={sk.networkLeft}>
        <Skeleton width={32} height={32} borderRadius={16} />
        <View style={{ gap: 5 }}>
          <Skeleton width={100} height={14} />
          <Skeleton width={60}  height={11} />
        </View>
      </View>
      <Skeleton width={18} height={18} borderRadius={4} />
    </View>
  );
}

export function BalanceSkeleton() {
  return (
    <View style={sk.balanceRow}>
      <View style={sk.balanceLeft}>
        <Skeleton width={14} height={14} borderRadius={7} />
        <Skeleton width={90} height={13} />
      </View>
      <Skeleton width={80} height={14} />
    </View>
  );
}

export function FeeBreakdownSkeleton() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        sk.feeBox,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      {[1, 2, 3].map(i => (
        <View key={i} style={sk.feeRow}>
          <Skeleton width={100} height={13} />
          <Skeleton width={60}  height={13} />
        </View>
      ))}
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const sk = StyleSheet.create({
  cardBox: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    borderRadius:   16,
    padding:        16,
    marginBottom:   20,
    borderWidth:    1,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  networkBox: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    borderRadius:   12,
    paddingHorizontal: 16,
    paddingVertical:   14,
    borderWidth:    1,
  },
  networkLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           12,
  },
  balanceRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           8,
  },
  feeBox: {
    borderRadius: 12,
    padding:      16,
    marginBottom: 20,
    borderWidth:  1,
    gap:          12,
  },
  feeRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
  },
});