// CardModule/screens/CardPendingScreen.tsx

import React from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout'; // ✅

export default function CardPendingScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout(); // ✅

  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          S.scrollContent,
          {
            paddingBottom: scrollPaddingBottom, // ✅ platform aware
            paddingTop: insets.top + Spacing[4],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[S.iconWrap, { backgroundColor: colors.orangeDim }]}>
          <ActivityIndicator size="large" color={colors.orange} />
        </View>
        <Text style={[S.title, { color: colors.text }]}>
          Setting up your card
        </Text>
        <Text style={[S.subtitle, { color: colors.text2 }]}>
          Your card is being issued. This only takes a moment — we'll show it here as soon as it's ready.
        </Text>
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
  },
});