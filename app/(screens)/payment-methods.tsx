// src/screens/PaymentMethodsScreen.tsx
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import {
  Radius, Spacing, Typography, IconSize, IconBox, getShadow,
} from '@/styles/theme';

import {
  usePaymentAccounts,
  useDeletePaymentAccount,
  useSetDefaultPaymentAccount,
  type UserPaymentAccount,
  type PaymentMethod,
} from '@/hooks/queires';

const IS_WEB = Platform.OS === 'web';

// ─── Method Colors ────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, [string, string]> = {
  GOOGLEPAY:     ['#4285f4', '#8A63FF'],
  GOOGLE_PAY:    ['#4285f4', '#8A63FF'],
  BANK:          ['#1e3a8a', '#3b82f6'],
  BANK_TRANSFER: ['#1e3a8a', '#3b82f6'],
  PAYPAL:        ['#003087', '#009cde'],
  UPI:           ['#6366f1', '#8b5cf6'],
};

const getMethodColors = (code: string): [string, string] =>
  METHOD_COLORS[code?.toUpperCase()] ?? ['#64748b', '#475569'];

const getMethodIcon = (code: string): string => {
  switch (code?.toUpperCase()) {
    case 'GOOGLEPAY':
    case 'GOOGLE_PAY':    return 'G';
    case 'BANK':
    case 'BANK_TRANSFER': return 'B';
    case 'PAYPAL':        return 'P';
    case 'UPI':           return 'U';
    default:              return code?.[0]?.toUpperCase() ?? '?';
  }
};

const getMethodName = (account: UserPaymentAccount): string => {
  const pm = account.paymentMethodId;
  if (typeof pm === 'object' && (pm as PaymentMethod)?.name)
    return (pm as PaymentMethod).name;
  return 'Payment Method';
};

const getMethodCode = (account: UserPaymentAccount): string => {
  const pm = account.paymentMethodId;
  if (typeof pm === 'object' && (pm as PaymentMethod)?.code)
    return (pm as PaymentMethod).code;
  return '';
};

// ─── Cross-platform confirm ───────────────────────────────────────────────────
const confirmAction = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else {
    const { Alert } = require('react-native');
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonBox({
  width, height, borderRadius = 8, style,
}: {
  width?: number | string;
  height: number;
  borderRadius?: number;
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

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });

  return (
    <Animated.View
      style={[
        { width: width ?? '100%', height, borderRadius, backgroundColor: '#334155', opacity },
        style,
      ]}
    />
  );
}

