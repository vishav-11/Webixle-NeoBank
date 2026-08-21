/**
 * app/(app)/hub.tsx
 * ✅ NO manual rs/vs/ms calls
 * ✅ Spacing, Typography, Radius are auto-responsive
 * ✅ Restyled to match Dashboard's flat card look (same theme tokens, no gradients)
 */
import React, { useRef } from 'react';
import {
  View, Text, StyleSheet,
  TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius,
  IconSize,
  getShadow,
} from '@/styles/theme';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface HubItem {
  id:    string;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  route?: string;
}

interface HubSection {
  title: string;
  items: HubItem[];
}

// ─────────────────────────────────────────────
// Data — same items & routes as before, gradient field removed (unused in flat style)
// ─────────────────────────────────────────────
const SECTIONS: HubSection[] = [
  {
    title: 'Popular',
    items: [
      { id: 'send',    label: 'Send',    icon: 'arrow-up-outline',        route: '/(screens)/send' },
      { id: 'receive', label: 'Receive', icon: 'arrow-down-outline',      route: '/(screens)/receive' },
      { id: 'swap',    label: 'Swap',    icon: 'swap-horizontal-outline', route: '/(app)/swap' },
      { id: 'buy',     label: 'Buy',     icon: 'add-outline',             route: '/(screens)/Buy' },
      { id: 'earn',    label: 'Earn',    icon: 'trending-up-outline',     route: '/(screens)/Earn' },
      { id: 'p2p',     label: 'P2P',     icon: 'people-outline',          route: '/(screens)/P2P' },
      { id: 'credit',  label: 'Credit',  icon: 'card-outline',            route: '/(screens)/credit' },
      { id: 'loan',    label: 'Loan',    icon: 'cash-outline',            route: '/(screens)/Loan' },
    ],
  },
  {
    title: 'Card',
    items: [
      { id: 'card-apply',    label: 'Apply',    icon: 'card-outline',      route: '/(app)/Card' },
      { id: 'budget',        label: 'Budget',   icon: 'bar-chart-outline', route: '/(screens)/budget' },
      { id: 'card-activity', label: 'Activity', icon: 'receipt-outline',   route: '/activity' },
      { id: 'card-gift',     label: 'Gift',     icon: 'gift-outline',      route: '/(screens)/gift' },
    ],
  },
  {
    title: 'Transaction',
    items: [
      { id: 'txn-receive',  label: 'Receive',  icon: 'arrow-down-outline',      route: '/(screens)/receive' },
      { id: 'txn-scan',     label: 'Scan',     icon: 'scan-outline',            route: '/scanner' },
      { id: 'txn-withdraw', label: 'Withdraw', icon: 'arrow-up-circle-outline', route: '/(screens)/withdraw' },
      { id: 'txn-buy',      label: 'Buy',      icon: 'add-circle-outline',      route: '/(screens)/Buy' },
    ],
  },
  {
    title: 'Rewards & Insights',
    items: [
      { id: 'market',    label: 'Market',    icon: 'stats-chart-outline', route: '/(screens)/markets' },
      { id: 'vouchers',  label: 'Vouchers',  icon: 'ticket-outline',      route: '/(screens)/vouchers' },
      { id: 'portfolio', label: 'Portfolio', icon: 'pie-chart-outline',   route: '/(screens)/portfolio' },
    ],
  },
];

