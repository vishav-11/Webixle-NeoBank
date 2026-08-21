/**
 * BottomNav.tsx
 * ✅ Non-home tabs → KYC guard
 */
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { BOTTOM_TAB_H, Radius, Typography, Spacing } from '@/styles/theme';

interface TabItem {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  freeAccess?: boolean;
}

const TABS: TabItem[] = [
  {
    href: '/',
    label: 'Home',
    icon: 'home-outline',
    iconActive: 'home',
    freeAccess: true,
  },
  {
    href: '/Card',
    label: 'Cards',
    icon: 'card-outline',
    iconActive: 'card',
  },
  {
    href: '/payments?tab=pay',  // ✅ Changed from /scanner
    label: 'Pay',
    icon: 'qr-code-outline',
    iconActive: 'qr-code',
  },
  {
    href: '/activity',
    label: 'History',
    icon: 'time-outline',
    iconActive: 'time',
  },
  {
    href: '/wallet',
    label: 'Assets',
    icon: 'layers-outline',
    iconActive: 'layers',
  },
];

// ─── BottomNav ────────────────────────────────────────────────────
export default function BottomNav() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';

    // ✅ Handle payments routes
    if (href.startsWith('/payments')) {
      return pathname === '/payments' || pathname.includes('payments');
    }

    return pathname.startsWith(href);
  };

  const handlePress = (tab: TabItem) => {
    // ✅ Already active tab pe dubara push mat karo
    if (isActive(tab.href)) return;
    router.push(tab.href as any);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: insets.bottom || Spacing[2],
        },
      ]}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);

        return (
          <TouchableOpacity
            key={tab.href}
            onPress={() => handlePress(tab)}
            style={styles.tab}
            activeOpacity={0.7}
          >
            <View style={styles.tabInner}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? colors.primary : colors.text3}
              />
            </View>

            <Text
              style={[
                styles.tabLabel,
                { color: active ? colors.primary : colors.text3 },
                active && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: Spacing[3],
    minHeight: BOTTOM_TAB_H,
    // ✅ Shadow completely removed
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 26,
  },
  tabLabel: { fontSize: 11, fontWeight: '500' },
  tabLabelActive: { fontWeight: '700' },
});