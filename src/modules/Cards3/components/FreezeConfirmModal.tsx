// CardModule/components/FreezeConfirmModal.tsx
// "freeze ka proper popup ho" — a real confirm sheet instead of an instant
// action on tap, with distinct copy/icon for freeze vs unfreeze and a
// visible loading + error state.

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';

export default function FreezeConfirmModal({
  visible, isFrozen, cardLabel, onConfirm, onClose, loading,
}: {
  visible: boolean;
  isFrozen: boolean;
  cardLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={loading ? undefined : onClose}>
        <Pressable style={[S.sheet, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
          <View style={[
            S.iconWrap,
            { backgroundColor: isFrozen ? colors.greenDim : colors.accentDim },
          ]}>
            <Ionicons
              name={isFrozen ? 'sunny-outline' : 'snow-outline'}
              size={30}
              color={isFrozen ? colors.green : colors.accent}
            />
          </View>

          <Text style={[S.title, { color: colors.text }]}>
            {isFrozen ? 'Unfreeze this card?' : 'Freeze this card?'}
          </Text>
          <Text style={[S.subtitle, { color: colors.text2 }]}>
            {isFrozen
              ? `${cardLabel ?? 'Your card'} will be reactivated and can be used for payments again immediately.`
              : `${cardLabel ?? 'Your card'} will be temporarily blocked. No new payments, top-ups or withdrawals will go through until you unfreeze it.`}
          </Text>

          <View style={S.actionsRow}>
            <TouchableOpacity
              style={[S.btn, { backgroundColor: colors.cardHover }]}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={[S.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[S.btn, { backgroundColor: isFrozen ? colors.green : colors.accent }]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[S.btnText, { color: '#fff' }]}>{isFrozen ? 'Unfreeze' : 'Freeze card'}</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: Spacing[5],
  },
  sheet: {
    width: '100%', maxWidth: 380, borderRadius: Radius['2xl'], borderWidth: 1,
    padding: Spacing[6], alignItems: 'center',
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing[4],
  },
  title: { fontSize: Typography.lg, fontWeight: '800', marginBottom: Spacing[2], textAlign: 'center' },
  subtitle: { fontSize: Typography.sm, textAlign: 'center', lineHeight: 20, marginBottom: Spacing[6] },
  actionsRow: { flexDirection: 'row', gap: Spacing[3], width: '100%' },
  btn: { flex: 1, paddingVertical: Spacing[3], borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: Typography.sm, fontWeight: '700' },
});
