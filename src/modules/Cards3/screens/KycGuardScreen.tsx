import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout'; // ✅ useLayout hook

export default function KycGuardScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  // ✅ useLayout se scrollPaddingBottom lo
  const { scrollPaddingBottom } = useLayout();

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            // ✅ Bottom nav bar se content hide na ho
            paddingBottom: scrollPaddingBottom,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Icon ── */}
        <View style={styles.centerSection}>
          <View style={[
            styles.iconCircle,
            { backgroundColor: colors.orangeDim },
          ]}>
            <Ionicons name="shield-checkmark" size={52} color={colors.orange} />
          </View>

          {/* ── Title ── */}
          <Text style={[styles.title, { color: colors.text }]}>
            Complete Main KYC First
          </Text>

          {/* ── Description ── */}
          <Text style={[styles.description, { color: colors.text2 }]}>
            Card services require your identity verification. This is a one-time
            process to ensure security and compliance.
          </Text>

          {/* ── Info Box ── */}
          <View style={[
            styles.infoBox,
            {
              backgroundColor: colors.cardHover,
              borderColor: colors.border,
            },
          ]}>
            {[
              { icon: 'time-outline',             text: 'Quick 5-minute verification' },
              { icon: 'lock-closed-outline',       text: 'Secure document upload' },
              { icon: 'checkmark-circle-outline',  text: 'Instant approval for most users' },
            ].map((item, i) => (
              <View key={i} style={styles.infoRow}>
                <Ionicons
                  name={item.icon as any}
                  size={20}
                  color={colors.green}
                />
                <Text style={[styles.infoText, { color: colors.text2 }]}>
                  {item.text}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Buttons ── */}
        <View style={styles.btnSection}>
          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(app)/kyc' as any)}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-checkmark" size={20} color="#fff" />
            <Text style={styles.primaryBtnText}>
              Complete Verification
            </Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Back Button */}
          <TouchableOpacity
            style={[styles.backBtn, {
              backgroundColor: colors.cardHover,
              borderColor: colors.border,
            }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnText, { color: colors.text2 }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,            // ✅ content stretch kare puri height tak
    justifyContent: 'space-between', // ✅ icon upar, buttons niche
    paddingHorizontal: Spacing[6],
    paddingTop: Spacing[10],
  },

  // ── Center Section ──
  centerSection: {
    alignItems: 'center',
    gap: Spacing[4],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  title: {
    fontSize: Typography.xl,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 30,
  },
  description: {
    fontSize: Typography.sm,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Spacing[2],
  },

  // ── Info Box ──
  infoBox: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
    borderWidth: 1,
    marginTop: Spacing[2],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  infoText: {
    fontSize: Typography.sm,
    flex: 1,
    lineHeight: 20,
  },

  // ── Button Section ──
  btnSection: {
    gap: Spacing[3],
    marginTop: Spacing[8],
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    borderRadius: Radius.xl,
    width: '100%',
  },
  primaryBtnText: {
    fontSize: Typography.base,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  backBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[4],
    borderRadius: Radius.xl,
    borderWidth: 1,
    width: '100%',
  },
  backBtnText: {
    fontSize: Typography.sm,
    fontWeight: '600',
  },
});