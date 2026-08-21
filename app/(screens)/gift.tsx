/**
 * app/(screens)/gifts.tsx
 * Send Gifts page — matches Gift page.pdf design
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";
import Svg, { Path, Rect, Circle } from "react-native-svg";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─── Gift Icon Illustration ───────────────────────────────────────────────────
function GiftIllustration({ size = 200, color }: { size?: number; color: string }) {
  const opacity = 0.15;

  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      {/* Box base */}
      <Rect
        x="50"
        y="85"
        width="100"
        height="90"
        rx="8"
        fill={color}
        opacity={opacity}
      />
      {/* Box lid */}
      <Rect
        x="45"
        y="70"
        width="110"
        height="20"
        rx="6"
        fill={color}
        opacity={opacity + 0.05}
      />
      {/* Ribbon vertical */}
      <Rect
        x="92"
        y="70"
        width="16"
        height="105"
        rx="3"
        fill={color}
        opacity={opacity + 0.1}
      />
      {/* Ribbon horizontal */}
      <Rect
        x="45"
        y="115"
        width="110"
        height="16"
        rx="3"
        fill={color}
        opacity={opacity + 0.1}
      />
      {/* Bow left circle */}
      <Circle cx="80" cy="55" r="18" fill={color} opacity={opacity + 0.08} />
      {/* Bow right circle */}
      <Circle cx="120" cy="55" r="18" fill={color} opacity={opacity + 0.08} />
      {/* Bow center */}
      <Circle cx="100" cy="50" r="10" fill={color} opacity={opacity + 0.12} />
    </Svg>
  );
}

// ─── Gift Type Card ───────────────────────────────────────────────────────────
function GiftTypeCard({
  icon,
  label,
  iconColor,
  colors,
  onPress,
}: {
  icon: string;
  label: string;
  iconColor: string;
  colors: any;
  onPress: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();

  const handlePressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 60,
      friction: 7,
      useNativeDriver: true,
    }).start();

  return (
    <Animated.View
      style={[
        gtc.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <TouchableOpacity
        style={gtc.inner}
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
      >
        {/* Icon */}
        <View style={[gtc.iconWrap, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon as any} size={32} color={iconColor} />
        </View>

        {/* Label */}
        <Text style={[gtc.label, { color: colors.text }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const gtc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Radius["2xl"],
    borderWidth: 1.5,
    overflow: "hidden",
    minWidth: 100,
  },
  inner: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: Typography.sm,
    fontWeight: "700",
    textAlign: "center",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function GiftsScreen() {
  const { colors } = useTheme();
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const primary      = colors.primary;

  // Fade-in animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 10,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // ── Gift type handlers ────────────────────────────────────────────────────
  const handlePersonalGift = () => {
    // Navigate to personal gift flow
    router.push("/send" as any);
  };

  const handleGroupGift = () => {
    // Navigate to group gift flow
    router.push("/send" as any);
  };

  const handleGiftCard = () => {
    // Navigate to gift card flow
    router.push("/send" as any);
  };

  const handleCreateGift = () => {
    // Navigate to create gift flow
    router.push("/send" as any);
  };

  return (
    <View style={[s.root, { backgroundColor: colors.bg }]}>
      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop: insets.top + 10,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={[s.iconBtn, { backgroundColor: colors.surface }]}
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/")
          }
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={18} color={colors.text} />
        </TouchableOpacity>

        {/* Title */}
        <Text style={[s.headerTitle, { color: colors.text }]}>
          Send Gifts
        </Text>

        {/* Right placeholder */}
        <View style={s.iconBtn} />
      </View>

      {/* ── Body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
      >
        {/* Illustration */}
        <Animated.View
          style={[
            s.illustrationWrap,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GiftIllustration size={220} color={primary} />
        </Animated.View>

        {/* Heading */}
        <Animated.Text
          style={[
            s.mainTitle,
            {
              color: colors.text,
              opacity: fadeAnim,
            },
          ]}
        >
          Send Crypto as a Gift
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            s.subtitle,
            {
              color: colors.text2,
              opacity: fadeAnim,
            },
          ]}
        >
          Share the gift of crypto with your loved ones
        </Animated.Text>

        {/* Gift Type Cards */}
        <Animated.View
          style={[
            s.cardRow,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <GiftTypeCard
            icon="heart"
            label="Personal Gift"
            iconColor="#FF4D6A"
            colors={colors}
            onPress={handlePersonalGift}
          />
          <GiftTypeCard
            icon="people"
            label="Group Gift"
            iconColor="#f7931a"
            colors={colors}
            onPress={handleGroupGift}
          />
          <GiftTypeCard
            icon="gift"
            label="Gift Card"
            iconColor={primary}
            colors={colors}
            onPress={handleGiftCard}
          />
        </Animated.View>

        {/* Feature list (optional) */}
        <Animated.View
          style={[
            s.featureList,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <FeatureItem
            icon="checkmark-circle"
            text="Instant delivery via email or link"
            color={primary}
            colors={colors}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="Customize with a personal message"
            color={primary}
            colors={colors}
          />
          <FeatureItem
            icon="checkmark-circle"
            text="Track gift status in real-time"
            color={primary}
            colors={colors}
          />
        </Animated.View>
      </ScrollView>

      {/* ── CTA Button ── */}
      <Animated.View
        style={[
          s.ctaWrap,
          {
            paddingBottom: insets.bottom + 16,
            backgroundColor: colors.bg,
            borderTopColor: colors.border,
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: primary }]}
          onPress={handleCreateGift}
          activeOpacity={0.85}
        >
          <Ionicons name="gift-outline" size={20} color="#fff" />
          <Text style={s.ctaBtnTxt}>Create Gift</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Feature Item ─────────────────────────────────────────────────────────────
function FeatureItem({
  icon,
  text,
  color,
  colors,
}: {
  icon: string;
  text: string;
  color: string;
  colors: any;
}) {
  return (
    <View style={fi.row}>
      <Ionicons name={icon as any} size={18} color={color} />
      <Text style={[fi.text, { color: colors.text2 }]}>{text}</Text>
    </View>
  );
}

const fi = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  text: {
    flex: 1,
    fontSize: Typography.sm,
    lineHeight: 20,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: Typography.lg,
    fontWeight: "700",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Scroll
  scroll: {
    paddingHorizontal: Spacing[4],
    paddingTop: 20,
  },

  // Illustration
  illustrationWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    marginTop: 20,
  },

  // Titles
  mainTitle: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: Typography.base,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 24,
    marginBottom: 36,
  },

  // Cards
  cardRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 32,
  },

  // Features
  featureList: {
    paddingHorizontal: 8,
    gap: 4,
  },

  // CTA
  ctaWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
    paddingTop: 16,
    borderTopWidth: 1,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: Radius.xl,
  },
  ctaBtnTxt: {
    color: "#fff",
    fontSize: Typography.base,
    fontWeight: "700",
  },
});