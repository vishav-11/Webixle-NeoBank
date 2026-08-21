/**
 * AccountsTab.tsx
 * "Accounts" tab — matches PDF: Linked Funding Accounts list
 * (BTC primary, USDT, ETH) with PRIMARY badge, SET PRIMARY button,
 * delete icon, and Auto-Funding Priority card.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import type { ColorScheme } from '@/styles/theme';
import type { LinkedAccount } from '@/types/cardTypes';

interface Props {
  colors: ColorScheme;
}

// Mocked accounts — replace with real API data
const MOCK_ACCOUNTS: LinkedAccount[] = [
  { id: '1', symbol: 'BTC',  name: 'BTC',  balance: '0.145 BTC', isPrimary: true  },
  { id: '2', symbol: 'USDT', name: 'USDT', balance: '0.145 BTC', isPrimary: false },
  { id: '3', symbol: 'ETH',  name: 'ETH',  balance: '0.145 BTC', isPrimary: false },
];

const SYMBOL_BG: Record<string, string> = {
  BTC:  '#7C5C1E',
  USDT: '#1E5C4A',
  ETH:  '#1E3D5C',
};

export default function AccountsTab({ colors }: Props) {
  const [accounts, setAccounts] = useState<LinkedAccount[]>(MOCK_ACCOUNTS);

  const setPrimary = (id: string) => {
    setAccounts(prev =>
      prev.map(a => ({ ...a, isPrimary: a.id === id })),
    );
  };

  const removeAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container} nestedScrollEnabled>
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.title, { color: colors.text }]}>Linked Funding Accounts</Text>
        <TouchableOpacity
          style={[s.linkBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          activeOpacity={0.8}
        >
          <Plus size={16} color={colors.green} />
          <Text style={[s.linkTxt, { color: colors.green }]}>Link Account</Text>
        </TouchableOpacity>
      </View>

      {/* Account rows */}
      {accounts.map(acc => {
        const bg = SYMBOL_BG[acc.symbol] || colors.surface;
        return (
          <View
            key={acc.id}
            style={[s.row, { borderBottomColor: colors.borderSoft }]}
          >
            {/* Avatar */}
            <View style={[s.avatar, { backgroundColor: bg }]}>
              <Text style={s.avatarTxt}>{acc.symbol}</Text>
            </View>

            {/* Info */}
            <View style={s.info}>
              <Text style={[s.accName,    { color: colors.text }]}>{acc.name}</Text>
              <Text style={[s.accBalance, { color: colors.text2 }]}>Balanc: {acc.balance}</Text>
              {acc.isPrimary ? (
                <Text style={[s.primaryBadge, { color: colors.green }]}>PRIMARY</Text>
              ) : (
                <TouchableOpacity onPress={() => setPrimary(acc.id)}>
                  <Text style={[s.setPrimary, { color: colors.orange }]}>SET PRIMARY</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Delete */}
            <TouchableOpacity
              style={[s.deleteBtn, { backgroundColor: colors.red + '18' }]}
              onPress={() => removeAccount(acc.id)}
              activeOpacity={0.8}
            >
              <Trash2 size={16} color={colors.red} />
            </TouchableOpacity>
          </View>
        );
      })}

      {accounts.length === 0 && (
        <View style={s.empty}>
          <Text style={[s.emptyTxt, { color: colors.text3 }]}>No linked accounts</Text>
        </View>
      )}

      {/* Auto-Funding Priority card */}
      <View style={[s.autoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.autoTitle, { color: colors.text }]}>Auto-Funding Priority</Text>
        <Text style={[s.autoBody, { color: colors.text2 }]}>
          When your card balance is low, funds are automatically pulled from
          your linked accounts in order of priority. Set an account as PRIMARY
          to make it the first source used for top-ups and transactions.
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 24 },

  header:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: '700' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  linkTxt: { fontSize: 13, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  info:         { flex: 1 },
  accName:      { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  accBalance:   { fontSize: 13, marginBottom: 4 },
  primaryBadge: { fontSize: 12, fontWeight: '700' },
  setPrimary:   { fontSize: 12, fontWeight: '700' },

  deleteBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  empty:    { paddingVertical: 40, alignItems: 'center' },
  emptyTxt: { fontSize: 15 },

  autoCard:  { borderRadius: 14, borderWidth: 1, padding: 16, marginTop: 20 },
  autoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  autoBody:  { fontSize: 13, lineHeight: 20 },
});
