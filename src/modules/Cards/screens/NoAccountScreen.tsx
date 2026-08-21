// CardModule/screens/NoAccountScreen.tsx
// Ab yeh screen sirf "KYC karo" bolti hai
// Create account button nahi — kyunki KYC pehle hogi

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

export default function NoAccountScreen({
  onBack,
  onStartKyc, // ✅ KYC form pe le jao
}: {
  onBack: () => void;
  onStartKyc: () => void;
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + Spacing[2] }]}>
        <TouchableOpacity onPress={onBack} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>
        <Text style={[S.headerTitle, { color: colors.text }]}>Cards</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={S.body}>
        {/* Icon */}
        <LinearGradient
          colors={isDark ? ['#251A44', '#1D1236'] : ['#F0ECFF', '#FFFFFF']}
          style={S.iconWrap}
        >
          <Ionicons name="card-outline" size={40} color={colors.primary} />
        </LinearGradient>

        {/* Title */}
        <Text style={[S.title, { color: colors.text }]}>
          No Card Yet
        </Text>
        <Text style={[S.subtitle, { color: colors.text2 }]}>
          To get your card, you need to complete identity verification (KYC) first.
          Once approved, your card account will be set up automatically.
        </Text>

        {/* Steps */}
        <View style={[S.stepsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Step
            number="1"
            title="Complete KYC"
            subtitle="Verify your identity"
            done={false}
            colors={colors}
          />
          <View style={[S.stepDivider, { backgroundColor: colors.borderSoft }]} />
          <Step
            number="2"
            title="Account Created"
            subtitle="Interlace account setup"
            done={false}
            colors={colors}
          />
          <View style={[S.stepDivider, { backgroundColor: colors.borderSoft }]} />
          <Step
            number="3"
            title="Get Your Card"
            subtitle="Virtual or physical"
            done={false}
            colors={colors}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[S.cta, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
          onPress={onStartKyc}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color="#fff" />
          <Text style={S.ctaText}>Start KYC Verification</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Step component
function Step({
  number, title, subtitle, done, colors,
}: {
  number: string; title: string; subtitle: string; done: boolean; colors: any;
}) {
  return (
    <View style={S.stepRow}>
      <View style={[
        S.stepBubble,
        { backgroundColor: done ? colors.primaryDim : colors.cardHover },
      ]}>
        {done
          ? <Ionicons name="checkmark" size={14} color={colors.primary} />
          : <Text style={[S.stepNum, { color: colors.text2 }]}>{number}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.stepTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[S.stepSub, { color: colors.text2 }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[4], paddingBottom: Spacing[3],
  },
  headerTitle: { fontSize: Typography.md, fontWeight: '700' },
  body: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[6],
  },
  title: {
    fontSize: Typography.xl, fontWeight: '800',
    textAlign: 'center', marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.sm, textAlign: 'center',
    lineHeight: 20, marginBottom: Spacing[6],
  },
  stepsCard: {
    width: '100%', borderRadius: Radius.xl, borderWidth: 1,
    paddingHorizontal: Spacing[4], marginBottom: Spacing[6],
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: Spacing[3], paddingVertical: Spacing[4],
  },
  stepDivider: { height: 1, marginHorizontal: -Spacing[4] },
  stepBubble: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: { fontSize: Typography.sm, fontWeight: '700' },
  stepTitle: { fontSize: Typography.sm, fontWeight: '700' },
  stepSub: { fontSize: Typography.xs, marginTop: 2 },
  cta: {
    width: '100%', paddingVertical: Spacing[4], borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});