import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

export default function ComingSoon({
  title = 'Coming Soon',
  description = "We're building this feature. Stay tuned!",
  iconName = 'rocket-outline',
}: {
  title?: string;
  description?: string;
  iconName?: string;
}) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Glow circle */}
      <View style={styles.iconWrap}>
        <LinearGradient
          colors={[colors.greenDim, 'rgba(0,211,149,0.03)']}
          style={[styles.glowCircle, { borderColor: colors.greenBorder }]}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
        >
          <Ionicons name={iconName as any} size={42} color={colors.green} />
        </LinearGradient>
        <View style={[styles.sparkle, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
          <Ionicons name="sparkles" size={11} color={colors.green} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.text2 }]}>{description}</Text>

      <View style={[styles.pill, { backgroundColor: colors.greenDim, borderColor: colors.greenBorder }]}>
        <View style={[styles.pillDot, { backgroundColor: colors.green }]} />
        <Text style={[styles.pillText, { color: colors.green }]}>In Development</Text>
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={16} color={colors.text2} />
        <Text style={[styles.backText, { color: colors.text2 }]}>Go Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[5], padding: Spacing[6] },
  iconWrap:  { position: 'relative' },
  glowCircle:{ width: 110, height: 110, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sparkle:   { position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title:     { fontSize: Typography.xl, fontWeight: '700', textAlign: 'center' },
  desc:      { fontSize: Typography.sm, textAlign: 'center', maxWidth: 280, lineHeight: 20 },
  pill:      { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1 },
  pillDot:   { width: 6, height: 6, borderRadius: 3 },
  pillText:  { fontSize: Typography.sm, fontWeight: '600' },
  backBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 11, borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[2] },
  backText:  { fontSize: Typography.sm, fontWeight: '500' },
});
