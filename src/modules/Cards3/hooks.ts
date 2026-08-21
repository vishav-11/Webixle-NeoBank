// CardModule/hooks.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cardService, backendMessage } from './service';
import { CARD_KEYS, KYC_POLL_INTERVAL_MS, MAX_CARDS_PER_USER } from './constants';
import {
  QK,
  useProfile,
  updateProfileCache,
  invalidateProfileCache,
} from '@/hooks/queires';
import type {
  UpdateCardPayload,
  SubmitAccountKycPayload,
  CreateCardholderPayload,
  CreateCardPayload,
  CardModuleStage,
  CreateBudgetPayload,
  CreateBudgetCardPayload,
  UpdateCardPinPayload,
  SetTransactionScenariosPayload,
  NegativeBalanceQuery,
  BatchDeleteCardsPayload,
  TransferPayload,
  CardTransactionsQuery,
} from './types';
import React, { useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════
// ── CARDS
// ═══════════════════════════════════════════════════════════════════

export function useCards(enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.all,
    queryFn: cardService.getCards,
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useCardSummary(cardId: string, enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.summary(cardId),
    queryFn: () => cardService.getCardSummary(cardId),
    enabled: enabled && !!cardId,
    staleTime: 30_000,
  });
}

export function useCardReveal(cardId: string, enabled: boolean) {
  return useQuery({
    queryKey: CARD_KEYS.reveal(cardId),
    queryFn: () => cardService.getCardReveal(cardId),
    enabled: enabled && !!cardId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useFreezeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardService.freezeCard(cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  });
}

export function useUnfreezeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardService.unfreezeCard(cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  });
}

export function useUpdateCardSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCardPayload) => cardService.updateCardSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  });
}

export function useDeleteCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cardId,
      clientTransactionId,
    }: {
      cardId: string;
      clientTransactionId?: string;
    }) => cardService.deleteCard(cardId, clientTransactionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  });
}

// ── Actually issue a PREPAID card (POST /cards/prepaid) ───────────────────
export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCardPayload) => cardService.createCard(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── BUDGETS & BUDGET CARDS
// ═══════════════════════════════════════════════════════════════════

export function useBudgets(enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.budgets,
    queryFn: cardService.listBudgets,
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBudgetPayload) => cardService.createBudget(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.budgets }),
  });
}

