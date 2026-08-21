import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Typography, Spacing, Radius } from '@/styles/theme';
import type { PageConfig } from '@/config/features';

// ─── Icons ───────────────────────────────────────────────────
import { Ionicons } from '@expo/vector-icons';

interface Props {
  config: PageConfig;
}

// color key → actual color from theme
const COLOR_MAP = (colors: any) => ({
  green:  { bg: colors.greenDim,   text: colors.green  },
  blue:   { bg: colors.blueDim,    text: colors.blue   },
  purple: { bg: colors.purpleDim,  text: colors.purple },
  orange: { bg: colors.orangeDim,  text: colors.orange },
  red:    { bg: colors.redDim,     text: colors.red    },
});

export default function ComingSoon({ config }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorMap = COLOR_MAP(colors);

  // ─── Animations ──────────────────────────────────────────────
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim  = useRef(new Animated.Value(0)).current;
  const dot1Anim  = useRef(new Animated.Value(0.3)).current;
  const dot2Anim  = useRef(new Animated.Value(0.3)).current;
  const dot3Anim  = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Entry
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 700, useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0, tension: 50, friction: 8, useNativeDriver: true,
      }),
    ]).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.09, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    // Glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();

    // Dots staggered
    const animDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1,   duration: 400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(900),
        ])
      ).start();

    animDot(dot1Anim, 0);
    animDot(dot2Anim, 280);
    animDot(dot3Anim, 560);
  }, []);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1], outputRange: [0.25, 0.7],
  });

  // ─── Handle Back ─────────────────────────────────────────────
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push('/(app)');
    }
  };

  return (
    <LinearGradient
      colors={colors.bgGradient as [string, string, ...string[]]}
      locations={colors.bgGradientPos as [number, number, ...number[]]}
      style={styles.container}
    >
      {/* ── Back Button ──────────────────────────────────────── */}
      <View style={[
        styles.header,
        {
          paddingTop: Platform.OS === 'web' ? Spacing[4] : insets.top + Spacing[2],
          paddingHorizontal: Spacing[5],
        },
      ]}>
        <TouchableOpacity
          onPress={handleBack}
          style={[
            styles.backButton,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* ── Content ───────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Platform.OS === 'web' ? Spacing[6] : Spacing[4],
            paddingBottom: Platform.OS === 'web'
              ? Spacing[10]
              : insets.bottom + Spacing[10],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Icon ─────────────────────────────────────── */}
          <View style={styles.iconWrapper}>
            <Animated.View
              style={[
                styles.glowRing,
                { borderColor: colors.green, opacity: glowOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.iconBox,
                {
                  borderColor: colors.greenBorder,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(0,211,149,0.22)', 'rgba(0,211,149,0.06)']}
                style={styles.iconGrad}
              >
                <Text style={styles.iconEmoji}>{config.icon}</Text>
              </LinearGradient>
            </Animated.View>
          </View>

          {/* ── Badge ────────────────────────────────────── */}
          <View
            style={[
              styles.badge,
              { backgroundColor: colors.greenDim, borderColor: colors.greenBorder },
            ]}
          >
            <Animated.View
              style={[
                styles.badgeDot,
                { backgroundColor: colors.green, opacity: glowAnim },
              ]}
            />
            <Text style={[styles.badgeText, { color: colors.green }]}>
              In Development
            </Text>
          </View>

          {/* ── Title ────────────────────────────────────── */}
          <Text style={[styles.title, { color: colors.text }]}>
            {config.title}
          </Text>
          <Text style={[styles.titleAccent, { color: colors.green }]}>
            {config.accent}
          </Text>

          {/* ── Description ──────────────────────────────── */}
          <Text style={[styles.description, { color: colors.text2 }]}>
            {config.description}
          </Text>

          {/* ── Features Card ────────────────────────────── */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {config.features.map((f, i) => {
              const c = colorMap[f.color as keyof typeof colorMap] ?? colorMap.green;
              return (
                <View
                  key={i}
                  style={[
                    styles.featureRow,
                    i < config.features.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderSoft,
                    },
                  ]}
                >
                  {/* icon */}
                  <View style={[styles.fIcon, { backgroundColor: c.bg }]}>
                    <Text style={styles.fEmoji}>{f.icon}</Text>
                  </View>

                  {/* text */}
                  <View style={styles.fText}>
                    <Text style={[styles.fName, { color: colors.text }]}>
                      {f.name}
                    </Text>
                    <Text style={[styles.fDesc, { color: colors.text2 }]}>
                      {f.desc}
                    </Text>
                  </View>

                  {/* soon pill */}
                  <View
                    style={[
                      styles.soonPill,
                      { backgroundColor: colors.greenDim, borderColor: colors.greenBorder },
                    ]}
                  >
                    <Text style={[styles.soonText, { color: colors.green }]}>
                      Soon
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* ── Animated Dots ────────────────────────────── */}
          <View style={styles.dotsRow}>
            <Text style={[styles.dotsLabel, { color: colors.text3 }]}>
              Working on it
            </Text>
            {[dot1Anim, dot2Anim, dot3Anim].map((a, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: colors.green, opacity: a },
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // ✅ Header with back button
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s',
      },
    }),
  },

  // ✅ Scroll with safe padding
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
  },

  // Icon
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  glowRing: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 10,
  },
  iconBox: {
    width: 90,
    height: 90,
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  iconGrad: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 40 },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginBottom: Spacing[3],
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    letterSpacing: 0.5,
  },

  // Title
  title: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  titleAccent: {
    fontSize: Typography['3xl'],
    fontWeight: Typography.bold,
    textAlign: 'center',
    marginBottom: Spacing[3],
    letterSpacing: -0.5,
  },

  // Desc
  description: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
    marginBottom: Spacing[6],
  },

  // Card
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing[6],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[4],
    gap: Spacing[3],
  },
  fIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fEmoji: { fontSize: 20 },
  fText: { flex: 1 },
  fName: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    marginBottom: 2,
  },
  fDesc: {
    fontSize: Typography.xs,
  },
  soonPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  soonText: {
    fontSize: 10,
    fontWeight: Typography.semibold,
  },

  // Dots
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotsLabel: {
    fontSize: Typography.xs,
    fontWeight: Typography.medium,
    marginRight: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});