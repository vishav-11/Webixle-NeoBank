// CardModule/screens/KycPendingScreen.tsx

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/context/ThemeContext';
import { Spacing, Typography, Radius } from '@/styles/theme';
import { useLayout } from '@/hooks/useLayout';
import { useKycVerificationResult } from '../hooks';
import { updateProfileCache, invalidateProfileCache } from '@/hooks/queires';

export default function KycPendingScreen({
  onBack,
  rejected,
  message,
  onRetry,
  onApproved,          // ← jab KYC pass ho jaye
}: {
  onBack: () => void;
  rejected?: boolean;
  message?: string;
  onRetry: () => void;
  onApproved?: () => void;
}) {
  const { colors } = useTheme();
  const { scrollPaddingBottom, insets } = useLayout();
  const qc = useQueryClient();

  // ✅ Guard: ek baar se zyada callback/cache-update fire na ho
  const approvedCallbackFiredRef = useRef(false);

  const { data: kycResult, isLoading: kycLoading } = useKycVerificationResult(true);

  const normalizedStatus: string = kycResult?.status ?? '';
  const displayStatus: string = kycResult?.rawStatus ?? normalizedStatus.toUpperCase();
  const apiReason: string = kycResult?.reason ?? '';

  const reasonList: string[] = apiReason
    ? apiReason
        .split('.,')
        .map((r: string) => r.trim().replace(/\.$/, ''))
        .filter(Boolean)
    : [];

  const isApproved = normalizedStatus === 'approved';
  const isRejected = rejected ||
    normalizedStatus === 'rejected' ||
    normalizedStatus === 'canceled';

  // ✅ Approved hone par profile update + callback
  useEffect(() => {
    if (!isApproved) return;
    if (approvedCallbackFiredRef.current) return; // double-fire guard

    approvedCallbackFiredRef.current = true;
    console.log('[KycPendingScreen] KYC APPROVED → updating cache + navigating');

    // Step 1: Optimistic cache update — updateProfileCache prefix-matches
    // QK.auth.profile (['auth','profile']), so it patches whichever
    // per-user profile entry is currently cached without needing the userId.
    updateProfileCache(qc, (old) => ({
      ...old,
      interlaceKycStatus: 'approved',
    }));

    // Step 2: Backend se fresh data lo — LEKIN turant nahi.
    // ❌ Turant invalidate karne se backend abhi tak interlaceKycStatus
    // persist nahi kar paata, refetch stale ('submitted') profile la ke
    // hamara optimistic 'approved' overwrite kar deta hai — isi wajah se
    // pehle "Setting up your card access..." pe hamesha ke liye fas jaata
    // tha, kyunki useCardModuleStage ka stage kabhi 'kyc_approved_no_card'
    // pe transition nahi ho pata tha.
    // ✅ 3s delay dekar backend ko catch-up karne ka time do.
    const invalidateTimer = setTimeout(() => {
      invalidateProfileCache(qc);
    }, 3000);

    // Step 3: Thoda wait karo phir callback fire karo
    // (profile invalidate ko settle hone do)
    const navTimer = setTimeout(() => {
      console.log('[KycPendingScreen] → calling onApproved()');
      onApproved?.();
    }, 1500); // 1.5s kaafi hai

    return () => {
      clearTimeout(invalidateTimer);
      clearTimeout(navTimer);
    };
  }, [isApproved]); // ← sirf isApproved pe depend karo

  const fallbackMsg = message ||
    'Your submission could not be verified. Please review your details and try again.';

  // ✅ Approved state
  if (isApproved) {
    return (
      <View style={[S.root, { backgroundColor: colors.bg }]}>
        <ScrollView
          contentContainerStyle={[
            S.body,
            {
              paddingBottom: scrollPaddingBottom,
              paddingTop: insets.top + Spacing[8],
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[S.iconWrap, { backgroundColor: colors.greenDim }]}>
            <Ionicons name="checkmark-circle-outline" size={44} color={colors.green} />
          </View>

          <Text style={[S.title, { color: colors.text }]}>
            KYC Verified! 🎉
          </Text>

          <View style={[
            S.statusBadge,
            {
              backgroundColor: colors.greenDim,
              borderColor: colors.green + '40',
            },
          ]}>
            <View style={[S.statusDot, { backgroundColor: colors.green }]} />
            <Text style={[S.statusText, { color: colors.green }]}>
              {displayStatus || 'APPROVED'}
            </Text>
          </View>

          <Text style={[S.subtitle, { color: colors.text2 }]}>
            Your identity has been verified successfully.
            Setting up your card access...
          </Text>

          {/* ✅ Loading spinner — sirf visual, navigation timer handle karega */}
          <ActivityIndicator color={colors.primary} style={{ marginTop: Spacing[4] }} />
        </ScrollView>
      </View>
    );
  }

  // ── Pending / Rejected state (unchanged) ──────────────────────────
  return (
    <View style={[S.root, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          S.body,
          {
            paddingBottom: scrollPaddingBottom,
            paddingTop: insets.top + Spacing[8],
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          S.iconWrap,
          { backgroundColor: isRejected ? colors.redDim : colors.orangeDim },
        ]}>
          {kycLoading && !kycResult ? (
            <ActivityIndicator size="large" color={colors.orange} />
          ) : isRejected ? (
            <Ionicons name="close-circle-outline" size={44} color={colors.red} />
          ) : (
            <ActivityIndicator size="large" color={colors.orange} />
          )}
        </View>

        <Text style={[S.title, { color: colors.text }]}>
          {isRejected ? 'Verification Rejected' : 'Verifying your details'}
        </Text>

        {displayStatus ? (
          <View style={[
            S.statusBadge,
            {
              backgroundColor: isRejected ? colors.redDim : colors.orangeDim,
              borderColor: isRejected
                ? (colors.redBorder ?? colors.red + '40')
                : (colors.orangeBorder ?? colors.orangeDim),
            },
          ]}>
            <View style={[
              S.statusDot,
              { backgroundColor: isRejected ? colors.red : colors.orange },
            ]} />
            <Text style={[S.statusText, { color: isRejected ? colors.red : colors.orange }]}>
              {displayStatus}
            </Text>
          </View>
        ) : null}

        {!isRejected && (
          <Text style={[S.subtitle, { color: colors.text2 }]}>
            This usually takes a few minutes. We'll update this automatically —
            no need to keep checking.
          </Text>
        )}

        {isRejected && (
          <View style={[
            S.reasonCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.redBorder ?? colors.border,
            },
          ]}>
            <View style={S.reasonHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.red} />
              <Text style={[S.reasonTitle, { color: colors.red }]}>
                Reason{reasonList.length > 1 ? 's' : ''} for rejection
              </Text>
            </View>

            {reasonList.length > 0 ? (
              reasonList.map((reason, i) => (
                <View key={i} style={S.reasonRow}>
                  <View style={[S.bullet, { backgroundColor: colors.red }]} />
                  <Text style={[S.reasonText, { color: colors.text }]}>{reason}</Text>
                </View>
              ))
            ) : (
              <Text style={[S.reasonText, { color: colors.text }]}>{fallbackMsg}</Text>
            )}
          </View>
        )}

        {isRejected && reasonList.length > 0 && (
          <View style={[S.tipsCard, { backgroundColor: colors.cardHover }]}>
            <Text style={[S.tipsTitle, { color: colors.text }]}>💡 How to fix this</Text>
            {REJECTION_TIPS.map((tip, i) => (
              <Text key={i} style={[S.tipText, { color: colors.text2 }]}>• {tip}</Text>
            ))}
          </View>
        )}

        {isRejected && (
          <TouchableOpacity
            style={[S.cta, { backgroundColor: colors.primary }]}
            onPress={onRetry}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={18} color="#fff" />
            <Text style={S.ctaText}>Resubmit Verification</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const REJECTION_TIPS = [
  'Use original documents — screenshots are not accepted.',
  'Ensure photos are clear, well-lit, and not blurry.',
  'Make sure all text on the document is fully visible.',
  'Take a clear selfie — no glasses, hats, or masks.',
  'Ensure document is not expired.',
];

const S = StyleSheet.create({
  root: { flex: 1 },
  body: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing[6],
  },
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing[5],
  },
  title: {
    fontSize: Typography.xl, fontWeight: '800',
    textAlign: 'center', marginBottom: Spacing[3],
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing[3], paddingVertical: 6,
    borderRadius: Radius.full, borderWidth: 1,
    marginBottom: Spacing[5],
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: Typography.xs, fontWeight: '700', letterSpacing: 0.5 },
  subtitle: {
    fontSize: Typography.sm, textAlign: 'center',
    lineHeight: 22, marginBottom: Spacing[6],
  },
  reasonCard: {
    width: '100%', borderRadius: Radius.xl, borderWidth: 1,
    padding: Spacing[4], marginBottom: Spacing[4],
  },
  reasonHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: Spacing[3],
  },
  reasonTitle: { fontSize: Typography.sm, fontWeight: '700' },
  reasonRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, marginBottom: Spacing[2],
  },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 6, flexShrink: 0 },
  reasonText: { fontSize: Typography.sm, lineHeight: 20, flex: 1 },
  tipsCard: {
    width: '100%', borderRadius: Radius.xl,
    padding: Spacing[4], marginBottom: Spacing[6], gap: 8,
  },
  tipsTitle: { fontSize: Typography.sm, fontWeight: '700', marginBottom: 4 },
  tipText: { fontSize: Typography.xs, lineHeight: 18 },
  cta: {
    width: '100%', paddingVertical: Spacing[4], borderRadius: Radius.xl,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaText: { color: '#fff', fontSize: Typography.base, fontWeight: '700' },
});