// ── Actually issue a BUDGET card (POST /cards/budget-card) ────────────────
export function useCreateBudgetCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBudgetCardPayload) => cardService.createBudgetCard(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── ACCOUNT
// ═══════════════════════════════════════════════════════════════════

export function useCreateInterlaceAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cardService.createAccount(),

    onSuccess: (data) => {
      console.log('[useCreateInterlaceAccount:onSuccess]', data);

      // ✅ STEP 1: Turant cache update karo (no API wait). updateProfileCache
      // prefix-matches QK.auth.profile → jo bhi user profile abhi cached hai
      // usko patch kar deta hai, chahe key me userId suffix ho.
      updateProfileCache(qc, (old) => ({
        ...old,
        interlaceAccountCreated: true,
        ...(data?.accountId && { interlaceAccountId: data.accountId }),
        ...(data?.interlaceDisplayId && { interlaceDisplayId: data.interlaceDisplayId }),
      }));

      // ❌ Profile ka turant invalidate NAHI karte — backend abhi tak
      // interlaceAccountCreated flag persist nahi kar paata, turant refetch
      // karne se stale (false) data hamara optimistic true overwrite kar deta hai.
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });

      // ✅ Background me delayed refetch — tab tak backend catch up kar chuka hoga.
      // Ab sahi key (QK.auth.profile) target ho rahi hai, so ye actually
      // real profile query ko refetch karega (pehle ['profile'] literal key
      // ki wajah se ye call silently no-op tha).
      setTimeout(() => {
        invalidateProfileCache(qc);
      }, 3000);
    },

    onError: (error: any) => {
      const errorMsg = (
        error?.response?.data?.message ??
        error?.message ?? ''
      ).toLowerCase();

      console.log('[useCreateInterlaceAccount:onError]', errorMsg);

      // ✅ "Already exists" = account hai, profile cache update karo
      const isAlreadyExists =
        errorMsg.includes('already exists') ||
        errorMsg.includes('account already created') ||
        errorMsg.includes('already have an account') ||
        errorMsg.includes('bound to a') ||
        errorMsg.includes('email address has been bound') ||
        errorMsg.includes('registered account');

      if (isAlreadyExists) {
        console.log('[useCreateInterlaceAccount:onError] → Already exists, updating cache');

        updateProfileCache(qc, (old) => ({
          ...old,
          interlaceAccountCreated: true,
        }));

        // ❌ Yahan bhi turant invalidate mat karo — same race condition
        setTimeout(() => {
          invalidateProfileCache(qc);
        }, 3000);
      }
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── KYC
// ═══════════════════════════════════════════════════════════════════

export function useOccupations(search = '', page = 1) {
  return useQuery({
    queryKey: CARD_KEYS.occupations,
    queryFn: () => cardService.getOccupations(search, page),
    staleTime: 5 * 60_000,
  });
}

export function useOccupationSearch(search: string, page: number, enabled = true) {
  // ✅ Normalize search — handle undefined/null
  const normalizedSearch = React.useMemo(() => {
    const s = (search ?? '').trim();
    if (!s || s === 'undefined' || s === 'null') return '';
    return s.toLowerCase();
  }, [search]);

  return useQuery({
    // ✅ QueryKey with normalized search
    queryKey: [...CARD_KEYS.occupations, normalizedSearch, page],

    queryFn: async () => {
      console.log(`[useOccupationSearch] Fetching: search="${normalizedSearch}" page=${page}`);
      const result = await cardService.getOccupations(normalizedSearch, page);
      console.log(`[useOccupationSearch] Response: ${result.docs.length} items, page ${result.page}/${result.totalPages}`);
      return result;
    },

    enabled,
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false, // ✅ Prevent duplicate fetch on mount
  });
}

export function useSubmitAccountKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SubmitAccountKycPayload) =>
      cardService.submitAccountKyc(payload),
    onSuccess: () => {
      // ✅ Fixed key — pehle literal ['profile'] no-op tha
      invalidateProfileCache(qc);
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
      qc.invalidateQueries({ queryKey: CARD_KEYS.kycResult });
    },
  });
}

export function useKycVerificationResult(enabled: boolean) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: CARD_KEYS.kycResult,
    queryFn: async () => {
      const result = await cardService.getKycVerificationResult();
      console.log('[useKycVerificationResult] Result:', result);
      return result;
    },
    enabled,

    refetchInterval: (query) => {
      const data = query.state.data as any;
      const status = data?.status ?? '';

      if (status === 'approved' || status === 'rejected') {
        return false;
      }

      return KYC_POLL_INTERVAL_MS;
    },

    retry: false,

    // IMPORTANT: no side effects here
    select: (data: any) => data,
  });

  const status = query.data?.status;

  useEffect(() => {
    if (!enabled || status !== 'approved') return;

    updateProfileCache(qc, (old) => {
      if (old?.interlaceKycStatus === 'approved') {
        return old;
      }

      console.log(
        '[useKycVerificationResult] Updating profile cache: KYC approved'
      );

      return {
        ...old,
        interlaceKycStatus: 'approved',
      };
    });

    const timer = setTimeout(() => {
      invalidateProfileCache(qc);
    }, 3000);

    return () => clearTimeout(timer);
  }, [enabled, status, qc]);

  return query;
}
export function useUploadKycFiles() {
  return useMutation({
    mutationFn: (files: { uri: string; name: string; type: string }[]) =>
      cardService.uploadFiles(files),
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── BINS
// ═══════════════════════════════════════════════════════════════════

export function useRecommendedBin(enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.recommendedBin,
    queryFn: cardService.getRecommendedBin,
    enabled,
    staleTime: 60_000,
  });
}

export function useCardBins(enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.bins,
    queryFn: cardService.listCardBins,
    enabled,
    staleTime: 60_000,
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── CARDHOLDER
// ═══════════════════════════════════════════════════════════════════

export function useCreateCardholder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCardholderPayload) =>
      cardService.createCardholder(payload),
    onSuccess: () => {
      // ✅ Fixed key — pehle literal ['profile'] no-op tha
      invalidateProfileCache(qc);
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: CARD_KEYS.cardholders });
    },
  });
}

