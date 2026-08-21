// CardModule/components/CardSettingsSheet.tsx
// "setting sab bnao" — card-level settings: rename/label, freeze shortcut,
// delete card (with its own confirm step since it's destructive).

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useUpdateCardSettings, useDeleteCard } from '../hooks';
import type { CardInfo } from '../types';

function SettingsRow({ icon, label, onPress, colors, destructive, right }: {
  icon: string; label: string; onPress?: () => void; colors: any; destructive?: boolean; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={[SR.row, { borderBottomColor: colors.borderSoft }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[SR.iconBox, { backgroundColor: colors.cardHover }]}>
        <Feather name={icon as any} size={16} color={destructive ? colors.red : colors.text2} />
      </View>
      <Text style={[SR.label, { color: destructive ? colors.red : colors.text }]}>{label}</Text>
      {right ?? <Ionicons name="chevron-forward" size={16} color={colors.text3} />}
    </TouchableOpacity>
  );
}

export default function CardSettingsSheet({
  visible, card, onClose, onDeleted, onSetPin, onViewDetails, onSpendControls, onManageCards,
}: {
  visible: boolean;
  card: CardInfo | null;
  onClose: () => void;
  onDeleted?: () => void;
  /** Opens SetPinModal for this card (PUT /cards/:cardId/pin). */
  onSetPin?: () => void;
  /** Opens CardDetailsModal (secure access-token view) for this card. */
  onViewDetails?: () => void;
  /** Opens SpendControlsModal (transaction-scenarios) for this card. */
  onSpendControls?: () => void;
  /** Opens ManageCardsScreen (negative-balance list + batch delete). */
  onManageCards?: () => void;
}) {
  const { colors } = useTheme();
  const updateSettings = useUpdateCardSettings();
  const deleteCard = useDeleteCard();

  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(card?.label ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLabel(card?.label ?? '');
    setRenaming(false);
    setConfirmDelete(false);
    setError(null);
  }, [card?.id, visible]);

  if (!card) return null;

  const handleSaveLabel = () => {
    if (!label.trim()) return;
    setError(null);
    updateSettings.mutate(
      { cardId: card.id, label: label.trim() },
      {
        onSuccess: () => setRenaming(false),
        onError: (err: any) => setError(err?.response?.data?.message ?? err?.message ?? 'Could not update card.'),
      },
    );
  };

  const handleDelete = () => {
    setError(null);
    deleteCard.mutate(
      { cardId: card.id },
      {
        onSuccess: () => { onDeleted?.(); onClose(); },
        onError: (err: any) => setError(err?.response?.data?.message ?? err?.message ?? 'Could not delete card.'),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={[S.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={S.handle} />
          <View style={S.headerRow}>
            <Text style={[S.title, { color: colors.text }]}>Card settings</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <Text style={[S.cardName, { color: colors.text2 }]}>
            {card.label || card.typeLabel} · {card.maskedNumber}
          </Text>

          {renaming ? (
            <View style={S.renameRow}>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder="Card label"
                placeholderTextColor={colors.text3}
                style={[S.input, { color: colors.text, backgroundColor: colors.cardHover, borderColor: colors.border }]}
                autoFocus
              />
              <TouchableOpacity
                style={[S.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveLabel}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.xs }}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <SettingsRow icon="edit-2" label="Rename card" colors={colors} onPress={() => setRenaming(true)} />
          )}

          <SettingsRow
            icon="eye"
            label="View card details (secure)"
            colors={colors}
            onPress={() => { onClose(); onViewDetails?.(); }}
          />

          <SettingsRow
            icon="lock"
            label="Set / change PIN"
            colors={colors}
            onPress={() => { onClose(); onSetPin?.(); }}
          />

          <SettingsRow
            icon="sliders"
            label="Spend controls"
            colors={colors}
            onPress={() => { onClose(); onSpendControls?.(); }}
          />

          <SettingsRow
            icon="grid"
            label="Manage all cards"
            colors={colors}
            onPress={() => { onClose(); onManageCards?.(); }}
          />

          {!confirmDelete ? (
            <SettingsRow icon="trash-2" label="Delete card" colors={colors} destructive onPress={() => setConfirmDelete(true)} />
          ) : (
            <View style={[S.deleteConfirm, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
              <Text style={[S.deleteText, { color: colors.red }]}>
                This permanently removes the card. This can't be undone.
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[3] }}>
                <TouchableOpacity style={[S.smallBtn, { backgroundColor: colors.cardHover }]} onPress={() => setConfirmDelete(false)}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: Typography.xs }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.smallBtn, { backgroundColor: colors.red }]} onPress={handleDelete} disabled={deleteCard.isPending}>
                  {deleteCard.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.xs }}>Delete</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {error && <Text style={[S.errorText, { color: colors.red }]}>{error}</Text>}
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
  cardName: { fontSize: Typography.xs, marginTop: 4, marginBottom: Spacing[4] },
  renameRow: { flexDirection: 'row', gap: Spacing[2], marginBottom: Spacing[2], alignItems: 'center' },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing[3], paddingVertical: Spacing[3], fontSize: Typography.sm },
  saveBtn: { paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderRadius: Radius.lg },
  deleteConfirm: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4], marginTop: Spacing[2] },
  deleteText: { fontSize: Typography.xs, fontWeight: '600', lineHeight: 18 },
  smallBtn: { flex: 1, paddingVertical: Spacing[2], borderRadius: Radius.md, alignItems: 'center' },
  errorText: { fontSize: Typography.xs, fontWeight: '600', marginTop: Spacing[3] },
});

const SR = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[3], borderBottomWidth: 1 },
  iconBox: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: Typography.sm, fontWeight: '600' },
});
