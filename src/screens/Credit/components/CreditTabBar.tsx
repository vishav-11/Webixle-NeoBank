import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography, type ColorScheme } from '@/styles/theme';

export type CreditTab = 'dashboard' | 'add' | 'repay' | 'history';

const TABS: { id: CreditTab; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'add',       label: 'Add'       },
  { id: 'repay',     label: 'Repay'     },
  { id: 'history',   label: 'History'   },
];

interface Props {
  active:   CreditTab;
  onChange: (tab: CreditTab) => void;
}

export default function CreditTabBar({ active, onChange }: Props) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tb.scroll}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            style={[
              tb.pill,
              {
                backgroundColor: isActive ? colors.primary       : colors.surface,
                borderColor:     isActive ? colors.primaryBorder : colors.border,
              },
            ]}
            activeOpacity={0.75}
          >
            <Text
              style={[
                tb.label,
                { color: isActive ? '#fff' : colors.text2 },
                isActive && { fontWeight: Typography.bold },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const tb = StyleSheet.create({
  scroll: { paddingHorizontal: Spacing[4], gap: Spacing[2], paddingVertical: Spacing[1] },
  pill:   { paddingHorizontal: Spacing[5], paddingVertical: Spacing[2] + 2, borderRadius: Radius.full, borderWidth: 1.5 },
  label:  { fontSize: Typography.sm, fontWeight: Typography.semibold },
});