export function useCardholder(cardholderId: string, enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.cardholder(cardholderId),
    queryFn: () => cardService.getCardholder(cardholderId),
    enabled: enabled && !!cardholderId,
    refetchInterval: enabled ? KYC_POLL_INTERVAL_MS : false,
  });
}

// ── NEW: list cardholders, with optional polling while one is pending ─────
export function useCardholders(enabled = true, poll = false) {
  return useQuery({
    queryKey: CARD_KEYS.cardholders,
    queryFn: cardService.listCardholders,
    enabled,
    staleTime: poll ? 0 : 30_000,
    refetchInterval: poll ? KYC_POLL_INTERVAL_MS : false,
  });
}

export function useTriggerCardholderKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardholderId: string) =>
      cardService.triggerCardholderKycVerification(cardholderId),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.cardholders }),
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── CARD MANAGEMENT — PIN, secure view, spend controls, batch delete
// ═══════════════════════════════════════════════════════════════════

/** PUT /cards/:cardId/pin — validate with validateCardPin() before calling. */
export function useUpdateCardPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateCardPinPayload) => cardService.updateCardPin(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: CARD_KEYS.all }),
  });
}

/**
 * GET /cards/:cardId/access-token — fetched on demand (e.g. when the user
 * taps "View secure details"), not on mount: `enabled` should stay false
 * until the modal opens, and the token should NOT be cached long (short-
 * lived by design), so gcTime/staleTime are both 0.
 */
export function useCardAccessToken(cardId: string, enabled: boolean) {
  return useQuery({
    queryKey: CARD_KEYS.accessToken(cardId),
    queryFn: () => cardService.getCardAccessToken(cardId),
    enabled: enabled && !!cardId,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

/** GET /cards/card-transaction-scenarios — the catalog of scene codes available to restrict. */
export function useCardTransactionScenarios(enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.transactionScenarios(),
    queryFn: cardService.listCardTransactionScenarios,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** POST /cards/:cardId/transaction-scenarios — apply spend controls to one card. */
export function useSetCardTransactionScenarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SetTransactionScenariosPayload) =>
      cardService.setCardTransactionScenarios(payload),
    onSuccess: (_data, variables) =>
      qc.invalidateQueries({ queryKey: CARD_KEYS.transactionScenarios(variables.cardId) }),
  });
}

/** GET /cards/negative-balance — cards on this account currently owing money. */
export function useNegativeBalanceCards(enabled = true, query?: NegativeBalanceQuery) {
  return useQuery({
    queryKey: [...CARD_KEYS.negativeBalance, query ?? {}],
    queryFn: () => cardService.listNegativeBalanceCards(query),
    enabled,
    staleTime: 30_000,
  });
}

/** DELETE /cards/batch-delete — removes several cards in one call. */
export function useBatchDeleteCards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: BatchDeleteCardsPayload) => cardService.batchDeleteCards(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: CARD_KEYS.moduleStage });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── TRANSACTIONS
// ═══════════════════════════════════════════════════════════════════

/** GET /cards/transactions — pass a cardId to scope to one card, or omit for all. */
export function useCardTransactions(query?: CardTransactionsQuery, enabled = true) {
  return useQuery({
    queryKey: CARD_KEYS.transactions(query),
    queryFn: () => cardService.getCardTransactions(query),
    enabled,
    staleTime: 30_000,
  });
}

export function useTransferOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferPayload) => cardService.transferOut(payload),
    retry: false,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: ['cards', 'transactions'] });
    },
  });
}

