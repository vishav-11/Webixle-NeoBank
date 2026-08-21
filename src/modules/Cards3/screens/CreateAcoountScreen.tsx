// CardModule/screens/CreateAccountScreen.tsx

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useCreateInterlaceAccount } from '../hooks';

// ✅ Helper: check if error means account already exists
function isAlreadyExistsError(err: any): boolean {
  const msg = (
    err?.response?.data?.message ??
    err?.message ??
    ''
  ).toLowerCase();
  return (
    msg.includes('already exists') ||
    msg.includes('account already created') ||
    msg.includes('already have an account')
  );
}

export default function CreateAccountScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout();
  const createAccount = useCreateInterlaceAccount();
  const [error, setError] = useState<string | null>(null);

  // ✅ Auto-trigger on mount
  useEffect(() => {
    handleCreate();
  }, []);

  const handleCreate = () => {
    setError(null);
    createAccount.mutate(undefined, {
      onSuccess: () => {
        // ✅ Normal success path
        onCreated();
      },
      onError: (err: any) => {
        // ✅ "Already exists" = treat as success, not an error
        if (isAlreadyExistsError(err)) {
          onCreated();
          return;
        }

        // Real error — show retry UI
        setError(
          err?.response?.data?.message ??
          err?.message ??
          'Could not create your card account. Please try again.',
        );
      },
    });
  };

  // ─── Derived display state ────────────────────────────────────────────────
  const isPending = createAccount.isPending;
  const hasError  = !!error;

  const iconName = hasError
    ? 'alert-circle-outline'
    : 'checkmark-circle-outline';

  const iconColor = hasError ? colors.red : colors.green;

  const title = isPending
    ? 'Creating your account...'
    : hasError
    ? 'Something went wrong'
    : 'KYC Approved!';

  const subtitle = isPending
    ? 'Your KYC is approved. We are setting up your card account. This will only take a moment.'
    : hasError
    ? error
    : 'Your account has been created successfully. Proceeding to card setup...';

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          S.scrollContent,
          {
            paddingBottom: scrollPaddingBottom,
            paddingTop: insets.top + Spacing[4],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Icon ── */}
        <LinearGradient
          colors={isDark ? ['#251A44', '#1D1236'] : ['#F0ECFF', '#FFFFFF']}
          style={S.iconWrap}
        >
          {isPending
            ? <ActivityIndicator size="large" color={colors.primary} />
            : <Ionicons name={iconName} size={40} color={iconColor} />}
        </LinearGradient>

        {/* ── Title ── */}
        <Text style={[S.title, { color: colors.text }]}>
          {title}
        </Text>

        {/* ── Subtitle ── */}
        <Text style={[S.subtitle, { color: colors.text2 }]}>
          {subtitle}
        </Text>

        {/* ── Retry button (only on real errors) ── */}
        {hasError && (
          <TouchableOpacity
            style={[S.cta, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={handleCreate}
            disabled={isPending}
          >
            {isPending
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="refresh-outline" size={18} color="#fff" />
                  <Text style={S.ctaText}>Try Again</Text>
                </>
              )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[6],
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[6],
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing[6],
  },
  cta: {
    width: '100%',
    paddingVertical: Spacing[4],
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: Typography.base,
    fontWeight: '700',
  },
});