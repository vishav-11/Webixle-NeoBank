/**
 * ManageTab.tsx
 * "Manage" tab content — matches the PDF design:
 * Card Status + Freeze button, Balance, Recent Transactions, Top Up / Settings,
 * Card Replacement, Card Features.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import {
  Smartphone,
  Shield,
  DollarSign,
  Settings,
  RefreshCw,
  Eye,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import type { NormalizedCard, CardTransaction } from '@/types/cardTypes';
import type { ColorScheme } from '@/styles/theme';

interface Props {
  activeCard:      NormalizedCard | null;
  transactions:    CardTransaction[];
  actionLoading:   boolean;
  onFreeze:        () => void;
  onTopUp:         () => void;
  onSettings:      () => void;
  onViewCard:      (cardId: string) => void;
  onApply:         () => void;
  colors:          ColorScheme;
}

const FEATURES = [
  { icon: Smartphone, title: 'Apple & Google Pay', desc: 'Add to your wallet' },
  { icon: Shield,     title: 'Secure',             desc: 'Advanced fraud protection' },
  { icon: DollarSign, title: 'No Annual Fee',       desc: '130M+ merchants worldwide' },
] as const;

export default function ManageTab({
  activeCard,
  transactions,
  actionLoading,
  onFreeze,
  onTopUp,
  onSettings,
  onViewCard,
  onApply,
  colors,
}: Props) {
  const isFrozen     = activeCard?.status === 'frozen';
  const isProcessing = activeCard?.status === 'processing';

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.container}
      nestedScrollEnabled
    >
      {/* ── Apply / View buttons ────────────────────────────────────────── */}
      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.mainBtn, { backgroundColor: colors.green }]}
          onPress={onApply}
          activeOpacity={0.85}
        >
          <Text style={[s.mainBtnTxt, { color: '#000' }]}>Apply</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.mainBtn, { backgroundColor: colors.green }]}
          onPress={() => activeCard && onViewCard(activeCard.cardId)}
          activeOpacity={0.85}
        >
          <Text style={[s.mainBtnTxt, { color: '#000' }]}>View</Text>
        </TouchableOpacity>
      </View>

      {/* ── Card Status ─────────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.statusRow}>
          <View style={s.statusLeft}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Card Status</Text>
            <Text style={[s.cardSub, { color: colors.text2 }]}>
              {isFrozen
                ? `Card is ${activeCard?.statusLabel || 'frozen'} - no transactions allowed`
                : isProcessing
                ? `Card is ${activeCard?.statusLabel || 'processing'}`
                : 'Card is active and ready to use'}
            </Text>
          </View>
          {!isProcessing && activeCard?.status !== 'closed' && (
            <TouchableOpacity
              style={[
                s.freezeBtn,
                {
                  backgroundColor: isFrozen
                    ? colors.blue + '22'
                    : colors.red + '22',
                  borderColor: isFrozen ? colors.blue : colors.red,
                },
              ]}
              onPress={onFreeze}
              disabled={actionLoading}
              activeOpacity={0.8}
            >
              <Text style={[s.freezeTxt, { color: isFrozen ? colors.blue : colors.red }]}>
                {isFrozen ? 'Unfreeze' : 'Freeze'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Card Balance ─────────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={s.balanceRow}>
          <Text style={[s.balanceLabel, { color: colors.text2 }]}>Card Balance</Text>
          <Eye size={16} color={colors.text3} />
        </View>
        <Text style={[s.balanceAmt, { color: colors.text }]}>
          ${activeCard?.balance?.toFixed(2) ?? '0.00'}{' '}
          <Text style={[s.balanceCur, { color: colors.text2 }]}>
            {activeCard?.currency ?? 'USD'}
          </Text>
        </Text>
      </View>

      {/* ── Recent Transactions ──────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.cardTitle, { color: colors.text, marginBottom: 14 }]}>
          Recent Transactions
        </Text>
        {transactions.length === 0 ? (
          <Text style={[s.emptyTxt, { color: colors.text3 }]}>No transactions yet</Text>
        ) : (
          transactions.slice(0, 5).map(tx => {
            const isCredit = parseFloat(tx.amount) >= 0;
            return (
              <View key={tx.orderId} style={s.txRow}>
                <View
                  style={[
                    s.txIcon,
                    { backgroundColor: isCredit ? colors.green + '22' : colors.red + '22' },
                  ]}
                >
                  {isCredit
                    ? <TrendingUp  size={16} color={colors.green} />
                    : <TrendingDown size={16} color={colors.red} />
                  }
                </View>
                <View style={s.txInfo}>
                  <Text style={[s.txName, { color: colors.text }]}>
                    {tx.merchantName || 'Transaction'}
                  </Text>
                  <Text style={[s.txDate, { color: colors.text3 }]}>{tx.createTime}</Text>
                </View>
                <Text
                  style={[s.txAmt, { color: isCredit ? colors.green : colors.red }]}
                >
                  {isCredit ? '+' : ''}{tx.amount} {tx.currency}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* ── Top Up / Settings ────────────────────────────────────────────── */}
      <View style={s.quickRow}>
        <TouchableOpacity
          style={[s.quickBtn, { backgroundColor: colors.orange + '22', borderColor: colors.orange + '44' }]}
          onPress={onTopUp}
          activeOpacity={0.8}
        >
          <Text style={[s.quickTxt, { color: colors.orange }]}>Top Up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.quickBtn, { backgroundColor: colors.red + '22', borderColor: colors.red + '44' }]}
          onPress={onSettings}
          activeOpacity={0.8}
        >
          <Text style={[s.quickTxt, { color: colors.red }]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* ── Card Replacement ─────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.cardTitle, { color: colors.text, marginBottom: 14 }]}>
          Card Replacement
        </Text>
        <TouchableOpacity
          style={[s.replaceBtn, { backgroundColor: colors.orange }]}
          activeOpacity={0.8}
        >
          <RefreshCw size={16} color="#fff" />
          <Text style={s.replaceTxt}>Request Replacement</Text>
        </TouchableOpacity>
      </View>

      {/* ── Card Features ────────────────────────────────────────────────── */}
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[s.cardTitle, { color: colors.text, marginBottom: 14 }]}>
          Card Features
        </Text>
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <View key={title} style={[s.featureRow, { borderColor: colors.borderSoft }]}>
            <View style={[s.featureIcon, { backgroundColor: colors.surface }]}>
              <Icon size={18} color={colors.green} />
            </View>
            <View>
              <Text style={[s.featureTitle, { color: colors.text }]}>{title}</Text>
              <Text style={[s.featureSub,   { color: colors.text2 }]}>{desc}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 24 },

  // Apply / View
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  mainBtn:   { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  mainBtnTxt:{ fontSize: 15, fontWeight: '700' },

  // Card wrapper
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub:   { fontSize: 13, marginTop: 4, lineHeight: 18 },

  // Status row
  statusRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLeft: { flex: 1, marginRight: 12 },
  freezeBtn:  {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  freezeTxt: { fontSize: 13, fontWeight: '600' },

  // Balance
  balanceRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  balanceLabel:{ fontSize: 13 },
  balanceAmt:  { fontSize: 32, fontWeight: '700' },
  balanceCur:  { fontSize: 16, fontWeight: '400' },

  // Transactions
  emptyTxt: { fontSize: 13, textAlign: 'center', paddingVertical: 16 },
  txRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  txIcon:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txInfo:   { flex: 1 },
  txName:   { fontSize: 14, fontWeight: '500' },
  txDate:   { fontSize: 12, marginTop: 2 },
  txAmt:    { fontSize: 14, fontWeight: '600' },

  // Quick actions
  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  quickBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  quickTxt: { fontSize: 14, fontWeight: '700' },

  // Replacement
  replaceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  replaceTxt: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Features
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 14,
  },
  featureIcon:  { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureTitle: { fontSize: 14, fontWeight: '600' },
  featureSub:   { fontSize: 12, marginTop: 2 },
});