export function useTransferIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: TransferPayload) => cardService.transferIn(payload),
    retry: false,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      qc.invalidateQueries({ queryKey: ['cards', 'transactions'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════
// ── MASTER STAGE HOOK
// ═══════════════════════════════════════════════════════════════════
//
// Profile fields jo use ho rahe hain:
//   interlaceAccountCreated: boolean  — account bana ya nahi
//   interlaceKycStatus: string        — 'pending' | 'approved' | 'rejected' | ''
//
// Sahi flow:
//   1. interlaceAccountCreated: false
//      → 'no_account' (KYC form pe le jao, account baad mein)
//
//   2. interlaceAccountCreated: false + interlaceKycStatus: 'pending'/'rejected'
//      → KYC screens (account still nahi bana)
//
//   3. interlaceKycStatus: 'approved' + interlaceAccountCreated: false
//      → 'kyc_approved_no_account' (ab createAccount API hit karo)
//
//   4. interlaceKycStatus: 'approved' + interlaceAccountCreated: true
//      → Cards fetch karo → 'kyc_approved_no_card' ya 'has_cards'
//
// ═══════════════════════════════════════════════════════════════════

/**
 * INTERLACE CARD FLOW:
 *
 * STEP 0: Platform KYC approved (mainKycApproved)
 *    ↓
 * STEP 1: Create Interlace Account (AUTO) → interlaceAccountCreated: true
 *    ↓
 * STEP 2: Submit Account KYC → interlaceKycStatus: "submitted" → "approved"
 *    ↓
 * STEP 3: Create Cardholder (kyc approved ke baad)
 *    ↓
 * STEP 4: Select BIN
 *    ↓
 * STEP 5: Issue Card (prepaid/budget)
 */

export function useCardModuleStage() {
  const qc = useQueryClient();
  const {
    data: profileData,
    isLoading: profileLoading,
    isFetching: profileFetching,
  } = useProfile();
  const prof = profileData as any;

  const mainKycApproved = prof?.kycStatus === 'Approved';
  const interlaceAccountCreated: boolean = prof?.interlaceAccountCreated ?? false;
  const interlaceKycStatus: string = (prof?.interlaceKycStatus ?? '').toLowerCase();
  const userId = prof?._id ?? prof?.id ?? null;

  const createAccount = useCreateInterlaceAccount();

  // ✅ Double-fire guard
  const createCalledRef = React.useRef(false);
  const prevUserIdRef = React.useRef<string | null>(null);

  // ✅ locally confirmed flag — cache/backend race se completely independent.
  // Ab jab cache key bhi sahi hai, ye extra safety net hai (belt & suspenders):
  // agar backend replication me abhi bhi lag ho to bhi UI kabhi loading me
  // fasega nahi.
  const [locallyConfirmedCreated, setLocallyConfirmedCreated] = React.useState(false);

  // ✅ Server flag OR local confirmation — jo bhi pehle true ho jaye
  const effectiveAccountCreated = interlaceAccountCreated || locallyConfirmedCreated;

  // ✅ KYC approval bhi profile-cache race se independent — same pattern.
  // NOTE: 'submitted' bucket yahan bhi map karna zaroori hai (getStage() ki
  // tarah) — warna 'pending'/'in_progress' neeche wale check se miss ho
  // jaate the.
  const normalizedProfileKyc = (() => {
    if (interlaceKycStatus === 'approved' || interlaceKycStatus === 'passed') return 'approved';
    if (interlaceKycStatus === 'rejected' || interlaceKycStatus === 'failed' || interlaceKycStatus === 'canceled') return 'rejected';
    if (interlaceKycStatus === 'submitted' || interlaceKycStatus === 'pending' || interlaceKycStatus === 'in_progress') return 'submitted';
    return interlaceKycStatus;
  })();

  // ❌ BUG (fixed): pehle condition thi `!== 'approved' && !== 'rejected'`,
  // jo 'not_started' / '' (khud KYC form abhi tak submit hi nahi hua) ko bhi
  // true bana deti thi. Isse GET /kyc-verification-result har render pe
  // call ho jaata tha — backend "Interlace KYC is not started." error
  // deta hai jab tak submitAccountKyc ek baar bhi na chala ho, aur wahi
  // error UI me alert ki tarah dikh raha tha jab user sirf KYC form
  // screen pe pahuncha tha (kabhi submit kiye bina).
  //
  const [locallyConfirmedKycApproved, setLocallyConfirmedKycApproved] = React.useState(false);

  // ✅ Ab sirf tab watch karo jab KYC actually submit ho chuka ho —
  // 'submitted' state me (poll karke approved/rejected ka wait), ya ek baar
  // approved lock ho chuka ho to bhi allowed rakha (harmless, already
  // approved/rejected par query khud stop poll kar deti hai).
  const shouldWatchKycResult =
    effectiveAccountCreated &&
    (normalizedProfileKyc === 'submitted' || locallyConfirmedKycApproved);

  const { data: kycResultData } = useKycVerificationResult(shouldWatchKycResult);

  useEffect(() => {
    if (kycResultData?.status === 'approved' && !locallyConfirmedKycApproved) {
      console.log('[CardModule] locking KYC approved (local, race-proof)');
      setLocallyConfirmedKycApproved(true);
    }
  }, [kycResultData?.status, locallyConfirmedKycApproved]);

  const effectiveKycApproved = normalizedProfileKyc === 'approved' || locallyConfirmedKycApproved;

  console.log('[CardModule:render]', {
    profileLoading,
    profileFetching,
    userId,
    mainKycApproved,
    interlaceAccountCreated,
    locallyConfirmedCreated,
    effectiveAccountCreated,
    interlaceKycStatus,
    locallyConfirmedKycApproved,
    effectiveKycApproved,
    mutationStatus: createAccount.status,
  });

  // ── User change → reset ─────────────────────────────────────────
  useEffect(() => {
    if (userId && prevUserIdRef.current && prevUserIdRef.current !== userId) {
      console.log('[CardModule:userChange] Reset for new user');
      createCalledRef.current = false;
      setLocallyConfirmedCreated(false); // ✅ naya user → local lock reset
      setLocallyConfirmedKycApproved(false); // ✅ KYC local lock bhi reset
      createAccount.reset();
    }
    if (userId) prevUserIdRef.current = userId;
  }, [userId]);

  // ── STEP 1: Auto-create ─────────────────────────────────────────
  useEffect(() => {
    console.log('[CardModule:autoCreate:check]', {
      profileReady: !profileLoading && !!prof,
      mainKycApproved,
      effectiveAccountCreated,
      createCalled: createCalledRef.current,
      isPending: createAccount.isPending,
    });

    // ✅ profileFetching pe block MAT karo
    // Background refresh chal rahi ho tab bhi create allow karo
    if (profileLoading || !prof) {
      console.log('[CardModule:autoCreate] SKIP → profile not ready');
      return;
    }
    if (!mainKycApproved) {
      console.log('[CardModule:autoCreate] SKIP → platform KYC not approved');
      return;
    }
    if (effectiveAccountCreated) {
      console.log('[CardModule:autoCreate] SKIP → account already created');
      return;
    }
    if (createCalledRef.current) {
      console.log('[CardModule:autoCreate] SKIP → already attempted');
      return;
    }
    if (createAccount.isPending) {
      console.log('[CardModule:autoCreate] SKIP → mutation pending');
      return;
    }

    console.log('[CardModule:autoCreate] ✅ Creating account...');
    createCalledRef.current = true;

    createAccount.mutate(undefined, {
      onSuccess: () => {
        console.log('[CardModule:autoCreate] locking effectiveAccountCreated=true (local)');
        setLocallyConfirmedCreated(true);
      },
      onError: (error: any) => {
        const errorMsg = (
          error?.response?.data?.message ??
          error?.message ?? ''
        ).toLowerCase();

        const isAlreadyExists =
          errorMsg.includes('already exists') ||
          errorMsg.includes('account already created') ||
          errorMsg.includes('already have an account') ||
          errorMsg.includes('bound to a') ||
          errorMsg.includes('email address has been bound') ||
          errorMsg.includes('registered account');

        if (isAlreadyExists) {
          console.log('[CardModule:autoCreate] already-exists → locking local flag too');
          setLocallyConfirmedCreated(true);
        } else {
          // Real error: retry allow karo
          createCalledRef.current = false;
        }
      },
    });
  }, [
    profileLoading,
    mainKycApproved,
    effectiveAccountCreated,
    userId,
  ]);

  // ── Cards fetch ─────────────────────────────────────────────────
  const shouldFetchCards =
    !profileLoading &&
    !!prof &&
    mainKycApproved &&
    effectiveAccountCreated &&
    effectiveKycApproved;

  console.log('[CardModule:shouldFetchCards]', shouldFetchCards);

  const cardsQuery = useQuery({
    queryKey: userId ? [...CARD_KEYS.all, userId] : CARD_KEYS.all,
    queryFn: cardService.getCards,
    enabled: shouldFetchCards && !!userId,
    staleTime: 60_000,
    retry: false,
  });

  const cards = cardsQuery.data?.items ?? [];
  const cardCount = cards.length;
  const canCreateMoreCards = cardCount < MAX_CARDS_PER_USER;

  // ── Stage calculation ───────────────────────────────────────────
  const getStage = (): { stage: CardModuleStage; message?: string } => {

    if (profileLoading) return { stage: 'loading' };
    if (!prof) return { stage: 'no_account' };
    if (!mainKycApproved) return { stage: 'main_kyc_required' };

    if (!effectiveAccountCreated) {
      if (createAccount.isPending) return { stage: 'loading' };
      if (createAccount.isError) { /* ... error handling ... */ }
      return { stage: 'loading' };
    }

    const rawKycStatus = (prof?.interlaceKycStatus ?? '').toLowerCase();

    const normalizedKycStatus = (() => {
      if (rawKycStatus === 'approved' || rawKycStatus === 'passed') return 'approved';
      if (rawKycStatus === 'rejected' || rawKycStatus === 'failed' || rawKycStatus === 'canceled') return 'rejected';
      if (rawKycStatus === 'submitted' || rawKycStatus === 'pending' || rawKycStatus === 'in_progress') return 'submitted';
      return rawKycStatus;
    })();

    console.log('[CardModule:getStage] KYC:', rawKycStatus, '→', normalizedKycStatus, '| effectiveKycApproved:', effectiveKycApproved);

    // ✅ effectiveKycApproved (race-proof) ko rejected/submitted se pehle
    // check karo — agar already locally confirm ho chuka hai, stale profile
    // wapas nahi le jaayega.
    if (effectiveKycApproved) {
      if (cardsQuery.isLoading) return { stage: 'loading' };
      if (cards.length > 0) {
        const allPending = cards.every((c) => c.status === 'PENDING');
        if (allPending) return { stage: 'card_pending' };
        return { stage: 'has_cards' };
      }
      return { stage: 'kyc_approved_no_card' };
    }

    if (normalizedKycStatus === 'rejected') {
      return {
        stage: 'kyc_rejected',
        message: prof?.kycNote ?? 'Your KYC was rejected. Please contact support.',
      };
    }

    if (normalizedKycStatus === 'submitted') {
      return { stage: 'kyc_pending' };
    }

    return { stage: 'kyc_required' };
  };

  const { stage, message } = getStage();
  console.log('[CardModule:FINAL STAGE]', stage);

  // ── Error ───────────────────────────────────────────────────────
  const accountCreateError = React.useMemo(() => {
    if (!createAccount.isError) return null;

    const errorMsg =
      (createAccount.error as any)?.response?.data?.message ??
      (createAccount.error as any)?.message ??
      'Failed to create Interlace account';

    const lower = errorMsg.toLowerCase();

    if (
      lower.includes('already exists') ||
      lower.includes('account already created') ||
      lower.includes('already have an account') ||
      lower.includes('bound to a') ||
      lower.includes('email address has been bound') ||
      lower.includes('registered account')
    ) {
      return null; // Not a real error
    }

    return errorMsg;
  }, [createAccount.isError, createAccount.error]);

  return {
    stage,
    message,
    cards,
    cardCount,
    canCreateMoreCards,
    isLoading: stage === 'loading',
    isFetching: profileFetching || cardsQuery.isFetching,
    accountCreateError,
    retryCreateAccount: () => {
      console.log('[CardModule:retry]');
      createCalledRef.current = false;
      setLocallyConfirmedCreated(false); // ✅ real retry ke liye local lock bhi reset
      createAccount.reset();
      // ✅ Fixed key — pehle literal ['profile'] no-op tha
      invalidateProfileCache(qc);
    },
    refetch: () => {
      // ✅ Fixed key — pehle literal ['profile'] no-op tha
      invalidateProfileCache(qc);
      if (shouldFetchCards) {
        qc.invalidateQueries({ queryKey: CARD_KEYS.all });
      }
    },
  };
}