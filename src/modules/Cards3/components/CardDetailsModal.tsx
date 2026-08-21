// CardModule/components/CardDetailsModal.tsx
//
// "Secure view" of full card details — GET /cards/:cardId/access-token.
// This is a SEPARATE path from the inline reveal already on CardsScreen
// (getCardReveal / payment-details, which returns plain pan/cvv). Interlace's
// access-token endpoint is meant for viewing card details through their own
// secure hosted surface instead of pulling raw PAN through your backend.
//
// No WebView/browser dependency is assumed here (none is in this project's
// package list) — if the response includes a hosted `url`, this opens it in
// the device's default browser via React Native's built-in `Linking`. If
// only a `token` comes back, it's shown as selectable text so the user can
// pass it wherever your Interlace integration expects it. Swap the
// `Linking.openURL` branch for a WebView modal once `react-native-webview`
// is confirmed available in this project and you've seen a real response.

import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  Pressable, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useCardAccessToken } from '../hooks';
import type { CardInfo } from '../types';

export default function CardDetailsModal({
  visible, card, onClose,
}: {
  visible: boolean;
  card: CardInfo | null;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } =
    useCardAccessToken(card?.id ?? '', visible && !!card);

  const errMsg = (error as any)?.response?.data?.message ?? (error as any)?.message;

  useEffect(() => {
    // Auto-opens the hosted secure page as soon as the token arrives, so
    // the user doesn't have to tap twice — falls back to the in-sheet
    // token view if Interlace only returned a bare token.
    if (visible && data?.url) {
      Linking.openURL(data.url).catch(() => {});
    }
  }, [visible, data?.url]);

  if (!card) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={S.backdrop} onPress={onClose}>
        <Pressable style={[S.sheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={S.handle} />
          <View style={S.headerRow}>
            <Text style={[S.title, { color: colors.text }]}>Secure card details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.text2} />
            </TouchableOpacity>
          </View>
          <Text style={[S.cardName, { color: colors.text2 }]}>
            {card.label || card.typeLabel} · {card.maskedNumber}
          </Text>

          {isLoading && (
            <View style={{ alignItems: 'center', paddingVertical: Spacing[8] }}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[S.hint, { color: colors.text2, marginTop: Spacing[3] }]}>
                Requesting a secure access token…
              </Text>
            </View>
          )}

          {isError && (
            <View style={[S.errorBox, { backgroundColor: colors.redDim, borderColor: colors.redBorder }]}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
              <Text style={[S.errorText, { color: colors.red }]}>
                {errMsg ?? 'Could not open secure card view.'}
              </Text>
            </View>
          )}

          {!isLoading && !isError && data && (
            data.url ? (
              <View style={{ alignItems: 'center', paddingVertical: Spacing[6] }}>
                <Ionicons name="open-outline" size={32} color={colors.primary} />
                <Text style={[S.hint, { color: colors.text2, textAlign: 'center', marginTop: Spacing[3] }]}>
                  Opened in your browser. If nothing happened, tap below.
                </Text>
                <TouchableOpacity
                  style={[S.openBtn, { backgroundColor: colors.primary }]}
                  onPress={() => Linking.openURL(data.url!).catch(() => {})}
                  activeOpacity={0.85}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: Typography.sm }}>
                    Open secure page
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[S.tokenBox, { backgroundColor: colors.cardHover, borderColor: colors.border }]}>
                <Text style={[S.fieldLabel, { color: colors.text2 }]}>Access token</Text>
                <Text selectable style={[S.tokenText, { color: colors.text }]}>
                  {data.token ?? '—'}
                </Text>
                {data.expiresIn != null && (
                  <Text style={[S.hint, { color: colors.text3, marginTop: Spacing[2] }]}>
                    Expires in {data.expiresIn}s
                  </Text>
                )}
              </View>
            )
          )}

          <TouchableOpacity
            style={[S.refreshBtn, { borderColor: colors.border }]}
            onPress={() => refetch()}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={14} color={colors.text2} />
            <Text style={[S.refreshText, { color: colors.text2 }]}>Get a new token</Text>
          </TouchableOpacity>
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
  cardName: { fontSize: Typography.xs, marginTop: 4, marginBottom: Spacing[2] },
  hint: { fontSize: Typography.xs },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing[4], paddingVertical: Spacing[3],
    borderRadius: Radius.lg, borderWidth: 1, marginTop: Spacing[4],
  },
  errorText: { fontSize: Typography.xs, fontWeight: '600', flex: 1 },
  openBtn: { marginTop: Spacing[5], paddingVertical: Spacing[3], paddingHorizontal: Spacing[8], borderRadius: Radius.xl },
  tokenBox: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing[4], marginTop: Spacing[4] },
  fieldLabel: { fontSize: Typography.xs, fontWeight: '700', marginBottom: Spacing[2] },
  tokenText: { fontSize: Typography.xs, fontWeight: '600', lineHeight: 18 },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: Spacing[5], paddingVertical: Spacing[3], borderRadius: Radius.lg, borderWidth: 1,
  },
  refreshText: { fontSize: Typography.xs, fontWeight: '700' },
});
