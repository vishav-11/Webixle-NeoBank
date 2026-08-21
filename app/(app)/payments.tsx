/**
 * payments.tsx
 * ✅ FIXED: Fully responsive with proper scrolling for mobile & web
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

import ReceiveMethodSelection from '../../src/components/payment/ReceiveMethodSelection';
import PayTab from '../../src/components/payment/PayTab';

type TabType = 'receive' | 'pay';

const IS_WEB = Platform.OS === 'web';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PaymentsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const initialTab = (params.tab as TabType) || 'receive';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // ✅ Calculate available height for content
  const headerHeight = insets.top + 60; // Header space
  const tabSwitcherHeight = 60; // Tab switcher space
  const contentHeight = SCREEN_HEIGHT - headerHeight - tabSwitcherHeight;

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.bg,
          
        },
      ]}
    >
    
      {/* Tab Switcher */}
      <View
        style={[
          styles.tabSwitcherWrap,
          {
            backgroundColor: colors.bg,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View
          style={[
            styles.tabSwitcher,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              marginHorizontal: Spacing[4],
            },
          ]}
        >
          {/* Receive Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('receive')}
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'receive' && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={
                activeTab === 'receive'
                  ? 'arrow-down-circle'
                  : 'arrow-down-circle-outline'
              }
              size={18}
              color={activeTab === 'receive' ? '#fff' : colors.text2}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'receive' ? '#fff' : colors.text2,
                },
                activeTab === 'receive' && styles.tabBtnTextActive,
              ]}
            >
              Receive
            </Text>
          </TouchableOpacity>

          {/* Pay Tab */}
          <TouchableOpacity
            onPress={() => setActiveTab('pay')}
            activeOpacity={0.8}
            style={[
              styles.tabBtn,
              activeTab === 'pay' && {
                backgroundColor: colors.primary,
              },
            ]}
          >
            <Ionicons
              name={activeTab === 'pay' ? 'qr-code' : 'qr-code-outline'}
              size={18}
              color={activeTab === 'pay' ? '#fff' : colors.text2}
            />
            <Text
              style={[
                styles.tabBtnText,
                {
                  color: activeTab === 'pay' ? '#fff' : colors.text2,
                },
                activeTab === 'pay' && styles.tabBtnTextActive,
              ]}
            >
              Pay
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Content - Scrollable */}
      <View
        style={[
          styles.tabContentWrapper,
          {
            height: contentHeight,
          },
        ]}
      >
        {activeTab === 'receive' ? (
          <ReceiveMethodSelection />
        ) : (
          <PayTab />
        )}
      </View>

      {/* Bottom padding for mobile */}
      {!IS_WEB && insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: colors.bg }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
    gap: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: '700',
  },
  tabSwitcherWrap: {
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[3],
    borderBottomWidth: 1,
  },
  tabSwitcher: {
    flexDirection: 'row',
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  tabBtnText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    fontWeight: '700',
  },
  tabContentWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
});