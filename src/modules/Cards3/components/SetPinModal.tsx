// CardModule/components/SetPinModal.tsx
//
// Set / change the card's 6-digit PIN — PUT /cards/:cardId/pin.
// Client-side rules mirror card.service.js#updateCardPin EXACTLY
// (validateCardPin in constants.ts): 6 digits, no 3-in-a-row identical,
// no 3 ascending/descending in a row. New PIN + confirm PIN must match
// before the request ever fires.

import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  Pressable, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useUpdateCardPin } from '../hooks';
import { validateCardPin } from '../constants';
import type { CardInfo } from '../types';

const PIN_LENGTH = 6;

// Six individual boxes that all share one hidden TextInput — standard
// native pattern for OTP/PIN entry without a third-party dependency.
function PinBoxes({
  value, onChangeText, colors, autoFocus, secure = true,
}: {
  value: string; onChangeText: (v: string) => void; colors: any; autoFocus?: boolean; secure?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('');

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={PB.row}>
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <View
          key={i}
          style={[
            PB.box,
            {
              borderColor: digits[i] ? colors.primary : colors.border,
              backgroundColor: colors.cardHover,
            },
          ]}
        >
          <Text style={[PB.digit, { color: colors.text }]}>
            {digits[i] ? (secure ? '•' : digits[i]) : ''}
          </Text>
        </View>
      ))}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH))}
        keyboardType="number-pad"
        maxLength={PIN_LENGTH}
        autoFocus={autoFocus}
        style={PB.hiddenInput}
        caretHidden
      />
    </Pressable>
  );
}

export default function SetPinModal({
  visible, card, onClose, onSuccess,
}: {
  visible: boolean;
  card: CardInfo | null;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const { colors } = useTheme();
  const updatePin = useUpdateCardPin();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (visible) {
      setPin('');
      setConfirmPin('');
      setError(null);
      setDone(false);
      updatePin.reset();
    }
  }, [visible, card?.id]);

  if (!card) return null;

  const handleSubmit = () => {
    setError(null);

    const pinError = validateCardPin(pin);
    if (pinError) {
      setError(pinError);
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
      return;
    }

    updatePin.mutate(
      { cardId: card.id, pin },
      {
        onSuccess: () => {
          setDone(true);
          onSuccess?.();
        },
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? err?.message ?? 'Could not update PIN. Please try again.'),
      },
    );
  };

  const canSubmit = pin.length === PIN_LENGTH && confirmPin.length === PIN_LENGTH;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={updatePin.isPending ? undefined : onClose}>
        <Pressable style={[S.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={S.handle} />
          <View style={S.headerRow}>
            <Text style={[S.title, { color: colors.text }]}>
              {done ? 'PIN updated' : 'Set card PIN'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10} disabled={updatePin.isPending}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>

          {done ? (
            <View style={{ alignItems: 'center', paddingVertical: Spacing[6] }}>
              <View style={[S.successIcon, { backgroundColor: colors.greenDim }]}>
                <Ionicons name="checkmark-circle" size={36} color={colors.green} />
              </View>
              <Text style={[S.subtitle, { color: colors.text2, textAlign: 'center', marginTop: Spacing[3] }]}>
                Your new PIN is active for {card.label || card.typeLabel} · {card.maskedNumber}.
              </Text>
              <TouchableOpacity
                style={[S.doneBtn, { backgroundColor: colors.primary }]}
                onPress={onClose}
                activeOpacity={0.85}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.sm }}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={[S.cardName, { color: colors.text2 }]}>
                {card.label || card.typeLabel} · {card.maskedNumber}
              </Text>

              <Text style={[S.fieldLabel, { color: colors.text2 }]}>New 6-digit PIN</Text>
              <PinBoxes value={pin} onChangeText={setPin} colors={colors} autoFocus />

              <Text style={[S.fieldLabel, { color: colors.text2, marginTop: Spacing[5] }]}>Confirm PIN</Text>
              <PinBoxes value={confirmPin} onChangeText={setConfirmPin} colors={colors} />

              <Text style={[S.hint, { color: colors.text3 }]}>
                Avoid repeating digits (111) or runs (123, 987).
              </Text>

              {error && (
                <View style={[S.errorBox, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                  <Text style={[S.errorText, { color: colors.red }]}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  S.submitBtn,
                  { backgroundColor: canSubmit ? colors.primary : colors.cardHover, marginTop: Spacing[5] },
                ]}
                onPress={handleSubmit}
                disabled={!canSubmit || updatePin.isPending}
                activeOpacity={0.85}
              >
                {updatePin.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: canSubmit ? '#fff' : colors.text3, fontWeight: '700', fontSize: Typography.sm }}>
                      Save PIN
                    </Text>}
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const S = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: Radius['2xl'], borderTopRightRadius: Radius['2xl'], padding: Spacing[5], paddingBottom: Spacing[8] },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: 'rgba(150,150,150,0.4)', alignSelf: 'center', marginBottom: Spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.lg, fontWeight: '800' },
  cardName: { fontSize: Typography.xs, marginTop: 4, marginBottom: Spacing[5] },
  fieldLabel: { fontSize: Typography.xs, fontWeight: '700', marginBottom: Spacing[3] },
  hint: { fontSize: 11, marginTop: Spacing[3] },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[4],
  },
  errorText: { fontSize: Typography.xs, fontWeight: '600', flex: 1 },
  submitBtn: { paddingVertical: Spacing[4], borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  subtitle: { fontSize: Typography.sm, lineHeight: 20 },
  doneBtn: { marginTop: Spacing[6], paddingVertical: Spacing[3], paddingHorizontal: Spacing[8], borderRadius: Radius.xl },
});

const PB = StyleSheet.create({
  row: { flexDirection: 'row', gap: Spacing[2], position: 'relative' },
  box: {
    width: 44, height: 52, borderRadius: Radius.lg, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  digit: { fontSize: Typography.lg, fontWeight: '800' },
  hiddenInput: {
    position: 'absolute', width: '100%', height: '100%',
    opacity: 0,
  },
});
