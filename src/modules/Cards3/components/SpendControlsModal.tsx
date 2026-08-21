// CardModule/components/SpendControlsModal.tsx
//
// "Spend controls" — GET /cards/card-transaction-scenarios (catalog) +
// POST /cards/:cardId/transaction-scenarios (apply to one card). Interlace
// calls this "consumption scenarios" on the wire. User picks a mode
// (allow-only vs block-these) and taps the merchant categories it applies
// to — mirrors card.service.js#setCardTransactionScenarios's required
// fields exactly: non-empty `scenes` array + `type`.

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  Pressable, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useCardTransactionScenarios, useSetCardTransactionScenarios } from '../hooks';
import { SCENARIO_TYPE_OPTIONS, SCENE_OPTIONS } from '../constants';
import type { CardInfo } from '../types';

function TypeOption({ label, description, selected, onPress, colors }: {
  label: string; description: string; selected: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        T.option,
        { backgroundColor: colors.cardHover, borderColor: selected ? colors.primary : colors.border },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[T.label, { color: colors.text }]}>{label}</Text>
        <Text style={[T.desc, { color: colors.text2 }]}>{description}</Text>
      </View>
      <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color={selected ? colors.primary : colors.text3} />
    </TouchableOpacity>
  );
}

function SceneChip({ label, icon, selected, onPress, colors }: {
  label: string; icon: string; selected: boolean; onPress: () => void; colors: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        C.chip,
        {
          backgroundColor: selected ? colors.primaryDim ?? colors.cardHover : colors.cardHover,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Ionicons name={icon as any} size={14} color={selected ? colors.primary : colors.text2} />
      <Text style={[C.label, { color: selected ? colors.primary : colors.text }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={13} color={colors.primary} />}
    </TouchableOpacity>
  );
}

export default function SpendControlsModal({
  visible, card, onClose,
}: {
  visible: boolean;
  card: CardInfo | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { data: catalog, isLoading: catalogLoading } = useCardTransactionScenarios(visible);
  const setScenarios = useSetCardTransactionScenarios();

  const [type, setType] = useState<string>(SCENARIO_TYPE_OPTIONS[0].value);
  const [selectedScenes, setSelectedScenes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (visible) {
      setType(SCENARIO_TYPE_OPTIONS[0].value);
      setSelectedScenes([]);
      setError(null);
      setSaved(false);
      setScenarios.reset();
    }
  }, [visible, card?.id]);

  if (!card) return null;

  // Prefer the live catalog once it loads; fall back to the local
  // placeholder list (SCENE_OPTIONS) so the picker still renders instantly.
  const scenes = (catalog && catalog.length ? catalog : SCENE_OPTIONS.map(s => ({ code: s.code, label: s.label })))
    .map((s) => ({
      code: s.code,
      label: s.label ?? s.code,
      icon: SCENE_OPTIONS.find((o) => o.code === s.code)?.icon ?? 'ellipse-outline',
    }));

  const toggleScene = (code: string) => {
    setSelectedScenes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = () => {
    setError(null);
    if (!selectedScenes.length) {
      setError('Pick at least one category.');
      return;
    }
    setScenarios.mutate(
      { cardId: card.id, scenes: selectedScenes, type },
      {
        onSuccess: () => setSaved(true),
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? err?.message ?? 'Could not save spend controls.'),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={[S.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={S.handle} />
          <View style={S.headerRow}>
            <Text style={[S.title, { color: colors.text }]}>Spend controls</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <Text style={[S.cardName, { color: colors.text2 }]}>
            {card.label || card.typeLabel} · {card.maskedNumber}
          </Text>

          {saved ? (
            <View style={{ alignItems: 'center', paddingVertical: Spacing[6] }}>
              <View style={[S.successIcon, { backgroundColor: colors.greenDim }]}>
                <Ionicons name="checkmark-circle" size={36} color={colors.green} />
              </View>
              <Text style={[S.hint, { color: colors.text2, textAlign: 'center', marginTop: Spacing[3] }]}>
                Spend controls updated for this card.
              </Text>
              <TouchableOpacity style={[S.doneBtn, { backgroundColor: colors.primary }]} onPress={onClose} activeOpacity={0.85}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.sm }}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={[S.fieldLabel, { color: colors.text2 }]}>Mode</Text>
              <View style={{ gap: Spacing[2], marginBottom: Spacing[5] }}>
                {SCENARIO_TYPE_OPTIONS.map((opt) => (
                  <TypeOption
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    selected={type === opt.value}
                    onPress={() => setType(opt.value)}
                    colors={colors}
                  />
                ))}
              </View>

              <Text style={[S.fieldLabel, { color: colors.text2 }]}>Categories</Text>
              {catalogLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing[4] }} />
              ) : (
                <View style={C.wrap}>
                  {scenes.map((s) => (
                    <SceneChip
                      key={s.code}
                      label={s.label}
                      icon={s.icon}
                      selected={selectedScenes.includes(s.code)}
                      onPress={() => toggleScene(s.code)}
                      colors={colors}
                    />
                  ))}
                </View>
              )}

              {error && (
                <View style={[S.errorBox, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
                  <Text style={[S.errorText, { color: colors.red }]}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  S.submitBtn,
                  { backgroundColor: selectedScenes.length ? colors.primary : colors.cardHover, marginTop: Spacing[5] },
                ]}
                onPress={handleSave}
                disabled={!selectedScenes.length || setScenarios.isPending}
                activeOpacity={0.85}
              >
                {setScenarios.isPending
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: selectedScenes.length ? '#fff' : colors.text3, fontWeight: '700', fontSize: Typography.sm }}>
                      Save spend controls
                    </Text>}
              </TouchableOpacity>
            </ScrollView>
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
  hint: { fontSize: Typography.xs },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[4],
  },
  errorText: { fontSize: Typography.xs, fontWeight: '600', flex: 1 },
  submitBtn: { paddingVertical: Spacing[4], borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  doneBtn: { marginTop: Spacing[6], paddingVertical: Spacing[3], paddingHorizontal: Spacing[8], borderRadius: Radius.xl },
});

const T = StyleSheet.create({
  option: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    padding: Spacing[4], borderRadius: Radius.xl, borderWidth: 1.5,
  },
  label: { fontSize: Typography.sm, fontWeight: '700' },
  desc: { fontSize: 11, marginTop: 2, lineHeight: 14 },
});

const C = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2], marginBottom: Spacing[2] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5,
  },
  label: { fontSize: 12, fontWeight: '600' },
});
