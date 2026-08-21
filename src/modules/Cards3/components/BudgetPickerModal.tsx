// CardModule/components/BudgetPickerModal.tsx
// Lets the user pick an existing Budget to attach a budget-card to, or spin
// up a new one inline (POST /budget just needs a `name` — see
// card.service.js#createBudget) without leaving the create-card flow.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  FlatList, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useBudgets, useCreateBudget } from '../hooks';
import type { Budget } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (budget: Budget) => void;
  selectedId?: string;
}

export default function BudgetPickerModal({ visible, onClose, onSelect, selectedId }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { data: budgets, isLoading, isFetching } = useBudgets(visible);
  const createBudget = useCreateBudget();

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSelect = (b: Budget) => {
    onSelect(b);
    onClose();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Give your budget a name first.');
      return;
    }
    setError(null);
    try {
      const budget = await createBudget.mutateAsync({ name: trimmed });
      setName('');
      setCreating(false);
      handleSelect(budget);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? err?.message ?? 'Could not create budget. Please try again.'
      );
    }
  };

  const renderItem = ({ item }: { item: Budget }) => {
    const isSelected = item.id === selectedId;
    return (
      <TouchableOpacity
        style={[
          M.item,
          {
            backgroundColor: isSelected ? (colors.primaryDim ?? colors.cardHover) : 'transparent',
            borderBottomColor: colors.borderSoft,
          },
        ]}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <View style={[M.budgetIcon, { backgroundColor: colors.iconTileBg }]}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[M.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.balance != null && (
            <Text style={[M.itemSub, { color: colors.text3 }]}>
              {item.currency ?? 'USD'} {item.balance}
            </Text>
          )}
        </View>
        {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[M.root, { backgroundColor: colors.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[M.header, { paddingTop: insets.top + Spacing[2] }]}>
          <Text style={[M.headerTitle, { color: colors.text }]}>Choose a budget</Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={M.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={budgets ?? []}
            keyExtractor={(b) => b.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: Spacing[4] }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={M.center}>
                <Ionicons name="pie-chart-outline" size={40} color={colors.text3} />
                <Text style={[M.emptyText, { color: colors.text2 }]}>
                  No budgets yet — create your first one below.
                </Text>
              </View>
            }
            ListFooterComponent={
              isFetching ? <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing[4] }} /> : null
            }
          />
        )}

        {/* ── Create new budget ───────────────────────────────────────── */}
        <View style={[M.createBox, { borderTopColor: colors.borderSoft, paddingBottom: insets.bottom + Spacing[4] }]}>
          {creating ? (
            <>
              <TextInput
                value={name}
                onChangeText={(t) => { setName(t); setError(null); }}
                placeholder="e.g. Groceries, Travel, Subscriptions"
                placeholderTextColor={colors.text3}
                style={[M.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardHover }]}
                autoFocus
                maxLength={40}
              />
              {error && <Text style={[M.errorText, { color: colors.red }]}>{error}</Text>}
              <View style={{ flexDirection: 'row', gap: Spacing[3], marginTop: Spacing[3] }}>
                <TouchableOpacity
                  style={[M.btn, { backgroundColor: colors.cardHover, flex: 1 }]}
                  onPress={() => { setCreating(false); setName(''); setError(null); }}
                  disabled={createBudget.isPending}
                >
                  <Text style={[M.btnText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[M.btn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={handleCreate}
                  disabled={createBudget.isPending}
                >
                  {createBudget.isPending
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[M.btnText, { color: '#fff' }]}>Create & select</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <TouchableOpacity
              style={[M.newBtn, { borderColor: colors.primary }]}
              onPress={() => setCreating(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
              <Text style={[M.newBtnText, { color: colors.primary }]}>Create a new budget</Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const M = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[4], paddingBottom: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: Typography.lg, fontWeight: '800' },
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing[3], paddingVertical: Spacing[10] },
  emptyText: { fontSize: Typography.sm, textAlign: 'center', paddingHorizontal: Spacing[6] },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  budgetIcon: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: Typography.sm, fontWeight: '700' },
  itemSub: { fontSize: Typography.xs, marginTop: 2 },
  createBox: { paddingHorizontal: Spacing[4], paddingTop: Spacing[4], borderTopWidth: StyleSheet.hairlineWidth },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: Spacing[4], borderRadius: Radius.xl, borderWidth: 1.5, borderStyle: 'dashed',
  },
  newBtnText: { fontSize: Typography.sm, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], fontSize: Typography.sm },
  errorText: { fontSize: Typography.xs, fontWeight: '600', marginTop: Spacing[2] },
  btn: { paddingVertical: Spacing[3], borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: Typography.sm, fontWeight: '700' },
});
