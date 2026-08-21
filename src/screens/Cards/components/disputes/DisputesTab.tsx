/**
 * DisputesTab.tsx
 * "Disputes" tab — matches PDF: header with "File Dispute" button,
 * list of disputes or empty state "No active disputes".
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { AlertCircle, Plus, X, Info } from 'lucide-react-native';
import type { NormalizedCard, Dispute } from '@/types/cardTypes';
import type { ColorScheme } from '@/styles/theme';
import cardService from '@/services/cardService';

interface Props {
  activeCard: NormalizedCard | null;
  colors:     ColorScheme;
}

const STATUS_COLORS: Record<Dispute['status'], string> = {
  PENDING:  '#F59E0B',
  OPEN:     '#3B82F6',
  RESOLVED: '#10B981',
  REJECTED: '#EF4444',
};

export default function DisputesTab({ activeCard, colors }: Props) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [showModal,setShowModal]= useState(false);

  // File dispute form
  const [txId,   setTxId]   = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const loadDisputes = () => {
    if (!activeCard?.cardId) return;
    setLoading(true);
    cardService
      .getDisputes(1, 20, '')
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setDisputes(list);
      })
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadDisputes(); }, [activeCard?.cardId]);

  const handleFileDispute = async () => {
    if (!txId.trim() || !amount.trim() || !reason.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await cardService.requestRefund({ transactionID: txId, amount, reason });
      setShowModal(false);
      setTxId(''); setAmount(''); setReason('');
      loadDisputes();
    } catch (err: any) {
      setError(err?.response?.data?.msg || 'Failed to file dispute.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container} nestedScrollEnabled>
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.title, { color: colors.text }]}>Transaction Dispute</Text>
          <TouchableOpacity
            style={[s.fileBtn, { backgroundColor: colors.red + '22', borderColor: colors.red + '55' }]}
            onPress={() => setShowModal(true)}
            activeOpacity={0.8}
          >
            <Info size={14} color={colors.red} />
            <Text style={[s.fileBtnTxt, { color: colors.red }]}>File Dispute</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator color={colors.green} />
          </View>
        ) : disputes.length === 0 ? (
          <View style={s.empty}>
            <Text style={[s.emptyTxt, { color: colors.text3 }]}>No active disputes</Text>
          </View>
        ) : (
          disputes.map(dispute => (
            <View
              key={dispute.id}
              style={[s.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={s.rowLeft}>
                <AlertCircle size={18} color={STATUS_COLORS[dispute.status] || colors.text2} />
                <View style={s.rowInfo}>
                  <Text style={[s.rowName, { color: colors.text }]}>
                    {dispute.merchantName || `TX ${dispute.transactionId}`}
                  </Text>
                  <Text style={[s.rowDate, { color: colors.text3 }]}>{dispute.createdAt}</Text>
                </View>
              </View>
              <View style={s.rowRight}>
                <Text style={[s.rowAmt, { color: colors.text }]}>
                  {dispute.amount} {dispute.currency}
                </Text>
                <View style={[s.badge, { backgroundColor: (STATUS_COLORS[dispute.status] || colors.text2) + '22' }]}>
                  <Text style={[s.badgeTxt, { color: STATUS_COLORS[dispute.status] || colors.text2 }]}>
                    {dispute.status}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* File Dispute Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={[s.overlay, { backgroundColor: colors.overlay }]}>
          <View style={[s.modal, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.modalHeader}>
              <Text style={[s.modalTitle, { color: colors.text }]}>File a Dispute</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color={colors.text2} />
              </TouchableOpacity>
            </View>

            <Text style={[s.inputLabel, { color: colors.text2 }]}>Transaction ID</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholderTextColor={colors.text3}
              placeholder="e.g. TX123456"
              value={txId}
              onChangeText={setTxId}
            />

            <Text style={[s.inputLabel, { color: colors.text2 }]}>Amount</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholderTextColor={colors.text3}
              placeholder="e.g. 50.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={[s.inputLabel, { color: colors.text2 }]}>Reason</Text>
            <TextInput
              style={[s.input, s.textarea, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              placeholderTextColor={colors.text3}
              placeholder="Describe the issue..."
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />

            {error && (
              <Text style={[s.errorTxt, { color: colors.red }]}>{error}</Text>
            )}

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.green }]}
              onPress={handleFileDispute}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <Text style={s.submitTxt}>{submitting ? 'Submitting…' : 'Submit Dispute'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { paddingBottom: 24 },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title:     { fontSize: 18, fontWeight: '700' },
  fileBtn:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  fileBtnTxt:{ fontSize: 13, fontWeight: '600' },

  center:   { paddingVertical: 40, alignItems: 'center' },
  empty:    { paddingVertical: 60, alignItems: 'center' },
  emptyTxt: { fontSize: 15 },

  row:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  rowLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowInfo:  { flex: 1 },
  rowName:  { fontSize: 14, fontWeight: '500' },
  rowDate:  { fontSize: 12, marginTop: 2 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmt:   { fontSize: 14, fontWeight: '600' },
  badge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeTxt: { fontSize: 11, fontWeight: '600' },

  // Modal
  overlay:     { flex: 1, justifyContent: 'flex-end' },
  modal:       { borderRadius: 20, borderWidth: 1, padding: 20, margin: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle:  { fontSize: 18, fontWeight: '700' },
  inputLabel:  { fontSize: 13, marginBottom: 6, marginTop: 12 },
  input:       { height: 46, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, fontSize: 14 },
  textarea:    { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  errorTxt:    { fontSize: 13, marginTop: 10 },
  submitBtn:   { marginTop: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitTxt:   { fontSize: 15, fontWeight: '700', color: '#000' },
});
