// CardModule/hooks/useInterlaceStatus.ts

import { useProfile } from '@/hooks/queires';

export type InterlaceFlowState =
  | 'kyc_not_started'      // interlaceKycStatus missing / not_started / empty
  | 'kyc_pending'          // interlaceKycStatus: 'pending' | 'submitted'
  | 'kyc_rejected'         // interlaceKycStatus: 'rejected' | 'canceled'
  | 'kyc_approved_no_card' // interlaceKycStatus: 'approved' (account may or may not exist)
  | 'card_active';         // ← KEPT for type compat but never returned from here
                           //   CardsScreen controls card existence via stage,
                           //   not this hook.

export function useInterlaceStatus() {
  const { data: profile, isLoading, refetch } = useProfile();
  const prof = profile as any;

  // Normalize to lowercase so 'Approved', 'APPROVED', 'approved' all work
  const interlaceKycStatus: string = (
    prof?.interlaceKycStatus ?? 'not_started'
  ).toLowerCase();

  const interlaceAccountCreated: boolean =
    prof?.interlaceAccountCreated ?? false;

  const flowState: InterlaceFlowState = (() => {
    // ✅ Only KYC status matters here.
    // Card existence is handled by useCardModuleStage → CardsScreen.
    // interlaceAccountCreated is intentionally NOT used to gate 'card_active'
    // because account creation ≠ card creation.

    if (
      interlaceKycStatus === 'approved'
    ) {
      // ✅ Always return kyc_approved_no_card when KYC is approved.
      // CardsScreen decides whether to show CreateCardScreen or LiveCardsView
      // based on whether cards[] is empty — not this hook.
      return 'kyc_approved_no_card';
    }

    if (
      interlaceKycStatus === 'rejected' ||
      interlaceKycStatus === 'canceled'
    ) {
      return 'kyc_rejected';
    }

    if (
      interlaceKycStatus === 'pending' ||
      interlaceKycStatus === 'submitted'
    ) {
      return 'kyc_pending';
    }

    // 'not_started', empty string, null, anything else
    return 'kyc_not_started';
  })();

  return {
    flowState,
    interlaceKycStatus,      // normalized lowercase string
    interlaceAccountCreated, // still exposed for callers that need it
    isLoading,
    refetch,
    profile: prof,
  };
}