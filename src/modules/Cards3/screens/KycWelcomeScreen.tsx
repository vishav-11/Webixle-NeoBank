// CardModule/screens/KycWelcomeScreen.tsx

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';

interface Props {
  onStart: () => void;
  onBack: () => void;
}

const REQUIREMENTS = [
  {
    icon: 'person-outline' as const,
    title: 'Personal Details',
    desc: 'Name, date of birth, nationality & phone number',
  },
  {
    icon: 'briefcase-outline' as const,
    title: 'Occupation & Income',
    desc: 'Job title, annual salary & expected transaction volume',
  },
  {
    icon: 'card-outline' as const,
    title: 'Government ID',
    desc: 'Passport, National ID or Driving License',
  },
  {
    icon: 'camera-outline' as const,
    title: 'Document Photos',
    desc: 'Clear photos of your ID (front, back) + selfie',
  },
  {
    icon: 'home-outline' as const,
    title: 'Residential Address',
    desc: 'Current home address with postal code',
  },
];

export default function KycWelcomeScreen({ onStart, onBack }: Props) {
  const { colors, isDark } = useTheme();
  const { scrollPaddingBottom, insets, hasBottomTab } = useLayout();

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          S.header,
          {
            paddingTop: insets.top,
            borderBottomColor: colors.borderSoft,
          },
        ]}
      >
        <TouchableOpacity
          onPress={onBack}
          hitSlop={12}
          style={[S.backBtn, { backgroundColor: colors.cardHover }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[S.headerTitle, { color: colors.text }]}>
            Card Verification
          </Text>
          <Text style={[S.headerSub, { color: colors.text2 }]}>
            One-time KYC process
          </Text>
        </View>

        <View style={[S.timeBadge, { backgroundColor: colors.cardHover }]}>
          <Ionicons name="time-outline" size={12} color={colors.primary} />
          <Text style={[S.timeText, { color: colors.primary }]}>~5 min</Text>
        </View>
      </View>

      {/* ── Scrollable content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          S.scroll,
          {
            // ✅ scrollPaddingBottom already includes BOTTOM_TAB_H for mobile/mobileWeb
            // CTA is inside scroll so content won't hide behind bottom nav
            paddingBottom: scrollPaddingBottom,
          },
        ]}
      >
        {/* Hero */}
        <LinearGradient
          colors={
            isDark
              ? ['#1E1458', '#2D1B6B', '#1A1040']
              : ['#7C5CFF', '#5B3FE8', '#4527C8']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.hero}
        >
          <View style={S.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={36} color="#fff" />
          </View>

          <Text style={S.heroTitle}>Verify your identity</Text>
          <Text style={S.heroSub}>
            To issue your card, we need to verify your identity. This is a
            secure, one-time process that takes around 5 minutes.
          </Text>

          <View style={S.statsRow}>
            <View style={S.stat}>
              <Text style={S.statNum}>256-bit</Text>
              <Text style={S.statLabel}>Encrypted</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.stat}>
              <Text style={S.statNum}>~5 min</Text>
              <Text style={S.statLabel}>Duration</Text>
            </View>
            <View style={S.statDivider} />
            <View style={S.stat}>
              <Text style={S.statNum}>1 time</Text>
              <Text style={S.statLabel}>Process</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Requirements */}
        <Text style={[S.sectionTitle, { color: colors.text }]}>
          What you'll need
        </Text>
        <Text style={[S.sectionSub, { color: colors.text2 }]}>
          Please prepare the following information
        </Text>

        <View style={S.requirementsList}>
          {REQUIREMENTS.map((item, index) => (
            <View
              key={item.title}
              style={[
                S.reqCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  S.reqIcon,
                  {
                    backgroundColor: isDark
                      ? colors.primary + '20'
                      : colors.primary + '15',
                  },
                ]}
              >
                <Ionicons name={item.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[S.reqTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text style={[S.reqDesc, { color: colors.text2 }]}>
                  {item.desc}
                </Text>
              </View>
              <View style={[S.reqNumber, { backgroundColor: colors.cardHover }]}>
                <Text style={[S.reqNumberText, { color: colors.text2 }]}>
                  {index + 1}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tips */}
        <View
          style={[
            S.tipsBox,
            {
              backgroundColor: isDark ? '#1A2744' : '#EFF6FF',
              borderColor: isDark ? '#1D3461' : '#BFDBFE',
            },
          ]}
        >
          <View style={S.tipsHeader}>
            <Ionicons name="bulb-outline" size={16} color={colors.blue} />
            <Text style={[S.tipsTitle, { color: colors.blue }]}>
              Important tips
            </Text>
          </View>
          {[
            'Documents must be valid and not expired',
            'Photos must be clear, well-lit and unobstructed',
            'All details must match your official ID',
          ].map((tip) => (
            <View key={tip} style={S.tipRow}>
              <View style={[S.tipDot, { backgroundColor: colors.blue }]} />
              <Text style={[S.tipText, { color: colors.text2 }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* Privacy */}
        <View style={[S.privacyRow, { borderTopColor: colors.borderSoft }]}>
          <Ionicons name="lock-closed-outline" size={13} color={colors.text2} />
          <Text style={[S.privacyText, { color: colors.text2 }]}>
            Your data is encrypted end-to-end and never shared without your consent.
          </Text>
        </View>

        {/* ✅ CTA inside ScrollView — avoids bottom nav overlap completely */}
        <View style={S.ctaContainer}>
          <TouchableOpacity
            activeOpacity={0.87}
            onPress={onStart}
            style={S.ctaBtn}
          >
            <LinearGradient
              colors={['#7C5CFF', '#5B3FE8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={S.ctaGradient}
            >
              <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
              <Text style={S.ctaText}>Start Verification</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          <Text style={[S.ctaNote, { color: colors.text2 }]}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    gap: Spacing[3],
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: Typography.base, fontWeight: '800' },
  headerSub: { fontSize: Typography.xs, marginTop: 2 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  timeText: { fontSize: 11, fontWeight: '700' },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[4],
  },

  // Hero
  hero: {
    borderRadius: Radius['2xl'],
    padding: Spacing[6],
    marginBottom: Spacing[5],
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing[3],
  },
  heroTitle: {
    fontSize: Typography.xl,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  heroSub: {
    fontSize: Typography.sm,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[3],
  },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statNum: { fontSize: Typography.sm, fontWeight: '800', color: '#fff' },
  statLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Section
  sectionTitle: {
    fontSize: Typography.base,
    fontWeight: '800',
    marginBottom: Spacing[1],
  },
  sectionSub: {
    fontSize: Typography.xs,
    marginBottom: Spacing[4],
  },

  // Requirements
  requirementsList: { gap: Spacing[3], marginBottom: Spacing[5] },
  reqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1,
  },
  reqIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    marginBottom: 2,
  },
  reqDesc: { fontSize: 11, lineHeight: 16 },
  reqNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reqNumberText: { fontSize: 11, fontWeight: '700' },

  // Tips
  tipsBox: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[4],
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginBottom: Spacing[1],
  },
  tipsTitle: { fontSize: Typography.sm, fontWeight: '700' },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[2],
  },
  tipDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 6,
  },
  tipText: { flex: 1, fontSize: Typography.xs, lineHeight: 18 },

  // Privacy
  privacyRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    paddingTop: Spacing[4],
    borderTopWidth: 1,
    alignItems: 'flex-start',
    marginBottom: Spacing[5],
  },
  privacyText: { flex: 1, fontSize: 11, lineHeight: 17 },

  // ✅ CTA inside scroll
  ctaContainer: {
    gap: Spacing[2],
  },
  ctaBtn: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
  },
  ctaText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '700',
  },
  ctaNote: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 17,
  },
});