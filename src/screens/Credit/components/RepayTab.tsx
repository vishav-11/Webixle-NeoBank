import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius, IconSize, type ColorScheme } from '@/styles/theme';
import { creditService } from '@/services/creditService';
import type { RepayPreview } from '@/types/credit';

const webReset = Platform.OS === 'web'
  ? ({ outlineWidth: 0, outlineStyle: 'none', boxShadow: 'none' } as any) : {};

const showAlert = (title: string, msg?: string, btns?: any[]) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}${msg ? `\n\n${msg}` : ''}`);
    btns?.[0]?.onPress?.();
  } else {
    require('react-native').Alert.alert(title, msg, btns);
  }
};

interface Props {
  totalOwed: number;
  onSuccess: () => void;
  bottomPad: number;
}

export default function RepayTab({ totalOwed, onSuccess, bottomPad }: Props) {
  const { colors } = useTheme();

  const [amount,   setAmount]   = useState('');
  const [preview,  setPreview]  = useState<RepayPreview | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [repaying, setRepaying] = useState(false);
  const [focused,  setFocused]  = useState(false);

  const previewTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced preview
  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    const n = parseFloat(amount);
    if (!amount || isNaN(n) || n <= 0) { setPreview(null); return; }

    setLoading(true);
    previewTimer.current = setTimeout(async () => {
      try {
        const p = await creditService.repayPreview(n);
        setPreview(p);
      } catch { setPreview(null); }
      finally  { setLoading(false); }
    }, 500);
  }, [amount]);

  const handleMax = () => setAmount(totalOwed.toString());

  const handleAmountChange = (v: string) => {
    const s = v.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    setAmount(s);
  };

  const handleRepay = useCallback(async () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    setRepaying(true);
    try {
      await creditService.repay({ amount: n });
      setAmount(''); setPreview(null);
      showAlert('Repaid ✓', `$${n.toFixed(2)} repaid successfully.`);
      onSuccess();
    } catch (e: any) {
      showAlert('Repay Failed', e?.message ?? 'Try again.');
    } finally {
      setRepaying(false);
    }
  }, [amount, onSuccess]);

  const amtNum = parseFloat(amount) || 0;
  const canRepay = amtNum > 0 && amtNum <= totalOwed && !repaying && !loading;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[rp.scroll, { paddingBottom: bottomPad }]}
    >
      <View style={[rp.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

        {/* Header */}
        <View style={rp.cardHeader}>
          <Ionicons name="arrow-up-circle-outline" size={IconSize.md} color={colors.accent} />
          <Text style={[rp.cardTitle, { color: colors.text }]}>Outstanding Balance</Text>
        </View>

        {/* Total Owed */}
        <View style={[
          rp.owedRow,
          {
            backgroundColor: colors.redDim,
            borderColor: colors.redBorder,
          }
        ]}>
          <Text style={[rp.owedLabel, { color: colors.text2 }]}>Total Owed</Text>
          <Text style={[rp.owedVal, { color: colors.red }]}>
            ${totalOwed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Amount Label + MAX */}
        <View style={rp.amtRow}>
          <Text style={[rp.amtLabel, { color: colors.text }]}>
            Repay Amount <Text style={[rp.amtSub, { color: colors.text2 }]}>(USD)</Text>
          </Text>
          <TouchableOpacity onPress={handleMax}>
            <Text style={[rp.maxTxt, { color: colors.accent }]}>MAX</Text>
          </TouchableOpacity>
        </View>

        {/* Input */}
        <View style={[
          rp.inputBox,
          {
            backgroundColor: colors.surface,
            borderColor: focused ? colors.accentBorder : colors.border,
          },
        ]}>
          <Text style={[rp.dollarSign, { color: colors.text2 }]}>$</Text>
          <TextInput
            style={[rp.input, { color: colors.text }, webReset]}
            placeholder="0.00"
            placeholderTextColor={colors.text3}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={handleAmountChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            underlineColorAndroid="transparent"
          />
          {loading && <ActivityIndicator size="small" color={colors.accent} />}
        </View>

        {/* Preview */}
        {preview && !loading && (
          <View style={[rp.preview, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {[
              { label: 'Principal',      val: `$${preview.principal.toFixed(2)}` },
              { label: 'Interest',       val: `$${preview.interest.toFixed(2)}` },
              { label: 'New Available',  val: `$${preview.newAvailable.toFixed(2)}`, color: colors.accent },
              { label: 'New Risk Level', val: preview.newRiskLevel },
            ].map(({ label, val, color }) => (
              <View key={label} style={rp.previewRow}>
                <Text style={[rp.previewLabel, { color: colors.text2 }]}>{label}</Text>
                <Text style={[rp.previewVal, { color: color ?? colors.text }]}>{val}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Validation */}
        {amtNum > totalOwed && amtNum > 0 && (
          <View style={[rp.errRow, { backgroundColor: colors.redDim }]}>
            <Ionicons name="alert-circle-outline" size={IconSize.xs} color={colors.red} />
            <Text style={[rp.errTxt, { color: colors.red }]}>
              Amount exceeds total owed (${totalOwed.toFixed(2)})
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          onPress={handleRepay}
          disabled={!canRepay}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canRepay 
              ? [colors.accent, colors.primaryBright] 
              : [colors.surface, colors.surface]}
            style={[rp.cta, !canRepay && { borderWidth: 1, borderColor: colors.border }]}
            start={{ x: 0, y: 0 }} 
            end={{ x: 1, y: 0 }}
          >
            {repaying
              ? <ActivityIndicator color={canRepay ? '#fff' : colors.text3} />
              : <Text style={[rp.ctaTxt, { color: canRepay ? '#fff' : colors.text3 }]}>
                  Review &amp; Repay
                </Text>
            }
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const rp = StyleSheet.create({
  scroll:      { padding: Spacing[4], gap: Spacing[3] },
  card:        { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing[4], gap: Spacing[3] },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  cardTitle:   { fontSize: Typography.base, fontWeight: Typography.bold },
  owedRow:     { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderRadius: Radius.lg, 
    borderWidth: 1, 
    paddingHorizontal: Spacing[4], 
    paddingVertical: Spacing[3] + 2 
  },
  owedLabel:   { fontSize: Typography.sm },
  owedVal:     { fontSize: Typography.xl, fontWeight: Typography.bold },
  amtRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amtLabel:    { fontSize: Typography.sm, fontWeight: Typography.semibold },
  amtSub:      { fontWeight: Typography.regular },
  maxTxt:      { fontSize: Typography.sm, fontWeight: Typography.bold },
  inputBox:    { 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: Radius.lg, 
    borderWidth: 1.5, 
    paddingHorizontal: Spacing[4], 
    paddingVertical: Spacing[3], 
    gap: Spacing[2] 
  },
  dollarSign:  { fontSize: Typography.lg, fontWeight: Typography.bold },
  input:       { flex: 1, fontSize: Typography.lg, fontWeight: Typography.bold, padding: 0 },
  preview:     { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing[3], gap: Spacing[2] },
  previewRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  previewLabel: { fontSize: Typography.sm },
  previewVal:  { fontSize: Typography.sm, fontWeight: Typography.semibold },
  errRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2] },
  errTxt:      { fontSize: Typography.xs },
  cta:         { borderRadius: Radius['2xl'], paddingVertical: Spacing[4], alignItems: 'center', justifyContent: 'center' },
  ctaTxt:      { fontSize: Typography.base, fontWeight: Typography.bold },
});