function AccountCardSkeleton({ colors }: { colors: any }) {
  return (
    <View style={[sk.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sk.topRow}>
        <SkeletonBox width={46} height={46} borderRadius={14} />
        <View style={{ flex: 1, gap: 6 }}>
          <SkeletonBox width={120} height={13} borderRadius={6} />
          <SkeletonBox width={80}  height={10} borderRadius={5} />
        </View>
      </View>
      <SkeletonBox height={46} borderRadius={10} />
      <View style={sk.actionsRow}>
        <SkeletonBox height={34} borderRadius={9} style={{ flex: 1 }} />
        <SkeletonBox height={34} borderRadius={9} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  topRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  actionsRow:  { flexDirection: 'row', gap: Spacing[2] },
});

// ─── Account Card ─────────────────────────────────────────────────────────────
function AccountCard({
  account, onDelete, onSetDefault,
  settingDefault, deleting, colors,
}: {
  account:        UserPaymentAccount;
  onDelete:       (id: string) => void;
  onSetDefault:   (id: string) => void;
  settingDefault: string | null;
  deleting:       string | null;
  colors:         any;
}) {
  const methodName       = getMethodName(account);
  const methodCode       = getMethodCode(account);
  const gradColors       = getMethodColors(methodCode);
  const icon             = getMethodIcon(methodCode);
  const isSettingDefault = settingDefault === account._id;
  const isDeleting       = deleting       === account._id;
  const fieldPreviews    = Object.entries(account.fieldValues || {}).slice(0, 2);

  return (
    <View
      style={[
        ac.card,
        { backgroundColor: colors.card, borderColor: colors.border },
        account.isDefault && {
          borderColor:     colors.primary,
          backgroundColor: colors.primaryDim,
        },
      ]}
    >
      {/* Default badge */}
      {account.isDefault && (
        <View style={[ac.defaultBadge, { backgroundColor: colors.primaryDim }]}>
          <Ionicons name="star" size={10} color={colors.primary} />
          <Text style={[ac.defaultBadgeTxt, { color: colors.primary }]}>Default</Text>
        </View>
      )}

      {/* Top row */}
      <View style={ac.topRow}>
        <LinearGradient colors={gradColors} style={ac.methodIcon}>
          <Text style={ac.methodIconTxt}>{icon}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[ac.label, { color: colors.text }]} numberOfLines={1}>
            {account.label || methodName}
          </Text>
          <Text style={[ac.methodName, { color: colors.text2 }]} numberOfLines={1}>
            {methodName}
          </Text>
        </View>
      </View>

      {/* Field previews */}
      {fieldPreviews.length > 0 && (
        <View style={[ac.fieldBox, { backgroundColor: colors.surface }]}>
          {fieldPreviews.map(([key, value]) => (
            <View key={key} style={ac.fieldRow}>
              <Text style={[ac.fieldKey, { color: colors.text3 }]}>
                {key.replace(/_/g, ' ')}
              </Text>
              <Text style={[ac.fieldVal, { color: colors.text2 }]} numberOfLines={1}>
                {value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={ac.actions}>
        {!account.isDefault && (
          <TouchableOpacity
            style={[ac.btnOutline, {
              borderColor:     colors.primary,
              backgroundColor: colors.primaryDim,
            }]}
            onPress={() => onSetDefault(account._id)}
            disabled={isSettingDefault || isDeleting}
            activeOpacity={0.8}
          >
            {isSettingDefault
              ? <ActivityIndicator size={12} color={colors.primary} />
              : <Ionicons name="star-outline" size={IconSize.xs} color={colors.primary} />
            }
            <Text style={[ac.btnOutlineTxt, { color: colors.primary }]}>Set Default</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            ac.btnDanger,
            {
              borderColor:     colors.redBorder,
              backgroundColor: colors.redDim,
            },
            (isDeleting || isSettingDefault) && { opacity: 0.5 },
          ]}
          onPress={() => onDelete(account._id)}
          disabled={isDeleting || isSettingDefault}
          activeOpacity={0.8}
        >
          {isDeleting
            ? <ActivityIndicator size={12} color={colors.red} />
            : <Ionicons name="trash-outline" size={IconSize.xs} color={colors.red} />
          }
          <Text style={[ac.btnDangerTxt, { color: colors.red }]}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ac = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    gap: Spacing[3],
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  defaultBadgeTxt: { fontSize: Typography.xs, fontWeight: '700' },

  topRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  methodIcon:  {
    width: IconBox.md, height: IconBox.md,
    borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  methodIconTxt: { fontSize: Typography.lg, fontWeight: '800', color: '#FFF' },
  label:       { fontSize: Typography.base, fontWeight: '700' },
  methodName:  { fontSize: Typography.xs, marginTop: 2, fontWeight: '500' },

  fieldBox:   { borderRadius: Radius.lg, padding: Spacing[3], gap: Spacing[2] },
  fieldRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldKey:   { fontSize: Typography.xs, fontWeight: '600', textTransform: 'capitalize', flex: 1 },
  fieldVal:   { fontSize: Typography.xs, fontWeight: '600', flex: 2, textAlign: 'right' },

  actions:    { flexDirection: 'row', gap: Spacing[2] },
  btnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], paddingVertical: Spacing[2],
    borderRadius: Radius.lg, borderWidth: 1,
  },
  btnOutlineTxt: { fontSize: Typography.xs, fontWeight: '700' },

  btnDanger: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing[2], paddingVertical: Spacing[2],
    borderRadius: Radius.lg, borderWidth: 1,
  },
  btnDangerTxt: { fontSize: Typography.xs, fontWeight: '700' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PaymentMethodsScreen() {
  const { colors, isDark } = useTheme();
  const router             = useRouter();
  const insets             = useSafeAreaInsets();

  const {
    data: accounts = [],
    isLoading:    loading,
    isRefetching: refreshing,
    refetch,
  } = usePaymentAccounts();

  const deleteMutation     = useDeletePaymentAccount();
  const setDefaultMutation = useSetDefaultPaymentAccount();

  const [settingDefaultId, setSettingDefaultId] = React.useState<string | null>(null);
  const [deletingId,       setDeletingId]       = React.useState<string | null>(null);

  const handleSetDefault = async (id: string) => {
    setSettingDefaultId(id);
    try { await setDefaultMutation.mutateAsync(id); }
    finally { setSettingDefaultId(null); }
  };

  const handleDelete = (id: string) => {
    confirmAction(
      'Remove Account',
      'Are you sure you want to remove this payment account?',
      async () => {
        setDeletingId(id);
        try { await deleteMutation.mutateAsync(id); }
        finally { setDeletingId(null); }
      }
    );
  };

  const sortedAccounts = [...accounts].sort(
    (a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : 0),
  );

  // ── Header (transparent bg, blur-style) ──────────────────────────────────
  const Header = (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle={isDark ? 'light-content' : 'dark-content'} />
      <View
        style={[
          s.navbar,
          {
            paddingTop:      insets.top,
            borderBottomColor: colors.border,
            // ✅ Transparent header — content scrolls under it
            backgroundColor: 'transparent',
          },
        ]}
      >
        <View style={s.navbarInner}>
          {/* Back */}
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            style={[s.iconBtn, {
              backgroundColor: colors.surface,
              borderColor:     colors.border,
              ...getShadow(isDark, 'sm'),
            }]}
          >
            <Ionicons name="arrow-back" size={IconSize.sm} color={colors.text} />
          </TouchableOpacity>

          {/* Title */}
          <View style={s.titleBlock}>
            <Text style={[s.navTitle, { color: colors.text }]}>Payment Methods</Text>
            <Text style={[s.navSub, { color: colors.text2 }]}>
              {accounts.length} account{accounts.length !== 1 ? 's' : ''} saved
            </Text>
          </View>

          {/* Add */}
          <TouchableOpacity
            onPress={() => router.push('/add-payment-method')}
            activeOpacity={0.8}
            style={[s.iconBtn, {
              backgroundColor: colors.primaryDim,
              borderColor:     colors.primaryBorder,
              ...getShadow(isDark, 'sm'),
            }]}
          >
            <Ionicons name="add" size={IconSize.sm} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        {Header}
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <AccountCardSkeleton key={i} colors={colors} />
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (sortedAccounts.length === 0) {
    return (
      <View style={[s.root, { backgroundColor: colors.bg }]}>
        {Header}
        <View style={s.emptyWrap}>
          <View style={[s.emptyIconOuter, { borderColor: colors.primaryBorder }]}>
            <View style={[s.emptyIconInner, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="card-outline" size={IconSize.xl} color={colors.primary} />
            </View>
          </View>
          <Text style={[s.emptyTitle, { color: colors.text }]}>
            No Payment Accounts
          </Text>
          <Text style={[s.emptySub, { color: colors.text2 }]}>
            Add your payment details to receive funds quickly
          </Text>
          <TouchableOpacity
            style={s.fullBtn}
            onPress={() => router.push('/add-payment-method')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              style={s.emptyBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="add" size={IconSize.sm} color="#fff" />
              <Text style={s.emptyBtnTxt}>Add Payment Method</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {Header}
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Info banner */}
        <View style={[s.infoBanner, {
          backgroundColor: colors.primaryDim,
          borderColor:     colors.primaryBorder,
        }]}>
          <Ionicons name="shield-checkmark-outline" size={IconSize.xs} color={colors.primary} />
          <Text style={[s.infoBannerTxt, { color: colors.text2 }]}>
            Your payment details are encrypted and secure
          </Text>
        </View>

        {/* Cards */}
        {sortedAccounts.map(item => (
          <AccountCard
            key={item._id}
            account={item}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
            settingDefault={settingDefaultId}
            deleting={deletingId}
            colors={colors}
          />
        ))}

        {/* Add more */}
        <TouchableOpacity
          style={[s.addMoreBtn, { borderColor: colors.primaryBorder }]}
          onPress={() => router.push('/add-payment-method')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={IconSize.sm} color={colors.primary} />
          <Text style={[s.addMoreTxt, { color: colors.primary }]}>
            Add Another Method
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    // ✅ no backgroundColor here — set inline as 'transparent'
  },
  navbarInner: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing[4],
    paddingBottom:     Spacing[3],
    minHeight:         56,
  },
  iconBtn: {
    width:          IconBox.sm,
    height:         IconBox.sm,
    borderRadius:   IconBox.sm / 2,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1, alignItems: 'center' },
  navTitle:   { fontSize: Typography.base, fontWeight: '700' },
  navSub:     { fontSize: Typography.xs, marginTop: 1 },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {
    padding:       Spacing[4],
    paddingBottom: Spacing[10],
  },

  // ── Info banner ───────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing[2],
    borderRadius:    Radius.lg,
    padding:         Spacing[3],
    marginBottom:    Spacing[4],
    borderWidth:     1,
  },
  infoBannerTxt: { fontSize: Typography.xs, flex: 1, fontWeight: '500' },

  // ── Add more ──────────────────────────────────────────────────────────────
  addMoreBtn: {
    marginTop:      Spacing[2],
    borderRadius:   Radius.xl,
    borderWidth:    1.5,
    borderStyle:    'dashed',
    paddingVertical: Spacing[4],
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing[2],
  },
  addMoreTxt: { fontSize: Typography.sm, fontWeight: '700' },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyWrap: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    padding:        Spacing[8],
    gap:            Spacing[4],
  },
  emptyIconOuter: {
    width:          96,
    height:         96,
    borderRadius:   48,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyIconInner: {
    width:          76,
    height:         76,
    borderRadius:   38,
    alignItems:     'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: Typography.lg, fontWeight: '700' },
  emptySub:   { fontSize: Typography.sm, textAlign: 'center', lineHeight: Typography.lineHeightBase },
  fullBtn:    { width: '100%' },
  emptyBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius:   Radius['2xl'],
  },
  emptyBtnTxt: { fontSize: Typography.base, fontWeight: '700', color: '#FFFFFF' },
});