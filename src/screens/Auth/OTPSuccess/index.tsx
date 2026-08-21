/**
 * OTPSuccessScreen.tsx
 * ✅ Fully theme-aware (colors from theme) + responsive
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import {
  Spacing, Typography, Radius, IconSize, getShadow,
} from '@/styles/theme';

const IS_WEB = Platform.OS === 'web';

// ─── Animated Dots ────────────────────────────────────────────────────────────
function RedirectDots({ color }: { color: string }) {
  const dots = [
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  useEffect(() => {
    dots.forEach((dot, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 200),
          Animated.timing(dot, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 380, useNativeDriver: true }),
        ]),
      ).start();
    });
  }, []);

  return (
    <View style={dot.row}>
      {dots.map((anim, i) => (
        <Animated.View
          key={i}
          style={[dot.dot, { backgroundColor: color, opacity: anim }]}
        />
      ))}
    </View>
  );
}

const dot = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OTPSuccessScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();

  // ── Responsive ───────────────────────────────────────────────────────────
  const isTablet = width >= 600;
  const cardMaxWidth = isTablet ? 440 : 400;

  // ── Animations ───────────────────────────────────────────────────────────
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(28)).current;

  useEffect(() => {
    // 1. Pop check circle in
    Animated.spring(scaleAnim, {
      toValue: 1, tension: 80, friction: 6, useNativeDriver: true,
    }).start();

    // 2. Fade + slide text up
    Animated.sequence([
      Animated.delay(280),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 480, useNativeDriver: true }),
      ]),
    ]).start();

    // 3. Redirect after 2.8s
    const timer = setTimeout(
      () => router.replace('/(auth)/login' as any),
      2800,
    );
    return () => clearTimeout(timer);
  }, []);

  // ── Derived theme colors (all from colors.*) ──────────────────────────────
  const bgGrad = isDark
    ? ['#1C1030', '#10081D', '#08050D'] as const
    : ['#8B5CF6', '#6D3CE8', '#4B2AD1'] as const;
  const bgGradPos = isDark
    ? [0, 0.48, 1] as const
    : [0, 0.5, 1] as const;

  const cardBg = isDark ? colors.card : 'rgba(255,255,255,0.95)';
  const cardBd = isDark ? colors.border : colors.primaryBorder;

  // check icon fg — dark bg on dark (so white icon), white bg on light
  const iconFg = isDark ? '#030E12' : '#FFFFFF';

  // glow ring colors
  const ringOuter = isDark ? colors.primaryDim : colors.primaryBorder;
  const ringInner = isDark ? colors.primaryBorder : colors.primaryDim;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient colors={bgGrad} locations={bgGradPos} style={s.root}>

        <View
          style={[
            s.card,
            {
              maxWidth: cardMaxWidth,
              backgroundColor: cardBg,
              borderColor: cardBd,
              ...getShadow(isDark, 'lg'),
            },
          ]}
        >
          {/* ── Animated check circle ───────────────────────────────────── */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            {/* Outer glow ring */}
            <View style={[s.ringOuter, { borderColor: ringOuter }]}>
              {/* Inner glow ring */}
              <View style={[s.ringInner, { borderColor: ringInner }]}>
                {/* Gradient check circle */}
                <LinearGradient
                  colors={[colors.primary, colors.primary]}
                  style={s.checkCircle}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="checkmark" size={IconSize['2xl']} color={iconFg} />
                </LinearGradient>
              </View>
            </View>
          </Animated.View>

          {/* ── Animated text block ─────────────────────────────────────── */}
          <Animated.View
            style={[
              s.textBlock,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Badge */}
            <View style={[s.badge, { backgroundColor: colors.primaryDim }]}>
              <View style={[s.badgeDot, { backgroundColor: colors.primary }]} />
              <Text style={[s.badgeTxt, { color: colors.primary }]}>
                VERIFIED
              </Text>
            </View>

            {/* Title */}
            <Text style={[s.title, { color: colors.text }]}>
              Email Verified!
            </Text>

            {/* Subtitle */}
            <Text style={[s.subtitle, { color: colors.text2 }]}>
              Your account has been verified{'\n'}successfully.
            </Text>

            {/* Divider */}
            <View style={[s.divider, { backgroundColor: colors.border }]} />

            {/* Redirect row */}
            <View style={s.redirectRow}>
              <RedirectDots color={colors.primary} />
              <Text style={[s.redirectTxt, { color: colors.text3 }]}>
                Redirecting to login…
              </Text>
            </View>
          </Animated.View>
        </View>

      </LinearGradient>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const RING_OUTER = 152;
const RING_INNER = 124;
const CIRCLE = 100;

const s = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[5],
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    paddingHorizontal: IS_WEB ? Spacing[8] : Spacing[6],
    paddingVertical: IS_WEB ? Spacing[12] : Spacing[10],
    gap: Spacing[4],
  },

  // ── Glow rings ────────────────────────────────────────────────────────────
  ringOuter: {
    width: RING_OUTER,
    height: RING_OUTER,
    borderRadius: RING_OUTER / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: RING_INNER,
    height: RING_INNER,
    borderRadius: RING_INNER / 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Text block ────────────────────────────────────────────────────────────
  textBlock: {
    alignItems: 'center',
    gap: Spacing[3],
    width: '100%',
  },

  // ── Badge ─────────────────────────────────────────────────────────────────
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[1],
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeTxt: {
    fontSize: Typography.xs,
    fontWeight: '800',
    letterSpacing: 2,
  },

  // ── Title / subtitle ──────────────────────────────────────────────────────
  title: {
    fontSize: IS_WEB ? Typography.xl : Typography.lg,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeightBase,
  },

  // ── Divider ───────────────────────────────────────────────────────────────
  divider: {
    width: '60%',
    height: StyleSheet.hairlineWidth,
  },

  // ── Redirect ──────────────────────────────────────────────────────────────
  redirectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  redirectTxt: {
    fontSize: Typography.xs,
  },
});