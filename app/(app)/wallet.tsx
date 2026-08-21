// ─────────────────────────────────────────────────────────────────────────────
// WalletScreen.tsx – Fully responsive web + mobile
// ─────────────────────────────────────────────────────────────────────────────
import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius, IconSize, IconBox,
} from '@/styles/theme';
import { useWalletDashboard } from '@/hooks/useWallet';
import type { DashboardAsset } from '@/hooks/useWallet';

const IS_WEB = Platform.OS === 'web';

// ─── Responsive Hook ──────────────────────────────────────────────────────────
function useWindowSize() {
  const [size, setSize] = useState({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const handler = ({ window }: any) => {
      setSize({ width: window.width, height: window.height });
    };
    const sub = Dimensions.addEventListener('change', handler);
    return () => sub?.remove();
  }, []);

  return size;
}

// Breakpoints
const BP = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
};

// ─── Gradients ────────────────────────────────────────────────────────────────
const PRIMARY_GRADIENT_DARK: [string, string, string] = ['#2A1660', '#1C0F4A', '#120A30'];
const PRIMARY_GRADIENT_LIGHT: [string, string, string] = ['#5B34E0', '#7B4DFF', '#3D1FB8'];
const PANEL_GRADIENT_DARK: [string, string] = ['#1E2172', '#2D33A8'];
const PANEL_GRADIENT_LIGHT: [string, string] = ['#1E2172', '#2D33A8'];

// ─── Coin Colors ──────────────────────────────────────────────────────────────
const COIN_COLORS: Record<string, [string, string]> = {
  BTC:  ['#F7931A', '#E8830A'],
  ETH:  ['#627EEA', '#4A6DD8'],
  TRX:  ['#FF4D6A', '#E83050'],
  BNB:  ['#F5A623', '#E09510'],
  USDT: ['#26A17B', '#1A8A66'],
  USDC: ['#2775CA', '#1A60B5'],
};

const getCoinColors = (symbol: string): [string, string] =>
  COIN_COLORS[symbol?.toUpperCase()] ?? ['#7B4DFF', '#4B2AD1'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatUsd = (val?: string | number): string => {
  const n = parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '$0.00';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatBal = (val?: string | number, decimals = 6): string => {
  const n = parseFloat(String(val ?? '0'));
  if (isNaN(n)) return '0.00';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.min(decimals, 8),
  });
};

