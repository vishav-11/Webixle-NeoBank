import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/context/ThemeContext';
import { Radius, Spacing, Typography } from '@/styles/theme';

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  children, style, onPress, noPad = false, gradient = false,
}: {
  children: React.ReactNode;
  style?: any;
  onPress?: () => void;
  noPad?: boolean;
  gradient?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const inner = (
    <View style={[
      styles.card,
      { borderColor: colors.border },
      !noPad && { padding: Spacing[4] },
      style,
    ]}>
      {children}
    </View>
  );

  if (gradient) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.8 : 1} style={[styles.cardShadow, style]}>
        <LinearGradient
          colors={isDark ? ['#1D1236', '#150C28'] : ['#FFFFFF', '#FFFFFF']}
          style={[styles.card, { borderColor: colors.border }, !noPad && { padding: Spacing[4] }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          {children}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, !noPad && { padding: Spacing[4] }, style]}>
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, !noPad && { padding: Spacing[4] }, style]}>
      {children}
    </View>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
type BadgeVariant = 'green' | 'red' | 'orange' | 'blue' | 'default';

export function Badge({ variant = 'default', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  const { colors } = useTheme();
  const map: Record<BadgeVariant, [string, string]> = {
    green:   [colors.greenDim,   colors.green],
    red:     [colors.redDim,     colors.red],
    orange:  [colors.orangeDim,  colors.orange],
    blue:    [colors.blueDim,    colors.blue],
    default: [colors.surface,    colors.text2],
  };
  const [bg, fg] = map[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{children}</Text>
    </View>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnSize    = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, onPress, disabled, style,
}: {
  variant?: BtnVariant; size?: BtnSize; loading?: boolean;
  icon?: string; children?: React.ReactNode;
  onPress?: () => void; disabled?: boolean; style?: any;
}) {
  const { colors } = useTheme();
  const sizeStyle = { sm: styles.btnSm, md: styles.btnMd, lg: styles.btnLg }[size];

  if (variant === 'primary') {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.8} style={style}>
        <LinearGradient
          colors={disabled ? [colors.border, colors.border] : [colors.green, '#0FAE72']}
          style={[styles.btn, sizeStyle]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          {loading
            ? <ActivityIndicator size="small" color="#0C0716" />
            : <>
                {icon && <Ionicons name={icon as any} size={16} color="#0C0716" />}
                <Text style={styles.btnPrimaryText}>{children}</Text>
              </>
          }
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle = {
    secondary: { bg: colors.surface, border: colors.border,  fg: colors.text  },
    ghost:     { bg: 'transparent',  border: 'transparent',  fg: colors.text2 },
    danger:    { bg: colors.redDim,  border: colors.redDim,  fg: colors.red   },
  }[variant as 'secondary'|'ghost'|'danger'];

  return (
    <TouchableOpacity
      onPress={onPress} disabled={disabled || loading} activeOpacity={0.7}
      style={[styles.btn, sizeStyle, { backgroundColor: variantStyle.bg, borderColor: variantStyle.border, borderWidth: 1 }, style]}
    >
      {loading
        ? <ActivityIndicator size="small" color={variantStyle.fg} />
        : <>
            {icon && <Ionicons name={icon as any} size={16} color={variantStyle.fg} />}
            <Text style={[styles.btnSecText, { color: variantStyle.fg }]}>{children}</Text>
          </>
      }
    </TouchableOpacity>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({
  label, error, suffix, prefix, style, ...props
}: TextInputProps & { label?: string; error?: string; suffix?: string; prefix?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={[styles.inputLabel, { color: colors.text2 }]}>{label}</Text>}
      <View style={styles.inputWrap}>
        {prefix && <Text style={[styles.inputFix, { color: colors.text3 }]}>{prefix}</Text>}
        <TextInput
          placeholderTextColor={colors.text3}
          style={[
            styles.input,
            { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border },
            prefix && { paddingLeft: 36 },
            suffix && { paddingRight: 52 },
            style,
          ]}
          {...props}
        />
        {suffix && (
          <TouchableOpacity style={styles.inputSuffix}>
            <Text style={{ color: colors.green, fontSize: Typography.xs, fontWeight: '700' }}>{suffix}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.inputError, { color: colors.red }]}>{error}</Text>}
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ width, height, style }: { width?: number | string; height?: number; style?: any }) {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.border, borderRadius: Radius.md, width: width ?? '100%', height: height ?? 16 }, style]} />
  );
}

// ─── Stat ─────────────────────────────────────────────────────────────────────
export function Stat({ label, value, change }: { label: string; value: React.ReactNode; change?: number }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 2 }}>
      <Text style={[styles.statLabel, { color: colors.text2 }]}>{label}</Text>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      {change !== undefined && (
        <Text style={[styles.statChange, { color: change >= 0 ? colors.green : colors.red }]}>
          {change >= 0 ? '+' : ''}{change.toFixed(2)}%
        </Text>
      )}
    </View>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text2 }]}>{title}</Text>
      {action && (
        <TouchableOpacity onPress={onAction}>
          <Text style={{ color: colors.green, fontSize: Typography.xs, fontWeight: '600' }}>{action}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description }: { icon?: string; title: string; description?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      {icon && <Ionicons name={icon as any} size={40} color={colors.text3} style={{ marginBottom: Spacing[3] }} />}
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      {description && <Text style={[styles.emptyDesc, { color: colors.text2 }]}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card:         { borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  cardShadow:   { borderRadius: Radius.xl },
  badge:        { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  badgeText:    { fontSize: 10, fontWeight: '600' },
  btn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: Radius.lg },
  btnSm:        { paddingHorizontal: 12, paddingVertical: 7 },
  btnMd:        { paddingHorizontal: 18, paddingVertical: 11 },
  btnLg:        { paddingHorizontal: 24, paddingVertical: 14 },
  btnPrimaryText: { fontSize: Typography.sm, fontWeight: '700', color: '#0C0716' },
  btnSecText:   { fontSize: Typography.sm, fontWeight: '600' },
  inputLabel:   { fontSize: Typography.sm, fontWeight: '500' },
  inputWrap:    { position: 'relative' },
  input: {
    borderWidth: 1, borderRadius: Radius.lg,
    paddingHorizontal: 14, paddingVertical: 11,
    fontSize: Typography.base, fontFamily: 'System',
  },
  inputFix:    { position: 'absolute', left: 12, top: 12, zIndex: 1 },
  inputSuffix: { position: 'absolute', right: 12, top: 10, paddingHorizontal: 6, paddingVertical: 4 },
  inputError:  { fontSize: Typography.xs },
  statLabel:   { fontSize: Typography.xs },
  statValue:   { fontSize: Typography.lg, fontWeight: '700', fontFamily: 'System' },
  statChange:  { fontSize: Typography.xs, fontWeight: '600' },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[3] },
  sectionTitle: { fontSize: Typography.sm, fontWeight: '600' },
  empty:        { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyTitle:   { fontSize: Typography.base, fontWeight: '600', textAlign: 'center' },
  emptyDesc:    { fontSize: Typography.sm, textAlign: 'center', marginTop: Spacing[2], maxWidth: 260 },
});