// ─────────────────────────────────────────────
// Tile — same flat card style as Dashboard's ActionButton
// ─────────────────────────────────────────────
function HubTile({ item, colors, onPress }: {
  item: HubItem; colors: any; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const pressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  return (
    <Animated.View style={[T.slot, { transform: [{ scale }] }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        activeOpacity={1}
        style={{ width: '100%' }}
      >
        <View style={[T.tile, { backgroundColor: colors.cardHover }]}>
          <Ionicons name={item.icon} size={IconSize.md} color={colors.text} />
          <Text
            style={[T.label, { color: colors.text2 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {item.label}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function HubSectionBlock({ section, colors, onItemPress }: {
  section: HubSection; colors: any; onItemPress: (item: HubItem) => void;
}) {
  return (
    <View style={SEC.section}>
      <View style={SEC.header}>
        <Text style={[SEC.title, { color: colors.text }]}>{section.title}</Text>
      </View>

      <View style={SEC.grid}>
        {section.items.map(item => (
          <HubTile
            key={item.id}
            item={item}
            colors={colors}
            onPress={() => onItemPress(item)}
          />
        ))}
      </View>
    </View>
  );
}

function SupportCard({ colors, isDark, onPress }: {
  colors: any; isDark: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[SUP.row, { backgroundColor: colors.cardHover, borderColor: colors.border, borderWidth: 1 }]}
    >
      <View style={[SUP.iconBox, { backgroundColor: colors.iconTileBg }, getShadow(isDark, 'sm')]}>
        <Ionicons name="help-circle-outline" size={IconSize.sm} color={colors.text} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[SUP.title, { color: colors.text }]}>Need Help?</Text>
        <Text style={[SUP.sub, { color: colors.text2 }]}>Visit our Support Centre</Text>
      </View>

      <View style={[SUP.arrowBox, {
        backgroundColor: colors.primaryDim,
        borderColor:     colors.primaryBorder,
        borderWidth:     1,
      }]}>
        <Feather name="chevron-right" size={IconSize.xs} color={colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Main Screen — same flat bg as Dashboard (colors.bg), no gradient overlay
// ─────────────────────────────────────────────
export default function HubScreen() {
  const { colors, isDark } = useTheme();
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  const handleItemPress = (item: HubItem) => {
    if (item.route) router.push(item.route as any);
  };

  return (
    <ScrollView
      style={[ROOT.scroll, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[ROOT.content, { paddingBottom: insets.bottom + 100 }]}
    >
      <View style={ROOT.pageHeader}>
        <Text style={[ROOT.pageTitle, { color: colors.text }]}>All Services</Text>
        <Text style={[ROOT.pageSub, { color: colors.text2 }]}>Everything in one place</Text>
      </View>

      {SECTIONS.map(section => (
        <HubSectionBlock
          key={section.title}
          section={section}
          colors={colors}
          onItemPress={handleItemPress}
        />
      ))}

      <SupportCard
        colors={colors}
        isDark={isDark}
        onPress={() => router.push('/(screens)/support' as any)}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────
// Styles — mirrors Dashboard's spacing/typography scale
// ─────────────────────────────────────────────
const ROOT = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    padding: Spacing[4],
    gap:     Spacing[5],
  },
  pageHeader: { gap: 2, marginBottom: Spacing[1] },
  pageTitle: {
    fontSize:   Typography.lg,
    fontWeight: Typography.extrabold,
  },
  pageSub: { fontSize: Typography.xs },
});

const SEC = StyleSheet.create({
  section: { gap: Spacing[3] },
  header:  { flexDirection: 'row', alignItems: 'center' },
  title: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
  },
  grid: {
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'flex-start',
    rowGap:         Spacing[3],
    columnGap:      Spacing[2],
  },
});

const T = StyleSheet.create({
  slot: { width: '23%' },
  tile: {
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing[2],
    borderRadius:    Radius.lg,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[1],
    minHeight:       78,
  },
  label: {
    fontSize:   12,
    fontWeight: '600',
    textAlign:  'center',
  },
});

const SUP = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               Spacing[3],
    paddingVertical:   Spacing[4],
    paddingHorizontal: Spacing[4],
    borderRadius:      Radius.xl,
    marginTop:         Spacing[2],
  },
  iconBox: {
    width:          44,
    height:         44,
    borderRadius:   Radius.lg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: { fontSize: Typography.base, fontWeight: '700', marginBottom: 2 },
  sub:   { fontSize: Typography.xs },
  arrowBox: {
    width:          30,
    height:         30,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
  },
});