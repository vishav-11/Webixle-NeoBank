// components/common/KycRequiredModal.tsx
// ✅ Theme-integrated — colors, spacing, radius, typography sab theme se

import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Platform, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import {
  Radius, Spacing, Typography, IconSize, IconBox, getShadow,
} from '@/styles/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onGoKyc: () => void;
}

export function KycRequiredModal({ visible, onClose, onGoKyc }: Props) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* ── Backdrop ── */}
      <Pressable
        style={[styles.overlay, { backgroundColor: colors.overlay }]}
        onPress={onClose}
      >
        {/* ── Bottom Sheet Box ── */}
        <Pressable
          style={[
            styles.box,
            {
              backgroundColor: colors.surface,
              borderColor:     colors.greenBorder,
              // ✅ Theme shadow
              ...getShadow(isDark, 'lg'),
            },
          ]}
          onPress={e => e.stopPropagation()}
        >
          {/* ── Handle bar ── */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* ── Icon ── */}
          <View
            style={[
              styles.iconWrap,
              {
                width:           IconBox['2xl'],
                height:          IconBox['2xl'],
                borderRadius:    IconBox['2xl'] / 2,
                backgroundColor: colors.greenDim,
                borderWidth:     1,
                borderColor:     colors.greenBorder,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={IconSize['2xl']}
              color={colors.green}
            />
          </View>

          {/* ── Title ── */}
          <Text style={[styles.title, { color: colors.text }]}>
            KYC Verification Required
          </Text>

          {/* ── Subtitle ── */}
          <Text style={[styles.subtitle, { color: colors.text2 }]}>
            Complete your identity verification to unlock this feature and
            access all Webixle capabilities.
          </Text>

          {/* ── Feature list ── */}
          <View
            style={[
              styles.featureList,
              {
                backgroundColor: colors.greenDim,
                borderWidth:     1,
                borderColor:     colors.greenBorder,
                borderRadius:    Radius.lg,
              },
            ]}
          >
            {FEATURES.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={IconSize.sm}
                  color={colors.green}
                />
                <Text style={[styles.featureText, { color: colors.text2 }]}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          {/* ── CTA Button ── */}
          <TouchableOpacity
            onPress={onGoKyc}
            activeOpacity={0.85}
            style={styles.fullBtn}
            accessibilityRole="button"
            accessibilityLabel="Complete KYC Now"
          >
            <LinearGradient
              colors={colors.primaryGradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtn}
            >
              <Ionicons
                name="shield-checkmark"
                size={IconSize.sm}
                color="#FFFFFF"
              />
              <Text style={styles.primaryText}>Complete KYC Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Maybe Later ── */}
          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.7}
            style={styles.laterBtn}
            accessibilityRole="button"
            accessibilityLabel="Maybe Later"
          >
            <Text style={[styles.laterText, { color: colors.text3 }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Feature list (static) ────────────────────────────────────────────────
const FEATURES = [
  'Send & Receive crypto',
  'Swap & Trade assets',
  'Access P2P & Earn',
  'Higher transaction limits',
] as const;

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    flex:           1,
    justifyContent: 'flex-end',
  },
  box: {
    borderTopLeftRadius:  Radius['3xl'],
    borderTopRightRadius: Radius['3xl'],
    borderWidth:          1,
    padding:              Spacing[6],
    paddingBottom:        Platform.OS === 'ios' ? Spacing[10] : Spacing[6],
    alignItems:           'center',
    gap:                  Spacing[4],
  },
  handle: {
    width:        40,
    height:       4,
    borderRadius: Radius.full,
    marginBottom: Spacing[1],
  },
  iconWrap: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  title: {
    fontSize:   Typography.lg,
    fontWeight: Typography.bold,
    textAlign:  'center',
    lineHeight: Typography.lineHeightLg,
  },
  subtitle: {
    fontSize:   Typography.sm,
    fontWeight: Typography.regular,
    textAlign:  'center',
    lineHeight: Typography.lineHeightBase,
  },
  featureList: {
    width:   '100%',
    padding: Spacing[4],
    gap:     Spacing[3],
  },
  featureRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing[2],
  },
  featureText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
    flex:       1,
    lineHeight: Typography.lineHeightBase,
  },
  fullBtn: {
    width:     '100%',
    marginTop: Spacing[1],
  },
  primaryBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing[2],
    paddingVertical: Spacing[4],
    borderRadius:    Radius.lg,
  },
  primaryText: {
    fontSize:   Typography.base,
    fontWeight: Typography.bold,
    color:      '#FFFFFF',
  },
  laterBtn: {
    paddingVertical:   Spacing[2],
    paddingHorizontal: Spacing[6],
  },
  laterText: {
    fontSize:   Typography.sm,
    fontWeight: Typography.medium,
  },
});