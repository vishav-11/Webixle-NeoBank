import React, { useEffect, useRef } from "react";
import { Animated, View, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Radius, Spacing } from "@/styles/theme";

// ─── Single Skeleton Box ──────────────────────────────────────────────────────
export const SkeletonBox = ({
  width = "100%" as any,
  height = 16,
  borderRadius = Radius.md,
  style,
}: {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}) => {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor: colors.border, opacity: anim },
        style,
      ]}
    />
  );
};

// ─── Dashboard Tab Skeleton ───────────────────────────────────────────────────
export const DashboardSkeleton = () => {
  const { colors } = useTheme();

  return (
    <View style={sk.wrap}>
      {/* Hero Card */}
      <View style={[sk.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SkeletonBox width={80} height={12} style={{ marginBottom: 10 }} />
        <SkeletonBox width="70%" height={28} style={{ marginBottom: 8 }} />
        <SkeletonBox width="90%" height={14} style={{ marginBottom: 4 }} />
        <SkeletonBox width="60%" height={14} style={{ marginBottom: 20 }} />
        <SkeletonBox height={46} borderRadius={Radius.xl} />
      </View>

      {/* Quick Actions */}
      <View style={sk.row3}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[sk.quickBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <SkeletonBox width={40} height={10} style={{ marginTop: 6 }} />
          </View>
        ))}
      </View>

      {/* Section titles */}
      <SkeletonBox width={140} height={18} style={{ marginBottom: 6 }} />
      <SkeletonBox width={100} height={11} style={{ marginBottom: 14 }} />

      {/* Two col */}
      <View style={sk.row2}>
        {[1, 2].map((i) => (
          <View key={i} style={[sk.colBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonBox width={60} height={10} style={{ marginBottom: 8 }} />
            <SkeletonBox width={80} height={24} />
          </View>
        ))}
      </View>

      {/* LTV */}
      <View style={[sk.ltvCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={sk.rowBetween}>
          <SkeletonBox width={100} height={12} />
          <SkeletonBox width={40} height={12} />
        </View>
        <SkeletonBox height={8} borderRadius={4} style={{ marginTop: 12 }} />
      </View>

      {/* Stats grid */}
      <View style={sk.row4}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[sk.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SkeletonBox width={24} height={24} borderRadius={12} />
            <SkeletonBox width={30} height={9} style={{ marginTop: 4 }} />
            <SkeletonBox width={40} height={14} style={{ marginTop: 4 }} />
          </View>
        ))}
      </View>

      {/* Pair cards */}
      <SkeletonBox width={140} height={18} style={{ marginBottom: 6 }} />
      <SkeletonBox width={100} height={11} style={{ marginBottom: 14 }} />
      {[1, 2].map((i) => (
        <View key={i} style={[sk.pairCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={sk.pairHeader}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <SkeletonBox width="50%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonBox width="30%" height={10} />
            </View>
            <SkeletonBox width={60} height={26} borderRadius={Radius.md} />
          </View>
          <SkeletonBox height={60} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
          <SkeletonBox height={44} borderRadius={Radius.lg} />
        </View>
      ))}
    </View>
  );
};

// ─── Add Tab Skeleton ─────────────────────────────────────────────────────────
export const AddTabSkeleton = () => {
  const { colors } = useTheme();
  return (
    <View style={sk.wrap}>
      <SkeletonBox height={60} borderRadius={Radius.xl} style={{ marginBottom: 16 }} />
      <SkeletonBox width={140} height={18} style={{ marginBottom: 6 }} />
      <SkeletonBox width={100} height={11} style={{ marginBottom: 14 }} />
      {[1, 2, 3].map((i) => (
        <View key={i} style={[sk.pairCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={sk.pairHeader}>
            <SkeletonBox width={40} height={40} borderRadius={20} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <SkeletonBox width="50%" height={14} style={{ marginBottom: 6 }} />
              <SkeletonBox width="30%" height={10} />
            </View>
          </View>
          <SkeletonBox height={60} borderRadius={Radius.lg} style={{ marginBottom: 12 }} />
          <SkeletonBox height={44} borderRadius={Radius.lg} />
        </View>
      ))}
    </View>
  );
};

const sk = StyleSheet.create({
  wrap:       { paddingHorizontal: 16, paddingTop: 16 },
  heroCard:   { borderRadius: Radius["2xl"], borderWidth: 1, padding: 20, marginBottom: 16 },
  row3:       { flexDirection: "row", gap: 10, marginBottom: 16 },
  row2:       { flexDirection: "row", gap: 10, marginBottom: 10 },
  row4:       { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickBtn:   { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1 },
  colBox:     { flex: 1, borderRadius: Radius.xl, borderWidth: 1, padding: 16 },
  ltvCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: 16, marginBottom: 12 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  statBox:    { flex: 1, borderRadius: Radius.lg, borderWidth: 1, padding: 12, alignItems: "center" },
  pairCard:   { borderRadius: Radius["2xl"], borderWidth: 1, padding: 16, marginBottom: 12 },
  pairHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
});