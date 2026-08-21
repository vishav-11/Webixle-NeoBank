/**
 * ReceiveMethodSelection.tsx
 * ✅ FIXED: Proper scrolling + fully responsive
 */

import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

const IS_WEB = Platform.OS === 'web';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReceiveMethodType = 'stablecoin' | 'crypto' | 'p2p' | 'usd_bank' | 'eu_bank';

interface ReceiveMethod {
  id: ReceiveMethodType;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  iconBg: string;
}

const RECEIVE_METHODS: ReceiveMethod[] = [
  {
    id: 'stablecoin',
    title: 'Stablecoin',
    subtitle: 'USDT, USDC, DAI',
    icon: 'shield-checkmark',
    gradient: ['#26A17B', '#1A8A66'],
    iconBg: '#26A17B22',
  },
  {
    id: 'crypto',
    title: 'Crypto',
    subtitle: 'BTC, ETH, BNB, TRX',
    icon: 'logo-bitcoin',
    gradient: ['#F7931A', '#E8830A'],
    iconBg: '#F7931A22',
  },
  {
    id: 'p2p',
    title: 'P2P Transfer',
    subtitle: 'From app users',
    icon: 'people',
    gradient: ['#627EEA', '#4A6DD8'],
    iconBg: '#627EEA22',
  },
  {
    id: 'usd_bank',
    title: 'USD Bank Transfer',
    subtitle: 'Receive USD via bank',
    icon: 'business',
    gradient: ['#10B981', '#059669'],
    iconBg: '#10B98122',
  },
  {
    id: 'eu_bank',
    title: 'EU Bank Transfer',
    subtitle: 'Receive EUR via SEPA',
    icon: 'card',
    gradient: ['#3B82F6', '#2563EB'],
    iconBg: '#3B82F622',
  },
];

export default function ReceiveMethodSelection() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleMethodPress = (methodId: ReceiveMethodType) => {
    router.push({
      pathname: '/receive',
      params: { receiveType: methodId },
    });
  };

  // ✅ Responsive card width calculation
  const horizontalPadding = Spacing[4];
  const cardGap = 12;
  
  const cardWidth = useMemo(() => {
    // For web: wider cards
    if (IS_WEB) {
      return (SCREEN_WIDTH - horizontalPadding * 2 - cardGap) / 3;
    }
    // For mobile: 2 column layout
    return (SCREEN_WIDTH - horizontalPadding * 2 - cardGap) / 2;
  }, []);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.bg }]}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      contentContainerStyle={{
        flexGrow: 1,
        paddingHorizontal: horizontalPadding,
        paddingVertical: Spacing[4],
        paddingBottom: Spacing[6] + insets.bottom,
      }}
    >
      <View style={styles.container}>
        {/* Header Description */}
        <View style={styles.headerSection}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Choose how you want to receive funds
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.text2 }]}>
            Select a payment method to get started
          </Text>
        </View>

        {/* Methods Grid */}
        <View style={styles.grid}>
          {RECEIVE_METHODS.map((method, index) => {
            const isLastOdd = 
              !IS_WEB && 
              RECEIVE_METHODS.length % 2 !== 0 && 
              index === RECEIVE_METHODS.length - 1;

            return (
              <TouchableOpacity
                key={method.id}
                onPress={() => handleMethodPress(method.id)}
                activeOpacity={0.75}
                style={[
                  styles.cardWrapper,
                  {
                    width: isLastOdd ? '100%' : cardWidth,
                  },
                ]}
              >
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Icon Section */}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: method.iconBg },
                    ]}
                  >
                    <Ionicons
                      name={method.icon}
                      size={24}
                      color={method.gradient[0]}
                    />
                  </View>

                  {/* Text Section */}
                  <View style={styles.textSection}>
                    <Text
                      style={[styles.methodTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {method.title}
                    </Text>
                    {method.subtitle && (
                      <Text
                        style={[styles.methodSubtitle, { color: colors.text2 }]}
                        numberOfLines={IS_WEB ? 1 : 2}
                      >
                        {method.subtitle}
                      </Text>
                    )}
                  </View>

                  {/* Arrow Icon */}
                  <View
                    style={[
                      styles.arrowContainer,
                      { backgroundColor: colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={colors.text3}
                    />
                  </View>

                  {/* Gradient Accent */}
                  <LinearGradient
                    colors={[method.gradient[0] + '0D', 'transparent']}
                    style={styles.gradientAccent}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Section */}
        {/* <View
          style={[
            styles.infoBox,
            {
              backgroundColor: colors.primaryDim,
              borderColor: colors.primaryBorder,
            },
          ]}
        >
          <View
            style={[
              styles.infoIconWrap,
              { backgroundColor: colors.primary + '22' },
            ]}
          >
            <Ionicons
              name="information-circle"
              size={16}
              color={colors.primary}
            />
          </View>
          <View style={styles.infoTextWrap}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>
              Quick Tip
            </Text>
            <Text style={[styles.infoText, { color: colors.primary }]}>
              Each method has different processing times and fees.
            </Text>
          </View>
        </View> */}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    gap: Spacing[4],
  },
  headerSection: {
    gap: Spacing[1],
  },
  headerTitle: {
    fontSize: Typography.base,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: Typography.xs,
    lineHeight: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: {},
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    padding: Spacing[3],
    gap: Spacing[2],
    minHeight: 130,
    position: 'relative',
    overflow: 'hidden',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textSection: {
    flex: 1,
    gap: 3,
  },
  methodTitle: {
    fontSize: Typography.sm,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  methodSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
  arrowContainer: {
    position: 'absolute',
    top: Spacing[2],
    right: Spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradientAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.6,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: Spacing[2],
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 32,
  },
  infoTextWrap: {
    flex: 1,
    gap: 2,
  },
  infoTitle: {
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  infoText: {
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.9,
  },
});