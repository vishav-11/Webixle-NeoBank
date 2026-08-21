import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GREEN, RED, IS_WEB } from '../constants';
import type { P2POrder, P2PAd } from '@/types/p2pTypes';

// ── Shared bottom-sheet wrapper ────────────────────────────────────────────
function ActionSheet({
  visible, title, onClose, colors, children,
}: { visible: boolean; title: string; onClose: () => void; colors: any; children: React.ReactNode }) {
  if (!visible) return null;
  const Inner = (
    <View style={[s.inner, { backgroundColor: colors.card }, IS_WEB && s.innerWeb]}>
      {!IS_WEB && <View style={[s.handle, { backgroundColor: colors.border }]} />}
      <View style={s.headerRow}>
        <Text style={[s.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity style={[s.closeBtn, { backgroundColor: colors.surface }]} onPress={onClose}>
          <Ionicons name="close" size={18} color={colors.text2} />
        </TouchableOpacity>
      </View>
      {children}
    </View>
  );

  if (IS_WEB) return (
    <Modal visible transparent animationType="fade">
      <View style={s.webOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        <View style={[s.webPanel, { borderColor: colors.border }]}>{Inner}</View>
      </View>
    </Modal>
  );
  return (
    <Modal visible transparent animationType="slide">
      <View style={s.mobileOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
        {Inner}
      </View>
    </Modal>
  );
}

// ── Cancel Order ─────────────────────────────────────────────────────────────
interface CancelOrderModalProps {
  visible: boolean; loading: boolean; onClose: () => void;
  onConfirm: (reason: string) => void; colors: any;
}
export function CancelOrderModal({ visible, loading, onClose, onConfirm, colors }: CancelOrderModalProps) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!visible) setReason(''); }, [visible]);

  return (
    <ActionSheet visible={visible} title="Cancel Order" onClose={onClose} colors={colors}>
      <Text style={[s.sub, { color: colors.text2 }]}>
        Are you sure you want to cancel this order? Escrowed funds will be returned.
      </Text>
      <TextInput
        style={[s.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        placeholder="Reason (optional)" placeholderTextColor={colors.text3}
        value={reason} onChangeText={setReason} multiline
      />
      <TouchableOpacity
        style={[s.dangerBtn, loading && { opacity: 0.6 }]}
        onPress={() => onConfirm(reason)} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.dangerBtnTxt}>Cancel Order</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

// ── Release Order ─────────────────────────────────────────────────────────────
interface ReleaseOrderModalProps {
  visible: boolean; order: P2POrder | null; loading: boolean;
  onClose: () => void; onConfirm: () => void; colors: any;
}
export function ReleaseOrderModal({ visible, order, loading, onClose, onConfirm, colors }: ReleaseOrderModalProps) {
  if (!order) return null;
  const currency = order.currency ?? (typeof order.adId === 'object' ? (order.adId as P2PAd).currency : '') ?? '';
  return (
    <ActionSheet visible={visible} title="Release Crypto" onClose={onClose} colors={colors}>
      <Text style={[s.sub, { color: colors.text2 }]}>
        By releasing, you confirm you have received{' '}
        <Text style={{ fontWeight: '700', color: colors.text }}>{order.fiatAmount} {currency}</Text>{' '}
        in your account. This cannot be undone.
      </Text>
      {order.fiatProof && (
        <View style={[s.proofBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.proofLbl, { color: colors.text2 }]}>Buyer's payment reference</Text>
          <Text style={[s.proofVal, { color: colors.text }]}>{order.fiatProof}</Text>
        </View>
      )}
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: GREEN }, loading && { opacity: 0.6 }]}
        onPress={onConfirm} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnTxt}>Release Crypto</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

// ── Fiat Sent ──────────────────────────────────────────────────────────────────
interface FiatSentModalProps {
  visible: boolean; order: P2POrder | null; loading: boolean;
  onClose: () => void; onConfirm: (proof: string) => void; colors: any;
}
export function FiatSentModal({ visible, order, loading, onClose, onConfirm, colors }: FiatSentModalProps) {
  const [proof, setProof] = useState('');
  useEffect(() => { if (!visible) setProof(''); }, [visible]);
  if (!order) return null;
  const currency = order.currency ?? (typeof order.adId === 'object' ? (order.adId as P2PAd).currency : '') ?? '';

  return (
    <ActionSheet visible={visible} title="Confirm Payment Sent" onClose={onClose} colors={colors}>
      <View style={[s.amtCard, { backgroundColor: 'rgba(0,211,149,0.08)', borderColor: 'rgba(0,211,149,0.25)' }]}>
        <Text style={[s.amtLbl, { color: colors.text2 }]}>Amount Sent</Text>
        <Text style={[s.amtVal, { color: GREEN }]}>{order.fiatAmount} {currency}</Text>
      </View>
      <Text style={[s.label, { color: colors.text2 }]}>Transaction ID / UTR / Reference</Text>
      <TextInput
        style={[s.input, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        placeholder="e.g. UPI_REF_123456789" placeholderTextColor={colors.text3}
        value={proof} onChangeText={setProof}
      />
      <View style={[s.warnBox, { backgroundColor: 'rgba(245,166,35,0.1)', borderColor: 'rgba(245,166,35,0.3)' }]}>
        <Ionicons name="alert-circle-outline" size={14} color="#FFB23F" />
        <Text style={[s.warnTxt, { color: colors.text2 }]}>
          Click confirm only AFTER you have actually sent the payment.
        </Text>
      </View>
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: GREEN }, loading && { opacity: 0.6 }]}
        onPress={() => onConfirm(proof)} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnTxt}>I Have Sent Payment</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

// ── Dispute ────────────────────────────────────────────────────────────────────
interface DisputeModalProps {
  visible: boolean; loading: boolean; onClose: () => void;
  onConfirm: (reason: string) => void; colors: any;
}
export function DisputeModal({ visible, loading, onClose, onConfirm, colors }: DisputeModalProps) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (!visible) setReason(''); }, [visible]);

  return (
    <ActionSheet visible={visible} title="Raise Dispute" onClose={onClose} colors={colors}>
      <View style={[s.warnBox, { backgroundColor: 'rgba(245,166,35,0.1)', borderColor: 'rgba(245,166,35,0.3)' }]}>
        <Ionicons name="alert-circle-outline" size={14} color="#FFB23F" />
        <Text style={[s.warnTxt, { color: colors.text2 }]}>
          Disputes should only be raised for genuine issues. False disputes may affect your trust score.
        </Text>
      </View>
      <Text style={[s.label, { color: colors.text2 }]}>Reason for Dispute</Text>
      <TextInput
        style={[s.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        placeholder="Describe the issue in detail…" placeholderTextColor={colors.text3}
        value={reason} onChangeText={setReason} multiline
      />
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: '#FFB23F' }, (loading || !reason.trim()) && { opacity: 0.6 }]}
        onPress={() => onConfirm(reason)} disabled={loading || !reason.trim()} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnTxt}>Submit Dispute</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

