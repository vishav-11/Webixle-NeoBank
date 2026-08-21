/**
 * app/(screens)/scanner/components/ResultModal.tsx
 * ✅ Lazy loaded result sheet
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";
import { Spacing, Typography, Radius } from "@/styles/theme";

interface Props {
  data: string;
  onClose: () => void;
  onScanAgain: () => void;
  onSendCrypto: () => void;
}

export default function ResultModal({ data, onClose, onScanAgain, onSendCrypto }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const GREEN = colors.green;

  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      tension: 65,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, []);

  const typeInfo = getQRType(data);
  const isCryptoAddress = /^(0x[a-fA-F0-9]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34}|T[A-Za-z1-9]{33})/.test(
    data
  );

  return (
    <View style={[s.overlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: colors.card,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Success Icon */}
        <View style={[s.icon, { backgroundColor: `${GREEN}20` }]}>
          <Ionicons name="checkmark-circle" size={44} color={GREEN} />
        </View>

        <Text style={[s.title, { color: colors.text }]}>QR Scanned!</Text>
        <Text style={[s.subtitle, { color: colors.text2 }]}>
          Successfully read QR code
        </Text>

        {/* Type Badge */}
        <View style={[s.badge, { backgroundColor: `${typeInfo.color}18` }]}>
          <Ionicons name={typeInfo.icon as any} size={16} color={typeInfo.color} />
          <Text style={[s.badgeText, { color: typeInfo.color }]}>
            {typeInfo.label}
          </Text>
        </View>

        {/* Data Box */}
        <View
          style={[
            s.dataBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[s.dataText, { color: colors.text }]} numberOfLines={4} selectable>
            {data}
          </Text>
        </View>

        {/* Send Crypto Button */}
        {isCryptoAddress && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: GREEN }]}
            onPress={onSendCrypto}
            activeOpacity={0.85}
          >
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Send Crypto</Text>
          </TouchableOpacity>
        )}

        {/* Secondary Buttons */}
        <View style={s.secondaryRow}>
          <TouchableOpacity
            style={[s.secondaryBtn, { backgroundColor: colors.surface }]}
            onPress={onScanAgain}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.text} />
            <Text style={[s.secondaryBtnText, { color: colors.text }]}>Scan Again</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.secondaryBtn, { backgroundColor: colors.surface }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="close-outline" size={18} color={colors.text} />
            <Text style={[s.secondaryBtnText, { color: colors.text }]}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: insets.bottom + 8 }} />
      </Animated.View>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getQRType(data: string) {
  if (/^(0x[a-fA-F0-9]{40})/.test(data))
    return { label: "ETH Address", icon: "wallet-outline", color: "#627eea" };
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(data))
    return { label: "BTC Address", icon: "wallet-outline", color: "#f7931a" };
  if (/^T[A-Za-z1-9]{33}$/.test(data))
    return { label: "TRX Address", icon: "wallet-outline", color: "#ef0027" };
  if (/^https?:\/\//.test(data))
    return { label: "URL / Link", icon: "link-outline", color: "#2775ca" };
  if (/^mailto:/.test(data))
    return { label: "Email", icon: "mail-outline", color: "#9945ff" };
  return { label: "QR Data", icon: "qr-code-outline", color: "#666" };
}

const s = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: Spacing[5],
    alignItems: "center",
    gap: 14,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: Typography.sm,
    marginTop: -8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.sm,
    fontWeight: "700",
  },
  dataBox: {
    width: "100%",
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 14,
    minHeight: 70,
  },
  dataText: {
    fontSize: Typography.sm,
    lineHeight: 20,
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: Radius.xl,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: Typography.base,
    fontWeight: "700",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radius.xl,
  },
  secondaryBtnText: {
    fontSize: Typography.sm,
    fontWeight: "600",
  },
});