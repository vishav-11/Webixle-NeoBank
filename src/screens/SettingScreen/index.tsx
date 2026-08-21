// app/(app)/settings.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Switch, StyleSheet, SafeAreaView, Linking, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

// ─── Types ────────────────────────────────────────────────────────────────────
interface SettingsScreenProps {
  onClose?: () => void;
}

// ─── Section Label ────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  return (
    <Text style={[sl.txt, { color: colors.text2 }]}>{label}</Text>
  );
}
const sl = StyleSheet.create({
  txt: {
    fontSize:      Typography.xs,
    fontWeight:    '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  Spacing[2],
    marginLeft:    2,
  },
});

// ─── Arrow Row ────────────────────────────────────────────────────────────────
function RowArrow({
  icon, iconBg, label, sublabel, rightLabel, onPress, noBorder,
}: {
  icon: string; iconBg: string; label: string;
  sublabel?: string; rightLabel?: string;
  onPress?: () => void; noBorder?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[
        rs.row,
        { borderBottomColor: colors.border },
        noBorder && { borderBottomWidth: 0 },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[rs.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <View style={rs.mid}>
        <Text style={[rs.label, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[rs.sub, { color: colors.text2 }]}>{sublabel}</Text>
        )}
      </View>
      <View style={rs.right}>
        {rightLabel && (
          <Text style={[rs.rightLbl, { color: colors.text2 }]}>{rightLabel}</Text>
        )}
        <Ionicons name="chevron-forward" size={15} color={colors.text3} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────
function RowToggle({
  icon, iconBg, label, sublabel, value, onValueChange, noBorder,
}: {
  icon: string; iconBg: string; label: string;
  sublabel?: string; value: boolean;
  onValueChange: (v: boolean) => void; noBorder?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        rs.row,
        { borderBottomColor: colors.border },
        noBorder && { borderBottomWidth: 0 },
      ]}
    >
      <View style={[rs.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={18} color="#fff" />
      </View>
      <View style={rs.mid}>
        <Text style={[rs.label, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[rs.sub, { color: colors.text2 }]}>{sublabel}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.green }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

// ─── Shared row styles ────────────────────────────────────────────────────────
const rs = StyleSheet.create({
  row: {
    flexDirection:    'row',
    alignItems:       'center',
    paddingHorizontal: Spacing[3],
    paddingVertical:  Spacing[3],
    gap:              Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width:          36,
    height:         36,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  mid:      { flex: 1 },
  label:    { fontSize: Typography.sm, fontWeight: '600' },
  sub:      { fontSize: Typography.xs, marginTop: 1 },
  right:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rightLbl: { fontSize: Typography.xs },
});

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, colors }: { children: React.ReactNode; colors: any }) {
  return (
    <View style={[crd.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {children}
    </View>
  );
}
const crd = StyleSheet.create({
  card: {
    borderRadius:  Radius.lg,
    borderWidth:   1,
    overflow:      'hidden',
    marginBottom:  Spacing[4],
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const { colors }      = useTheme();
  const { user, logout } = useAuth();
  const router          = useRouter();

  // ── Toggle states ──
  const [biometrics,   setBiometrics]   = useState(true);
  const [txPin,        setTxPin]        = useState(true);
  const [pushNotifs,   setPushNotifs]   = useState(true);
  const [priceAlerts,  setPriceAlerts]  = useState(false);
  const [txNotifs,     setTxNotifs]     = useState(true);

  const handleSignOut = async () => {
    onClose?.();
    await logout();
  };

  // User info
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'User';
  const initials = fullName.slice(0, 2).toUpperCase();

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
      {/* BG Gradient */}
      <LinearGradient
        colors={colors.bgGradient as any}
        locations={colors.bgGradientPos as any}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Header ────────────────────────────────────────────── */}
        <View style={s.pageHdr}>
          <Text style={[s.pageTitle, { color: colors.text }]}>Settings</Text>
        </View>

        {/* ── Profile Card ────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(screens)/profile' as any)}
          activeOpacity={0.8}
        >
          {/* Avatar */}
          <LinearGradient
            colors={[colors.green, colors.blue]}
            style={s.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.avatarTxt}>{initials}</Text>
          </LinearGradient>

          {/* Info */}
          <View style={s.profileInfo}>
            <Text style={[s.profileName, { color: colors.text }]}>{fullName}</Text>
            <Text style={[s.profileEmail, { color: colors.text2 }]} numberOfLines={1}>
              {user?.email || '—'}
            </Text>
            {/* KYC badge */}
            <View style={[s.kycBadge, {
              backgroundColor: (user as any)?.kycStatus === 'Approved'
                ? colors.greenDim : colors.orangeDim,
            }]}>
              <Ionicons
                name={(user as any)?.kycStatus === 'Approved'
                  ? 'shield-checkmark' : 'shield-outline'}
                size={10}
                color={(user as any)?.kycStatus === 'Approved'
                  ? colors.green : colors.orange}
              />
              <Text style={[s.kycTxt, {
                color: (user as any)?.kycStatus === 'Approved'
                  ? colors.green : colors.orange,
              }]}>
                KYC {(user as any)?.kycStatus || 'Not Submitted'}
              </Text>
            </View>
          </View>

          {/* Arrow */}
          <View style={[s.editBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="chevron-forward" size={16} color={colors.green} />
          </View>
        </TouchableOpacity>

        {/* ── Security ────────────────────────────────────────────────── */}
        <SectionLabel label="Security" />
        <Card colors={colors}>
          <RowToggle
            icon="finger-print-outline"
            iconBg="#1A6A4A"
            label="Biometrics"
            sublabel="Face ID / Fingerprint"
            value={biometrics}
            onValueChange={setBiometrics}
          />
          <RowToggle
            icon="lock-closed-outline"
            iconBg="#8A6A1A"
            label="Transaction PIN"
            sublabel="Required on Send / Swap"
            value={txPin}
            onValueChange={setTxPin}
          />
          <RowArrow
            icon="key-outline"
            iconBg="#6B3AA8"
            label="Change Password"
            sublabel="Update your login password"
            onPress={() => router.push('/(screens)/change-password' as any)}
          />
          <RowArrow
            icon="shield-checkmark-outline"
            iconBg="#1A3A8A"
            label="Two-Factor Auth"
            sublabel={user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            rightLabel={user?.twoFactorEnabled ? 'ON' : 'OFF'}
            onPress={() => router.push('/(screens)/two-factor' as any)}
          />
          <RowArrow
            icon="time-outline"
            iconBg="#3A1A6A"
            label="Auto-Lock"
            sublabel="Lock after inactivity"
            rightLabel="Instant"
            onPress={() => {}}
            noBorder
          />
        </Card>

        {/* ── Preferences ─────────────────────────────────────────────── */}
        <SectionLabel label="Preferences" />
        <Card colors={colors}>
          <RowArrow
            icon="cash-outline"
            iconBg="#2A6A2A"
            label="Currency"
            sublabel="Display fiat as"
            rightLabel={(user as any)?.settings?.preferredCurrency || 'USD'}
            onPress={() => {}}
          />
          <RowArrow
            icon="language-outline"
            iconBg="#3A5A8A"
            label="Language"
            rightLabel={
              (user as any)?.settings?.language === 'en'
                ? 'English' : (user as any)?.settings?.language || 'English'
            }
            onPress={() => {}}
            noBorder
          />
        </Card>

        {/* ── Notifications ────────────────────────────────────────────── */}
        <SectionLabel label="Notifications" />
        <Card colors={colors}>
          <RowToggle
            icon="notifications-outline"
            iconBg="#1A6A2A"
            label="Push Notifications"
            sublabel="App-wide alerts"
            value={pushNotifs}
            onValueChange={setPushNotifs}
          />
          <RowToggle
            icon="pricetag-outline"
            iconBg="#8A5A1A"
            label="Price Alerts"
            sublabel="Crypto price movements"
            value={priceAlerts}
            onValueChange={setPriceAlerts}
          />
          <RowToggle
            icon="swap-horizontal-outline"
            iconBg="#1A4A6A"
            label="Transaction Alerts"
            sublabel="Send, receive, swap"
            value={txNotifs}
            onValueChange={setTxNotifs}
            noBorder
          />
        </Card>

        {/* ── Support & Legal ──────────────────────────────────────────── */}
        <SectionLabel label="Support & Legal" />
        <Card colors={colors}>
          <RowArrow
            icon="help-circle-outline"
            iconBg="#2A5A7A"
            label="Help Centre"
            sublabel="FAQs & guides"
            onPress={() => router.push('/(screens)/support' as any)}
          />
          <RowArrow
            icon="chatbubble-ellipses-outline"
            iconBg="#1A6A5A"
            label="Contact Support"
            sublabel="Chat with our team"
            onPress={() => {
              const email = 'support@yourapp.com';
              Linking.openURL(`mailto:${email}`);
            }}
          />
          <RowArrow
            icon="call-outline"
            iconBg="#4A2A8A"
            label="Call Support"
            sublabel="+1 800 000 0000"
            onPress={() => Linking.openURL('tel:+18000000000')}
          />
          <RowArrow
            icon="document-text-outline"
            iconBg="#3A6A1A"
            label="Terms of Service"
            onPress={() => Linking.openURL('https://yourapp.com/terms')}
          />
          <RowArrow
            icon="lock-open-outline"
            iconBg="#6A3A1A"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://yourapp.com/privacy')}
            noBorder
          />
        </Card>

        {/* ── App Info ────────────────────────────────────────────────── */}
        <SectionLabel label="App" />
        <Card colors={colors}>
          <RowArrow
            icon="information-circle-outline"
            iconBg="#3A3A6A"
            label="App Version"
            rightLabel="1.0.0"
            onPress={() => {}}
            noBorder
          />
        </Card>

        {/* ── Sign Out ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[s.signOutRow, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <View style={[s.soIcon, { backgroundColor: colors.redDim }]}>
            <Ionicons name="exit-outline" size={18} color={colors.red} />
          </View>
          <Text style={[s.soLabel, { color: colors.red }]}>Sign Out</Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.red}
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        <View style={{ height: Spacing[12] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:  { flex: 1 },
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop:        Spacing[4],
  },

  /* Page header */
  pageHdr: {
    marginBottom: Spacing[4],
  },
  pageTitle: {
    fontSize:   Typography['2xl'],
    fontWeight: '800',
  },

  /* Profile card */
  profileCard: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.xl,
    borderWidth:    1,
    padding:        Spacing[3],
    marginBottom:   Spacing[5],
    gap:            Spacing[3],
  },
  avatar: {
    width:          52,
    height:         52,
    borderRadius:   Radius.full,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },
  avatarTxt: {
    fontSize:   Typography.lg,
    fontWeight: '800',
    color:      '#fff',
  },
  profileInfo:  { flex: 1 },
  profileName:  { fontSize: Typography.base, fontWeight: '700' },
  profileEmail: { fontSize: Typography.xs, marginTop: 2, marginBottom: Spacing[1] },
  kycBadge: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            3,
    alignSelf:      'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius:   Radius.md,
    marginTop:      Spacing[1],
  },
  kycTxt: { fontSize: 10, fontWeight: '600' },
  editBtn: {
    width:          30,
    height:         30,
    borderRadius:   Radius.md,
    borderWidth:    1,
    alignItems:     'center',
    justifyContent: 'center',
    flexShrink:     0,
  },

  /* Sign out */
  signOutRow: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    borderWidth:    1,
    padding:        Spacing[3],
    gap:            Spacing[3],
    marginBottom:   Spacing[4],
  },
  soIcon: {
    width:          36,
    height:         36,
    borderRadius:   Radius.md,
    alignItems:     'center',
    justifyContent: 'center',
  },
  soLabel: { fontSize: Typography.base, fontWeight: '600' },
});