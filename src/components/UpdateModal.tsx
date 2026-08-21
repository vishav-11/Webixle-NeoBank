// components/UpdateModal.tsx
import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Animated, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';
import { useAppUpdate } from '@/hooks/useAppUpdate';

export default function UpdateModal() {
  const { colors }  = useTheme();
  const GREEN        = colors.green;
  const {
    isAvailable,
    isDownloading,
    isReady,
    error,
    downloadAndApply,
    dismissUpdate,
    checkForUpdate,
  } = useAppUpdate();

  // ── Animation ───────────────────────────────────────────────────────────────
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAvailable) {
      // Slide up + fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0, tension: 60, friction: 10,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down + fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300, duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0, duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isAvailable]);

  if (!isAvailable && !isDownloading) return null;

  return (
    <Modal
      transparent
      visible={isAvailable}
      animationType="none"
      statusBarTranslucent
      onRequestClose={dismissUpdate}
    >
      {/* Backdrop */}
      <Animated.View style={[um.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={!isDownloading ? dismissUpdate : undefined}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View style={[
        um.sheet,
        {
          backgroundColor: colors.card,
          borderColor:     colors.border,
          transform:       [{ translateY: slideAnim }],
        },
      ]}>

        {/* Handle */}
        <View style={[um.handle, { backgroundColor: colors.border }]} />

        {/* Icon */}
        <View style={[um.iconWrap, { backgroundColor: `${GREEN}15` }]}>
          <Ionicons name="arrow-up-circle" size={40} color={GREEN} />
        </View>

        {/* Title */}
        <Text style={[um.title, { color: colors.text }]}>
          Update Available! 🚀
        </Text>

        {/* Subtitle */}
        <Text style={[um.subtitle, { color: colors.text2 }]}>
          A new version of Webixle is ready.{'\n'}
          Update now for the latest features & fixes.
        </Text>

        {/* Error */}
        {error ? (
          <View style={[um.errorBox, { backgroundColor: `${colors.red}12`, borderColor: `${colors.red}30` }]}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.red} />
            <Text style={[um.errorTxt, { color: colors.red }]}>{error}</Text>
          </View>
        ) : null}

        {/* Progress */}
        {isDownloading ? (
          <View style={[um.progressBox, { backgroundColor: `${GREEN}10` }]}>
            <ActivityIndicator size="small" color={GREEN} />
            <Text style={[um.progressTxt, { color: GREEN }]}>
              Downloading update...
            </Text>
          </View>
        ) : null}

        {/* Buttons */}
        <View style={um.btnRow}>

          {/* Later - sirf tab dikhao jab download nahi ho raha */}
          {!isDownloading && (
            <TouchableOpacity
              style={[um.btnLater, { borderColor: colors.border }]}
              onPress={dismissUpdate}
              activeOpacity={0.8}
            >
              <Text style={[um.btnLaterTxt, { color: colors.text2 }]}>
                Later
              </Text>
            </TouchableOpacity>
          )}

          {/* Update Now */}
          <TouchableOpacity
            style={[
              um.btnUpdate,
              { backgroundColor: isDownloading ? `${GREEN}60` : GREEN },
              !isDownloading && { flex: 1.5 },
            ]}
            onPress={error ? checkForUpdate : downloadAndApply}
            disabled={isDownloading}
            activeOpacity={0.85}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons
                  name={error ? "refresh" : "download-outline"}
                  size={18} color="#fff"
                />
                <Text style={um.btnUpdateTxt}>
                  {error ? 'Retry' : 'Update Now'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Info */}
        {!isDownloading && (
          <View style={um.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={12} color={colors.text3} />
            <Text style={[um.infoTxt, { color: colors.text3 }]}>
              Secure OTA update · App will restart automatically
            </Text>
          </View>
        )}

      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const um = StyleSheet.create({
  backdrop:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:       {
    position:              'absolute',
    bottom:                0, left: 0, right: 0,
    borderTopLeftRadius:   Radius['2xl'],
    borderTopRightRadius:  Radius['2xl'],
    borderWidth:           1,
    paddingHorizontal:     Spacing[5],
    paddingTop:            Spacing[3],
    paddingBottom:         48,
    alignItems:            'center',
    gap:                   12,
  },
  handle:      { width: 40, height: 4, borderRadius: 2, marginBottom: 8 },
  iconWrap:    { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: Typography.xl, fontWeight: '800', textAlign: 'center' },
  subtitle:    { fontSize: Typography.sm, textAlign: 'center', lineHeight: 22 },

  errorBox:    { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: 12, paddingVertical: 8, width: '100%' },
  errorTxt:    { fontSize: Typography.xs, flex: 1 },

  progressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Radius.lg, paddingHorizontal: 16, paddingVertical: 10, width: '100%' },
  progressTxt: { fontSize: Typography.sm, fontWeight: '600' },

  btnRow:      { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  btnLater:    { flex: 1, paddingVertical: 14, borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnLaterTxt: { fontSize: Typography.sm, fontWeight: '600' },
  btnUpdate:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: Radius.xl },
  btnUpdateTxt:{ color: '#fff', fontSize: Typography.base, fontWeight: '700' },

  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  infoTxt:     { fontSize: 11 },
});