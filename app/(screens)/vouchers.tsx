/**
 * app/(screens)/vouchers.tsx
 * Vouchers page — theme integrated, compact layout
 */

import React, { useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius, IconSize, IconBox, getShadow,
} from '@/styles/theme';
import ScratchCardSection from '@/screens/scratch-cards/ScratchCardSection';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Voucher {
  id:        string;
  category:  string;
  discount:  string;
  icon:      string;
  iconColor: string;
  iconBg:    string;
}

interface HowStep {
  step:        string;
  title:       string;
  description: string;
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const VOUCHERS: Voucher[] = [
  {
    id: 'v1', category: 'Shopping', discount: '10% off',
    icon: 'bag-outline',        iconColor: '#D4AF37', iconBg: '#D4AF3730',
  },
  {
    id: 'v2', category: 'Coffee',   discount: '15% off',
    icon: 'cafe-outline',       iconColor: '#f7931a', iconBg: '#f7931a30',
  },
  {
    id: 'v3', category: 'Dining',   discount: '10% off',
    icon: 'restaurant-outline', iconColor: '#00D395', iconBg: '#00D39530',
  },
  {
    id: 'v4', category: 'Movies',   discount: '15% off',
    icon: 'film-outline',       iconColor: '#9945ff', iconBg: '#9945ff30',
  },
];

const HOW_IT_WORKS: HowStep[] = [
  {
    step: '1', title: 'Browse Vouchers',
    description: 'Explore available deals from partner merchants',
  },
  {
    step: '2', title: 'Redeem with Crypto',
    description: 'Pay with your digital assets to activate voucher',
  },
  {
    step: '3', title: 'Enjoy Savings',
    description: 'Use voucher at checkout for instant discount',
  },
];

// ─── Voucher Card ─────────────────────────────────────────────────────────────
interface VoucherCardProps {
  voucher: Voucher;
  colors:  any;
}

const VoucherCard = React.memo(({ voucher, colors }: VoucherCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() =>
    Animated.spring(scaleAnim, {
      toValue: 0.96, useNativeDriver: true,
    }).start(), [scaleAnim]);

  const handlePressOut = useCallback(() =>
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 60, friction: 7, useNativeDriver: true,
    }).start(), [scaleAnim]);

  const handleUseNow = useCallback(() => {
    Alert.alert(
      `${voucher.category} Voucher`,
      `${voucher.discount} voucher activated!\n\nShow this at checkout to redeem.`,
      [{ text: 'Got it' }],
    );
  }, [voucher]);

  return (
    <Animated.View
      style={[
        vc.card,
        {
          backgroundColor: colors.card,
          borderColor:     colors.border,
          transform:       [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={vc.inner}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {/* Icon */}
        <View style={[vc.iconWrap, { backgroundColor: voucher.iconBg }]}>
          <Ionicons
            name={voucher.icon as any}
            size={IconSize.xl}
            color={voucher.iconColor}
          />
        </View>

        {/* Category */}
        <Text style={[vc.category, { color: colors.text2 }]} numberOfLines={1}>
          {voucher.category}
        </Text>

        {/* Discount */}
        <Text style={[vc.discount, { color: colors.text }]} numberOfLines={1}>
          {voucher.discount}
        </Text>

        {/* Use Now */}
        <TouchableOpacity
          style={[vc.useBtn, { backgroundColor: colors.primary }]}
          onPress={handleUseNow}
          activeOpacity={0.85}
        >
          <Text style={vc.useBtnTxt}>Use now</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});
VoucherCard.displayName = 'VoucherCard';

const vc = StyleSheet.create({
  card: {
    flex:          1,
    minWidth:      '47%',
    maxWidth:      '48%',
    borderRadius:  Radius.xl,
    borderWidth:   1,
    marginBottom:  Spacing[3],
  },
  inner: {
    alignItems:        'center',
    paddingVertical:   Spacing[4],
    paddingHorizontal: Spacing[3],
    gap:               Spacing[2],
  },
  iconWrap: {
    width:          IconBox.lg,
    height:         IconBox.lg,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   Spacing[1],
  },
  category: {
    fontSize:   Typography.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  discount: {
    fontSize:   Typography.md,
    fontWeight: '800',
  },
  useBtn: {
    paddingVertical:   Spacing[2],
    paddingHorizontal: Spacing[4],
    borderRadius:      Radius.full,
    marginTop:         Spacing[1],
  },
  useBtnTxt: {
    color:      '#fff',
    fontSize:   Typography.xs,
    fontWeight: '700',
  },
});

// ─── How It Works Step ────────────────────────────────────────────────────────
interface HowStepProps {
  item:   HowStep;
  colors: any;
  isLast: boolean;
}

const HowStepItem = React.memo(({ item, colors, isLast }: HowStepProps) => (
  <View style={[hs.row, !isLast && hs.rowGap]}>
    <View style={[hs.circle, { backgroundColor: colors.primaryDim, borderColor: colors.primary, borderWidth: 1 }]}>
      <Text style={[hs.stepNum, { color: colors.primary }]}>{item.step}</Text>
    </View>
    <View style={hs.textCol}>
      <Text style={[hs.title, { color: colors.text }]}>{item.title}</Text>
      <Text style={[hs.desc, { color: colors.text2 }]}>{item.description}</Text>
    </View>
  </View>
));
HowStepItem.displayName = 'HowStepItem';

const hs = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           Spacing[3],
  },
  rowGap:  { marginBottom: Spacing[4] },
  circle: {
    width:          40,
    height:         40,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  stepNum: {
    fontSize:   Typography.base,
    fontWeight: '800',
  },
  textCol:  { flex: 1, paddingTop: Spacing[1] },
  title: {
    fontSize:     Typography.sm,
    fontWeight:   '700',
    marginBottom: Spacing[1],
  },
  desc: {
    fontSize:   Typography.xs,
    lineHeight: Typography.lineHeightBase,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function VouchersScreen() {
  const { colors, isDark } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  // Fade-in
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue:         1,
      duration:        400,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleBrowseMore = useCallback(() => {
    Alert.alert(
      'Browse Vouchers',
      'Explore more vouchers from our partner merchants!',
      [{ text: 'OK' }],
    );
  }, []);

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:      insets.top + Spacing[2],
            borderBottomColor: colors.border,
            backgroundColor:   colors.bg,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
          onPress={() => router.canGoBack() ? router.back() : router.push('/')}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
        </TouchableOpacity>

        <Text style={[s.headerTitle, { color: colors.text }]}>Vouchers</Text>

        {/* Right placeholder — keeps title centered */}
        <View style={s.iconBtn} />
      </View>

      {/* ── Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: Spacing[10] + insets.bottom },
        ]}
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* Scratch Cards */}
          <ScratchCardSection colors={colors} />

          {/* Section Header */}
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              Your Vouchers
            </Text>
            <View style={[s.badge, { backgroundColor: colors.primaryDim, borderColor: colors.primaryBorder, borderWidth: 1 }]}>
              <Text style={[s.badgeText, { color: colors.primary }]}>
                {VOUCHERS.length} active
              </Text>
            </View>
          </View>

          {/* Voucher Grid */}
          <View style={s.grid}>
            {VOUCHERS.map((v) => (
              <VoucherCard key={v.id} voucher={v} colors={colors} />
            ))}
          </View>

          {/* How It Works */}
          <View
            style={[
              s.howSection,
              {
                backgroundColor: colors.card,
                borderColor:     colors.border,
              },
            ]}
          >
            <View style={s.howHeader}>
              <Ionicons
                name="information-circle-outline"
                size={IconSize.sm}
                color={colors.primary}
              />
              <Text style={[s.howTitle, { color: colors.text }]}>
                How Vouchers Work
              </Text>
            </View>

            {HOW_IT_WORKS.map((item, idx) => (
              <HowStepItem
                key={item.step}
                item={item}
                colors={colors}
                isLast={idx === HOW_IT_WORKS.length - 1}
              />
            ))}
          </View>

          {/* Browse More CTA */}
          <TouchableOpacity
            style={[
              s.browseBtn,
              {
                backgroundColor: colors.primaryDim,
                borderColor:     colors.primaryBorder,
              },
            ]}
            onPress={handleBrowseMore}
            activeOpacity={0.85}
          >
            <Ionicons name="search-outline" size={IconSize.sm} color={colors.primary} />
            <Text style={[s.browseBtnTxt, { color: colors.primary }]}>
              Browse All Vouchers
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: Spacing[4],
    paddingBottom:     Spacing[3],
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex:       1,
    textAlign:  'center',
    fontSize:   Typography.base,
    fontWeight: '700',
  },
  iconBtn: {
    width:          36,
    height:         36,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop:        Spacing[4],
  },

  // Section Header
  sectionHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing[2],
    marginBottom:   Spacing[3],
  },
  sectionTitle: {
    fontSize:   Typography.md,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: Spacing[2],
    paddingVertical:   2,
    borderRadius:      Radius.full,
  },
  badgeText: {
    fontSize:   Typography.xs,
    fontWeight: '600',
  },

  // Grid
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'space-between',
    marginBottom:   Spacing[4],
  },

  // How It Works
  howSection: {
    borderRadius:  Radius.xl,
    borderWidth:   1,
    padding:       Spacing[4],
    marginBottom:  Spacing[4],
  },
  howHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing[2],
    marginBottom:   Spacing[4],
  },
  howTitle: {
    fontSize:   Typography.base,
    fontWeight: '700',
  },

  // Browse CTA
  browseBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius:    Radius.lg,
    borderWidth:     1,
  },
  browseBtnTxt: {
    fontSize:   Typography.sm,
    fontWeight: '700',
  },
});