/**
 * app/(screens)/scanner/components/ScannerFrame.tsx
 * ✅ Optimized scanner frame with animated scan line
 */

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

interface Props {
  size: number;
  color: string;
}

export default function ScannerFrame({ size, color }: Props) {
  return (
    <View style={[s.frame, { width: size, height: size }]}>
      <Corner position="tl" color={color} />
      <Corner position="tr" color={color} />
      <Corner position="bl" color={color} />
      <Corner position="br" color={color} />
      <ScanLine color={color} size={size} />
    </View>
  );
}

// ─── Corner ────────────────────────────────────────────────────────────────────
function Corner({ position, color }: { position: "tl" | "tr" | "bl" | "br"; color: string }) {
  const isTop = position === "tl" || position === "tr";
  const isLeft = position === "tl" || position === "bl";

  return (
    <View
      style={[
        s.corner,
        isTop ? { top: 0 } : { bottom: 0 },
        isLeft ? { left: 0 } : { right: 0 },
      ]}
    >
      <View style={[s.cornerH, { backgroundColor: color }, !isLeft && { right: 0 }]} />
      <View style={[s.cornerV, { backgroundColor: color }, !isTop && { bottom: 0 }]} />
    </View>
  );
}

// ─── Scan Line ─────────────────────────────────────────────────────────────────
function ScanLine({ color, size }: { color: string; size: number }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, size - 4],
  });

  return (
    <Animated.View
      style={[
        s.line,
        {
          backgroundColor: color,
          shadowColor: color,
          transform: [{ translateY }],
        },
      ]}
    />
  );
}

const s = StyleSheet.create({
  frame: { position: "relative" },
  corner: { position: "absolute", width: CORNER_SIZE, height: CORNER_SIZE },
  cornerH: {
    position: "absolute",
    width: CORNER_SIZE,
    height: CORNER_THICKNESS,
    borderRadius: CORNER_THICKNESS / 2,
    top: 0,
  },
  cornerV: {
    position: "absolute",
    width: CORNER_THICKNESS,
    height: CORNER_SIZE,
    borderRadius: CORNER_THICKNESS / 2,
    top: 0,
    left: 0,
  },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2.5,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
});