// ── Rate Seller ───────────────────────────────────────────────────────────────
interface RateSellerModalProps {
  visible: boolean; loading: boolean; onClose: () => void;
  onConfirm: (rating: number, comment: string) => void; colors: any;
}
export function RateSellerModal({ visible, loading, onClose, onConfirm, colors }: RateSellerModalProps) {
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState('');
  useEffect(() => { if (!visible) { setRating(5); setComment(''); } }, [visible]);

  return (
    <ActionSheet visible={visible} title="Rate Seller" onClose={onClose} colors={colors}>
      <View style={s.starRow}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={30} color={GREEN} />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={[s.textArea, { color: colors.text, backgroundColor: colors.surface, borderColor: colors.border }]}
        placeholder="Leave a comment (optional)" placeholderTextColor={colors.text3}
        value={comment} onChangeText={setComment} multiline
      />
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: GREEN }, loading && { opacity: 0.6 }]}
        onPress={() => onConfirm(rating, comment)} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.primaryBtnTxt}>Submit Rating</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

// ── Delete Ad ──────────────────────────────────────────────────────────────────
interface DeleteAdModalProps {
  visible: boolean; ad: P2PAd | null; loading: boolean;
  onClose: () => void; onConfirm: () => void; colors: any;
}
export function DeleteAdModal({ visible, ad, loading, onClose, onConfirm, colors }: DeleteAdModalProps) {
  if (!ad) return null;
  return (
    <ActionSheet visible={visible} title="Delete Ad" onClose={onClose} colors={colors}>
      <Text style={[s.sub, { color: colors.text2 }]}>
        Are you sure you want to delete this {ad.type} ad? This action cannot be undone.
      </Text>
      <View style={[s.proofBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.proofVal, { color: colors.text }]}>{ad.type} @ {ad.price} {ad.currency}</Text>
      </View>
      <TouchableOpacity
        style={[s.dangerBtn, loading && { opacity: 0.6 }]}
        onPress={onConfirm} disabled={loading} activeOpacity={0.85}
      >
        {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.dangerBtnTxt}>Delete Ad</Text>}
      </TouchableOpacity>
    </ActionSheet>
  );
}

const s = StyleSheet.create({
  webOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  webPanel:      { width: '100%', maxWidth: 420, borderRadius: 24, borderWidth: 1, overflow: 'hidden' },
  mobileOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  inner:         { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  innerWeb:      { borderRadius: 24 },
  handle:        { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  headerRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:         { fontSize: 18, fontWeight: '700' },
  closeBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  sub:           { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input:         { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 14 },
  textArea:      { borderRadius: 12, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, minHeight: 80, textAlignVertical: 'top', marginBottom: 14 },
  proofBox:      { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
  proofLbl:      { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  proofVal:      { fontSize: 14, fontWeight: '700' },
  amtCard:       { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', marginBottom: 16 },
  amtLbl:        { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  amtVal:        { fontSize: 20, fontWeight: '800' },
  warnBox:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  warnTxt:       { fontSize: 12, flex: 1, lineHeight: 17 },
  starRow:       { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  primaryBtn:    { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  primaryBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  dangerBtn:     { borderRadius: 14, paddingVertical: 15, alignItems: 'center', backgroundColor: RED },
  dangerBtnTxt:  { fontSize: 15, fontWeight: '700', color: '#fff' },
});