const getBalanceFontSize = (val?: string | number): number => {
  const len = formatUsd(val).length;
  if (len > 16) return Typography.xl;
  if (len > 13) return Typography['2xl'];
  if (len > 10) return Typography['3xl'];
  return Typography['4xl'];
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface AppColors {
  bg: string;
  bgAlt: string;
  surface: string;
  card: string;
  border: string;
  borderSoft: string;
  hover: string;
  text: string;
  text2: string;
  text3: string;
  primary: string;
  primaryBright: string;
  primaryDim: string;
  primaryBorder: string;
  primaryGlow: string;
  accent: string;
  accentDim: string;
  green: string;
  greenDim: string;
  red: string;
  redDim: string;
  orange: string;
  orangeDim: string;
  purple: string;
  purpleDim: string;
  blue: string;
  blueDim: string;
  overlay: string;
  tabBar: string;
  tabBarBorder: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({
  width,
  height,
  radius = Radius.md,
  borderColor,
}: {
  width: number | string;
  height: number;
  radius?: number;
  borderColor: string;
}) {
  return (
    <View
      style={{
        width: width as number,
        height,
        borderRadius: radius,
        backgroundColor: borderColor,
        opacity: 0.6,
      }}
    />
  );
}

// ─── Hero Stat Pill ───────────────────────────────────────────────────────────
function HeroStatPill({
  icon,
  label,
  value,
  iconColor,
  hidden,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
  hidden: boolean;
}) {
  return (
    <View style={hspSt.wrap}>
      <View style={[hspSt.iconWrap, { backgroundColor: iconColor + '30' }]}>
        <Ionicons name={icon as any} size={IconSize.xs} color={iconColor} />
      </View>
      <View style={hspSt.texts}>
        <Text style={hspSt.label}>{label}</Text>
        <Text style={hspSt.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {hidden ? '$ ••••' : value}
        </Text>
      </View>
    </View>
  );
}

const hspSt = StyleSheet.create({
  wrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    backgroundColor: '#ffffff15',
    borderColor: '#ffffff20',
  },
  iconWrap: {
    width: IconBox.xs,
    height: IconBox.xs,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  label: { fontSize: Typography.xs, fontWeight: Typography.medium, color: '#ffffffAA' },
  value: { fontSize: Typography.sm, fontWeight: Typography.bold, color: '#FFFFFF' },
});

// ─── Asset Card ───────────────────────────────────────────────────────────────
function AssetCard({
  asset,
  colors,
  hidden,
  onPress,
  compact = false,
}: {
  asset: DashboardAsset;
  colors: AppColors;
  hidden: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  const [c1, c2] = getCoinColors(asset.symbol);
  const pctAvail =
    parseFloat(asset.totalBalance) > 0
      ? ((parseFloat(asset.availableBalance) / parseFloat(asset.totalBalance)) * 100).toFixed(0)
      : '0';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        acSt.wrap,
        { backgroundColor: colors.card, borderColor: colors.border },
        compact && acSt.wrapCompact,
      ]}
    >
      {/* Coin icon */}
      <LinearGradient
        colors={[c1, c2]}
        style={[acSt.icon, compact && acSt.iconCompact]}
      >
        <Text style={[acSt.iconText, compact && acSt.iconTextCompact]}>
          {asset.symbol[0]}
        </Text>
      </LinearGradient>

      {/* Middle info */}
      <View style={acSt.mid}>
        <Text style={[acSt.symbol, { color: colors.text }, compact && acSt.symbolCompact]}>
          {asset.symbol}
        </Text>
        <View style={acSt.badgeRow}>
          <View style={[acSt.chainBadge, { backgroundColor: colors.primaryDim }]}>
            <Text style={[acSt.chainText, { color: colors.primary }]}>{asset.chainId}</Text>
          </View>
          {!compact && (
            <Text style={[acSt.name, { color: colors.text2 }]} numberOfLines={1}>
              {asset.name}
            </Text>
          )}
        </View>

        {/* Progress bar */}
        <View style={[acSt.barBg, { backgroundColor: colors.border }]}>
          <LinearGradient
            colors={[colors.primary, colors.purple ?? c1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[acSt.barFill, { width: `${pctAvail}%` as any }]}
          />
        </View>
        <Text style={[acSt.barLabel, { color: colors.text3 }]}>{pctAvail}% available</Text>
      </View>

      {/* Right balances */}
      <View style={[acSt.right, compact && acSt.rightCompact]}>
        <Text
          style={[acSt.balance, { color: colors.text }, compact && acSt.balanceCompact]}
          numberOfLines={1}
        >
          {hidden ? '••••••' : formatBal(asset.totalBalance)}{' '}
          <Text style={{ fontSize: Typography.xs, color: colors.text2 }}>{asset.symbol}</Text>
        </Text>
        <Text style={[acSt.usd, { color: colors.text2 }]}>
          {hidden ? '$ ••••' : formatUsd(asset.usdValue)}
        </Text>
        {!compact && (
          <View style={acSt.subRow}>
            <View style={acSt.subItem}>
              <View style={[acSt.dot, { backgroundColor: colors.primary }]} />
              <Text style={[acSt.subText, { color: colors.text3 }]}>
                {hidden ? '••••' : formatBal(asset.availableBalance)}
              </Text>
            </View>
            <View style={acSt.subItem}>
              <View style={[acSt.dot, { backgroundColor: colors.orange }]} />
              <Text style={[acSt.subText, { color: colors.text3 }]}>
                {hidden ? '••••' : formatBal(asset.lockedBalance)}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const acSt = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing[3],
  },
  wrapCompact: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  icon: {
    width: IconBox.lg,
    height: IconBox.lg,
    borderRadius: IconBox.lg / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompact: {
    width: IconBox.md,
    height: IconBox.md,
    borderRadius: IconBox.md / 2,
  },
  iconText: { fontSize: Typography.lg, fontWeight: Typography.extrabold, color: '#fff' },
  iconTextCompact: { fontSize: Typography.sm },
  mid: { flex: 1, gap: Spacing[1] },
  symbol: { fontSize: Typography.base, fontWeight: Typography.bold },
  symbolCompact: { fontSize: Typography.sm },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  chainBadge: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.sm },
  chainText: { fontSize: Typography.xs, fontWeight: Typography.bold },
  name: { fontSize: Typography.xs, flex: 1 },
  barBg: { height: 4, borderRadius: Radius.xs, overflow: 'hidden', marginTop: 2 },
  barFill: { height: 4, borderRadius: Radius.xs },
  barLabel: { fontSize: Typography.xs, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 3, maxWidth: 110 },
  rightCompact: { maxWidth: 90 },
  balance: { fontSize: Typography.sm, fontWeight: Typography.bold },
  balanceCompact: { fontSize: Typography.xs },
  usd: { fontSize: Typography.sm },
  subRow: { flexDirection: 'row', gap: Spacing[2], marginTop: 2 },
  subItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  subText: { fontSize: Typography.xs },
});

// ─── Skeleton Asset Card ──────────────────────────────────────────────────────
function SkeletonAssetCard({ colors }: { colors: AppColors }) {
  return (
    <View style={[acSt.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Skeleton width={IconBox.lg} height={IconBox.lg} radius={IconBox.lg / 2} borderColor={colors.border} />
      <View style={{ flex: 1, gap: Spacing[2] }}>
        <Skeleton width={70} height={14} borderColor={colors.border} />
        <Skeleton width={110} height={11} borderColor={colors.border} />
        <Skeleton width={120} height={4} radius={Radius.xs} borderColor={colors.border} />
      </View>
      <View style={{ alignItems: 'flex-end', gap: Spacing[2] }}>
        <Skeleton width={90} height={14} borderColor={colors.border} />
        <Skeleton width={60} height={11} borderColor={colors.border} />
      </View>
    </View>
  );
}

// ─── Hero Card ────────────────────────────────────────────────────────────────
interface HeroCardProps {
  isDark: boolean;
  colors: AppColors;
  loading: boolean;
  hidden: boolean;
  refreshing: boolean;
  totalUsd?: string | number;
  totalAvailableUsd: string;
  totalLockedUsd: string;
  onToggleHidden: () => void;
  onRefresh: () => void;
  onNavigate: (route: string) => void;
  compact?: boolean; // for web sidebar mode
}

function HeroCard({
  isDark,
  colors,
  loading,
  hidden,
  refreshing,
  totalUsd,
  totalAvailableUsd,
  totalLockedUsd,
  onToggleHidden,
  onRefresh,
  onNavigate,
  compact = false,
}: HeroCardProps) {
  const gradientColors = isDark ? PRIMARY_GRADIENT_DARK : PRIMARY_GRADIENT_LIGHT;
  const skelClrBorder = '#ffffff20';
  const fontSize = hidden ? Typography['3xl'] : getBalanceFontSize(totalUsd);

  const ACTIONS = [
    { icon: 'arrow-up-outline', label: 'Send', route: '/(screens)/send' },
    { icon: 'arrow-down-outline', label: 'Receive', route: '/(screens)/receive' },
    { icon: 'swap-horizontal', label: 'Swap', route: '/(app)/swap' },
    { icon: 'time-outline', label: 'History', route: '/(screens)/history' },
  ] as const;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[heroSt.card, compact && heroSt.cardCompact]}
    >
      <View style={heroSt.decorCircle1} />
      <View style={heroSt.decorCircle2} />

      {/* Top row */}
      <View style={heroSt.topRow}>
        <View style={heroSt.labelRow}>
          <View style={heroSt.walletIconWrap}>
            <Ionicons name="wallet" size={IconSize.xs} color="#FFFFFF" />
          </View>
          <Text style={heroSt.labelText}>Total Portfolio</Text>
        </View>
        <View style={heroSt.headerActions}>
          <TouchableOpacity onPress={onToggleHidden} style={heroSt.eyeBtn} activeOpacity={0.8}>
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={IconSize.sm}
              color="#ffffffAA"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onRefresh} style={heroSt.eyeBtn} activeOpacity={0.8}>
            {refreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh-outline" size={IconSize.sm} color="#ffffffAA" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Amount */}
      {loading ? (
        <Skeleton width={220} height={48} radius={Radius.lg} borderColor={skelClrBorder} />
      ) : (
        <View style={heroSt.amountWrap}>
          <Text
            style={[heroSt.amount, { fontSize: compact ? Typography['2xl'] : fontSize }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.55}
          >
            {hidden ? '$ ••••••••' : formatUsd(totalUsd)}
          </Text>
          <Text style={heroSt.balanceTag}>Total Balance</Text>
        </View>
      )}

      {/* Stat pills */}
      <View style={heroSt.pillsRow}>
        {loading ? (
          <>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={62} radius={Radius.lg} borderColor={skelClrBorder} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={62} radius={Radius.lg} borderColor={skelClrBorder} />
            </View>
          </>
        ) : (
          <>
            <HeroStatPill
              icon="lock-open-outline"
              label="Available"
              value={formatUsd(totalAvailableUsd)}
              iconColor="#A8F0D4"
              hidden={hidden}
            />
            <HeroStatPill
              icon="lock-closed-outline"
              label="Locked"
              value={formatUsd(totalLockedUsd)}
              iconColor="#FFD080"
              hidden={hidden}
            />
          </>
        )}
      </View>

      {/* Quick actions */}
      <View style={heroSt.actionsRow}>
        {ACTIONS.map(({ icon, label, route }) => (
          <TouchableOpacity
            key={label}
            onPress={() => onNavigate(route)}
            activeOpacity={0.75}
            style={heroSt.actionBtn}
          >
            <View style={[heroSt.actionCircle, compact && heroSt.actionCircleCompact]}>
              <Ionicons
                name={icon as any}
                size={compact ? IconSize.sm : IconSize.md}
                color="#FFFFFF"
              />
            </View>
            <Text style={heroSt.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </LinearGradient>
  );
}

const heroSt = StyleSheet.create({
  card: {
    borderRadius: Radius['3xl'],
    padding: Spacing[6],
    gap: Spacing[5],
    overflow: 'hidden',
    position: 'relative',
  },
  cardCompact: {
    padding: Spacing[4],
    gap: Spacing[4],
    borderRadius: Radius['2xl'],
  },
  decorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#ffffff08',
    top: -40,
    right: -40,
  },
  decorCircle2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ffffff06',
    bottom: -30,
    left: -20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  walletIconWrap: {
    width: IconBox.xs,
    height: IconBox.xs,
    borderRadius: Radius.md,
    backgroundColor: '#ffffff20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelText: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: '#ffffffAA',
  },
  headerActions: { flexDirection: 'row', gap: Spacing[2] },
  eyeBtn: {
    width: IconBox.sm,
    height: IconBox.sm,
    borderRadius: IconBox.sm / 2,
    backgroundColor: '#ffffff15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountWrap: { width: '100%', overflow: 'hidden', gap: 2, zIndex: 1 },
  amount: { fontWeight: Typography.extrabold, letterSpacing: -1, color: '#FFFFFF' },
  balanceTag: {
    fontSize: Typography.sm,
    fontWeight: Typography.medium,
    color: '#ffffffAA',
  },
  pillsRow: { flexDirection: 'row', gap: Spacing[2], zIndex: 1 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', zIndex: 1 },
  actionBtn: { alignItems: 'center', gap: Spacing[2] },
  actionCircle: {
    width: IconBox.lg,
    height: IconBox.lg,
    borderRadius: IconBox.lg / 2,
    backgroundColor: '#ffffff18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffffff30',
  },
  actionCircleCompact: {
    width: IconBox.md,
    height: IconBox.md,
    borderRadius: IconBox.md / 2,
  },
  actionLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: '#ffffffAA',
  },
});

// ─── Assets Section ───────────────────────────────────────────────────────────
function AssetsSection({
  colors,
  loading,
  hidden,
  activeTab,
  filteredAssets,
  onTabChange,
  compact = false,
}: {
  colors: AppColors;
  loading: boolean;
  hidden: boolean;
  activeTab: 'all' | 'locked';
  filteredAssets: DashboardAsset[];
  onTabChange: (tab: 'all' | 'locked') => void;
  compact?: boolean;
}) {
  const PRIMARY = colors.primary;
  const PRIMARY_DIM = colors.primaryDim;

  return (
    <View style={{ gap: Spacing[3] }}>
      {/* Header row */}
      <View style={secSt.header}>
        <Text style={[secSt.title, { color: colors.text }, compact && secSt.titleCompact]}>
          My Assets
        </Text>
        <View style={[secSt.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {(['all', 'locked'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => onTabChange(t)}
              activeOpacity={0.8}
              style={[
                secSt.tabBtn,
                activeTab === t && {
                  backgroundColor: PRIMARY_DIM,
                  borderColor: PRIMARY,
                  borderWidth: 1,
                },
              ]}
            >
              <Text
                style={[
                  secSt.tabText,
                  { color: activeTab === t ? PRIMARY : colors.text2 },
                  activeTab === t && { fontWeight: Typography.bold },
                ]}
              >
                {t === 'all' ? 'All' : 'Locked'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Count badge */}
      {!loading && (
        <View
          style={[secSt.countBadge, { backgroundColor: PRIMARY_DIM, borderColor: colors.border }]}
        >
          <Ionicons name="layers-outline" size={IconSize.xs} color={PRIMARY} />
          <Text style={[secSt.countText, { color: PRIMARY }]}>
            {filteredAssets.length} asset{filteredAssets.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Asset list */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <SkeletonAssetCard key={i} colors={colors} />
        ))
      ) : filteredAssets.length === 0 ? (
        <View
          style={[secSt.empty, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[secSt.emptyIconWrap, { backgroundColor: PRIMARY_DIM }]}>
            <Ionicons name="lock-closed-outline" size={IconSize['2xl']} color={PRIMARY} />
          </View>
          <Text style={[secSt.emptyTitle, { color: colors.text }]}>No locked assets</Text>
          <Text style={[secSt.emptyText, { color: colors.text2 }]}>
            All your funds are currently available
          </Text>
        </View>
      ) : (
        filteredAssets.map((asset, idx) => (
          <AssetCard
            key={`${asset.symbol}-${asset.chainId}-${idx}`}
            asset={asset}
            colors={colors}
            hidden={hidden}
            compact={compact}
            onPress={() => {}}
          />
        ))
      )}
    </View>
  );
}

const secSt = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: Typography.lg, fontWeight: Typography.extrabold },
  titleCompact: { fontSize: Typography.base },
  tabRow: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    padding: 3,
    gap: 3,
    borderWidth: 1,
  },
  tabBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.lg,
  },
  tabText: { fontSize: Typography.sm, fontWeight: Typography.medium },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  countText: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[12],
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: Spacing[3],
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[1],
  },
  emptyTitle: { fontSize: Typography.md, fontWeight: Typography.bold },
  emptyText: { fontSize: Typography.sm, textAlign: 'center' },
});

// ─── Web Side Panel ───────────────────────────────────────────────────────────
function WebPanel({
  colors,
  isDark,
  loading,
  hidden,
  totalUsd,
  totalAvailableUsd,
  totalLockedUsd,
  assets = [],
  onNavigate,
}: {
  colors: AppColors;
  isDark: boolean;
  loading: boolean;
  hidden: boolean;
  totalUsd?: string | number;
  totalAvailableUsd: string;
  totalLockedUsd: string;
  assets?: DashboardAsset[];
  onNavigate: (route: string) => void;
}) {
  const PRIMARY = colors.primary;
  const PRIMARY_DIM = colors.primaryDim;
  const ORANGE = colors.orange;
  const panelGradient = isDark ? PANEL_GRADIENT_DARK : PANEL_GRADIENT_LIGHT;

  const WEB_ACTIONS = [
    { icon: 'arrow-up-outline', label: 'Send', route: '/(screens)/send' },
    { icon: 'arrow-down-outline', label: 'Receive', route: '/(screens)/receive' },
    { icon: 'time-outline', label: 'History', route: '/(screens)/history' },
  ] as const;

  return (
    <View style={[wrpSt.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Panel header */}
      <View style={[wrpSt.panelHeader, { borderBottomColor: colors.border }]}>
        <LinearGradient colors={panelGradient} style={wrpSt.panelIcon}>
          <Ionicons name="stats-chart" size={IconSize.sm} color="#fff" />
        </LinearGradient>
        <Text style={[wrpSt.panelTitle, { color: colors.text }]}>Overview</Text>
      </View>

      {/* Stats */}
      {loading ? (
        <View style={{ gap: Spacing[4], padding: Spacing[4] }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} style={{ gap: Spacing[2] }}>
              <Skeleton width={80} height={11} borderColor={colors.border} />
              <Skeleton width={130} height={18} borderColor={colors.border} />
            </View>
          ))}
        </View>
      ) : (
        <View style={wrpSt.statsWrap}>
          {[
            {
              label: 'Total Portfolio',
              value: hidden ? '$ ••••••' : formatUsd(totalUsd),
              accent: true,
              dot: undefined as string | undefined,
            },
            {
              label: 'Available',
              value: hidden ? '$ ••••' : formatUsd(totalAvailableUsd),
              accent: false,
              dot: PRIMARY,
            },
            {
              label: 'Locked',
              value: hidden ? '$ ••••' : formatUsd(totalLockedUsd),
              accent: false,
              dot: ORANGE,
            },
          ].map(({ label, value, accent, dot }, i, arr) => (
            <React.Fragment key={label}>
              <View style={wrpSt.statItem}>
                <View style={wrpSt.statLabelRow}>
                  {dot && <View style={[wrpSt.statDot, { backgroundColor: dot }]} />}
                  <Text style={[wrpSt.statLabel, { color: colors.text2 }]}>{label}</Text>
                </View>
                <Text
                  style={[wrpSt.statValue, { color: accent ? PRIMARY : colors.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {value}
                </Text>
              </View>
              {i < arr.length - 1 && (
                <View style={[wrpSt.divider, { backgroundColor: colors.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Asset allocation */}
      {!loading && assets.length > 0 && (
        <>
          <View style={[wrpSt.divider, { backgroundColor: colors.border }]} />
          <Text style={[wrpSt.breakTitle, { color: colors.text2 }]}>Allocation</Text>
          <View style={{ gap: Spacing[3], paddingHorizontal: Spacing[4], paddingBottom: Spacing[2] }}>
            {assets.map((a, i) => {
              const [c1, c2] = getCoinColors(a.symbol);
              const total = parseFloat(String(totalUsd ?? '0'));
              const pct =
                total > 0
                  ? ((parseFloat(a.usdValue) / total) * 100).toFixed(1)
                  : '0.0';

              return (
                <View key={`${a.symbol}-${a.chainId}-${i}`} style={wrpSt.breakRow}>
                  <LinearGradient colors={[c1, c2]} style={wrpSt.breakIcon}>
                    <Text style={wrpSt.breakIconText}>{a.symbol[0]}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1, gap: Spacing[1] }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[wrpSt.breakSym, { color: colors.text }]}>
                        {a.symbol}
                        <Text style={[wrpSt.breakChain, { color: colors.text2 }]}>
                          {' '}{a.chainId}
                        </Text>
                      </Text>
                      <Text style={[wrpSt.breakPct, { color: PRIMARY }]}>{pct}%</Text>
                    </View>
                    <View style={[wrpSt.barBg, { backgroundColor: colors.border }]}>
                      <LinearGradient
                        colors={[PRIMARY, colors.purple ?? PRIMARY]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[wrpSt.barFill, { width: `${pct}%` as any }]}
                      />
                    </View>
                    <Text style={[wrpSt.breakUsd, { color: colors.text2 }]}>
                      {hidden ? '$ ••••' : formatUsd(a.usdValue)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Quick actions */}
      <View style={[wrpSt.divider, { backgroundColor: colors.border }]} />
      <View style={wrpSt.actions}>
        
      </View>
    </View>
  );
}

const wrpSt = StyleSheet.create({
  wrap: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    // width is set dynamically
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[4],
    borderBottomWidth: 1,
  },
  panelIcon: {
    width: IconBox.sm,
    height: IconBox.sm,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: { fontSize: Typography.base, fontWeight: Typography.bold },
  statsWrap: { padding: Spacing[4], gap: Spacing[3] },
  statItem: { gap: 3 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  statDot: { width: 7, height: 7, borderRadius: 4 },
  statLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  statValue: { fontSize: Typography.base, fontWeight: Typography.extrabold },
  divider: { height: 1 },
  breakTitle: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  breakIcon: {
    width: IconBox.xs,
    height: IconBox.xs,
    borderRadius: IconBox.xs / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  breakIconText: { fontSize: Typography.sm, fontWeight: Typography.extrabold, color: '#fff' },
  breakSym: { fontSize: Typography.sm, fontWeight: Typography.bold },
  breakChain: { fontSize: Typography.xs, fontWeight: Typography.medium },
  breakPct: { fontSize: Typography.sm, fontWeight: Typography.bold },
  barBg: { height: 5, borderRadius: Radius.xs, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: Radius.xs },
  breakUsd: { fontSize: Typography.xs },
  actions: { flexDirection: 'row', gap: Spacing[2], padding: Spacing[4], flexWrap: 'wrap' },
  actionBtn: {
    flex: 1,
    minWidth: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[1],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionText: { fontSize: Typography.xs, fontWeight: Typography.bold },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowSize();

  const PRIMARY = colors.primary;

  // Responsive layout decisions
  const isTablet = width >= BP.md;
  const isDesktop = width >= BP.lg;
  const isWideDesktop = width >= BP.xl;

  // Panel width: fluid, not fixed 300px
  const panelWidth = isWideDesktop ? 320 : isDesktop ? 280 : 240;

  const [hidden, setHidden] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'locked'>('all');

  const {
    data: dashboard,
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useWalletDashboard();

  const onRefresh = useCallback(() => { refetch(); }, [refetch]);
  const onToggleHidden = useCallback(() => { setHidden((h) => !h); }, []);
  const onNavigate = useCallback((route: string) => { router.push(route as any); }, [router]);
  const onTabChange = useCallback((tab: 'all' | 'locked') => { setActiveTab(tab); }, []);

  const totalAvailableUsd = useMemo(() => {
    if (!dashboard?.assets) return '0';
    return dashboard.assets
      .reduce((s: number, a: any) => s + parseFloat(a.totalAvailableUsd ?? '0'), 0)
      .toFixed(2);
  }, [dashboard]);

  const totalLockedUsd = useMemo(() => {
    if (!dashboard?.assets) return '0';
    return dashboard.assets
      .reduce((s: number, a: any) => s + parseFloat(a.totalLockUsd ?? '0'), 0)
      .toFixed(2);
  }, [dashboard]);

  const filteredAssets = useMemo((): DashboardAsset[] => {
    if (!dashboard?.assets) return [];
    if (activeTab === 'locked')
      return dashboard.assets.filter((a: any) => parseFloat(a.lockedBalance) > 0);
    return dashboard.assets;
  }, [dashboard, activeTab]);

  const heroProps: HeroCardProps = {
    isDark,
    colors: colors as unknown as AppColors,
    loading,
    hidden,
    refreshing,
    totalUsd: dashboard?.totalUsd,
    totalAvailableUsd,
    totalLockedUsd,
    onToggleHidden,
    onRefresh,
    onNavigate,
    compact: isDesktop && !isWideDesktop, // slightly compact on md desktop
  };

  // ── MOBILE ──────────────────────────────────────────────────────────────────
  if (!IS_WEB) {
    return (
      <View style={[shSt.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            shSt.mobileScroll,
            { paddingTop: insets.top + Spacing[4], paddingBottom: insets.bottom + 80 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        >
          <HeroCard {...heroProps} compact={false} />
          <View style={{ height: Spacing[6] }} />
          <AssetsSection
            colors={colors as unknown as AppColors}
            loading={loading}
            hidden={hidden}
            activeTab={activeTab}
            filteredAssets={filteredAssets}
            onTabChange={onTabChange}
          />
        </ScrollView>
      </View>
    );
  }

  // ── WEB – SMALL (< md): Single column, no panel ──────────────────────────
  if (!isTablet) {
    return (
      <View style={[shSt.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[webSt.singleColScroll]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        >
          <View style={webSt.singleCol}>
            <HeroCard {...heroProps} compact={false} />
            <View style={{ height: Spacing[6] }} />
            <AssetsSection
              colors={colors as unknown as AppColors}
              loading={loading}
              hidden={hidden}
              activeTab={activeTab}
              filteredAssets={filteredAssets}
              onTabChange={onTabChange}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── WEB – TABLET (md → lg): Two column, panel below hero ─────────────────
  if (!isDesktop) {
    return (
      <View style={[shSt.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={webSt.twoColScroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
          }
        >
          <View style={[webSt.twoColBody, { paddingHorizontal: Spacing[6] }]}>
            {/* LEFT: hero + assets */}
            <View style={webSt.leftCol}>
              <HeroCard {...heroProps} compact={false} />
              <View style={{ height: Spacing[5] }} />
              <AssetsSection
                colors={colors as unknown as AppColors}
                loading={loading}
                hidden={hidden}
                activeTab={activeTab}
                filteredAssets={filteredAssets}
                onTabChange={onTabChange}
              />
            </View>

            {/* RIGHT: panel */}
            <View style={{ width: 240 }}>
              <WebPanel
                colors={colors as unknown as AppColors}
                isDark={isDark}
                loading={loading}
                hidden={hidden}
                totalUsd={dashboard?.totalUsd}
                totalAvailableUsd={totalAvailableUsd}
                totalLockedUsd={totalLockedUsd}
                assets={dashboard?.assets}
                onNavigate={onNavigate}
              />
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── WEB – DESKTOP (≥ lg): Full layout, constrained max-width ─────────────
  return (
    <View style={[shSt.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={webSt.desktopScroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />
        }
      >
        {/* Centred wrapper */}
        <View
          style={[
            webSt.desktopBody,
            {
              maxWidth: isWideDesktop ? 1200 : 980,
              paddingHorizontal: isWideDesktop ? Spacing[10] : Spacing[8],
            },
          ]}
        >
          {/* LEFT COLUMN */}
          <View style={webSt.leftCol}>
            <HeroCard {...heroProps} />
            <View style={{ height: Spacing[6] }} />
            <AssetsSection
              colors={colors as unknown as AppColors}
              loading={loading}
              hidden={hidden}
              activeTab={activeTab}
              filteredAssets={filteredAssets}
              onTabChange={onTabChange}
            />
          </View>

          {/* RIGHT COLUMN — sticky panel */}
          <View style={{ width: panelWidth, flexShrink: 0 }}>
            <WebPanel
              colors={colors as unknown as AppColors}
              isDark={isDark}
              loading={loading}
              hidden={hidden}
              totalUsd={dashboard?.totalUsd}
              totalAvailableUsd={totalAvailableUsd}
              totalLockedUsd={totalLockedUsd}
              assets={dashboard?.assets}
              onNavigate={onNavigate}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Web layout styles ────────────────────────────────────────────────────────
const webSt = StyleSheet.create({
  // Small (single column)
  singleColScroll: {
    flexGrow: 1,
    alignItems: 'stretch',
  },
  singleCol: {
    padding: Spacing[4],
  },

  // Tablet (two column)
  twoColScroll: {
    flexGrow: 1,
    paddingVertical: Spacing[6],
  },
  twoColBody: {
    flexDirection: 'row',
    gap: Spacing[5],
    alignItems: 'flex-start',
    width: '100%',
  },

  // Desktop
  desktopScroll: {
    flexGrow: 1,
    paddingVertical: Spacing[8],
    alignItems: 'center',
  },
  desktopBody: {
    flexDirection: 'row',
    gap: Spacing[6],
    width: '100%',
    alignItems: 'flex-start',
  },

  leftCol: { flex: 1, minWidth: 0 },
});

// ─── Shared styles ────────────────────────────────────────────────────────────
const shSt = StyleSheet.create({
  root: { flex: 1 },
  mobileScroll: { paddingHorizontal: Spacing[4] },
});