/**
 * useCard.ts
 * Main card hook converted to use React Query
 * Maintains the same API surface for backwards compatibility
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCardList,
  useCardKycStatus,
  useCardDetail,
  useCardTransactions,
  useCardKycUrl,
  useCardLivenessStatus,
  useCreateCard,
  useFreezeCard,
  useUnfreezeCard,
  useCardPan,
} from '@/hooks/queires';

import cardService from '../services/cardService';
import {
  TEVAU_TYPE_MAP,
  TEVAU_STATUS_MAP,
  TEVAU_STATUS_LABELS,
  TEVAU_KYC_STATUS_MAP,
} from '@/constants/card';
import { CARD_STATES } from '../types/cardTypes';
import type {
  NormalizedCard,
  TevauCard,
  CardDetail,
  CardTransaction,
  CreateCardPayload,
  CardState,
} from '../types/cardTypes';

// ─── Normalize raw Tevau card → UI card ───────────────────────────────────────

function normalizeCard(card: TevauCard): NormalizedCard {
  const typeStr     = TEVAU_TYPE_MAP[card.cardType]    ?? 'VIRTUAL';
  const statusStr   = TEVAU_STATUS_MAP[card.cardStatus] ?? 'PROCESSING';
  const statusLabel = TEVAU_STATUS_LABELS[card.cardStatus] ?? 'Unknown';

  let status: NormalizedCard['status'] = 'processing';
  if (statusStr === 'ACTIVE') status = 'active';
  if (statusStr === 'FROZEN') status = 'frozen';
  if (statusStr === 'CLOSED') status = 'closed';

  return {
    id:            card.cardId,
    cardId:        card.cardId,
    type:          typeStr.toLowerCase() as 'virtual' | 'physical',
    status,
    statusLabel,
    rawStatus:     card.cardStatus,
    nickname:      typeStr === 'VIRTUAL' ? 'Virtual Card' : 'Physical Card',
    last_four:     card.cardNumber ?? '••••',
    card_number:   `•••• •••• •••• ${card.cardNumber ?? '••••'}`,
    cvv:           '•••',
    expiry_month:  '••',
    expiry_year:   '••',
    daily_limit:   0,
    monthly_limit: 0,
    balance:       card.cardBalance  ?? 0,
    currency:      card.cardCurrency ?? 'USD',
    cardCode:      card.cardCode,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCard() {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const { refresh: refreshAuthProfile } = useAuth();

  // ✅ Local UI state
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [kycUrl, setKycUrl] = useState<string | null>(null);
  const [selectedCardDetail, setSelectedCardDetail] = useState<CardDetail | null>(null);

  // ✅ React Query hooks
  const { 
    data: cardsData = [], 
    isLoading: cardsLoading, 
    error: cardsError,
    refetch: refetchCards 
  } = useCardList('1', '50');

  const { 
    data: kycStatusData, 
    isLoading: kycLoading,
    error: kycError,
    refetch: refetchKyc 
  } = useCardKycStatus();

  // ✅ Mutations
  const createCardMutation = useCreateCard();
  const freezeCardMutation = useFreezeCard();
  const unfreezeCardMutation = useUnfreezeCard();

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ✅ Normalize cards data
// ─── Normalize cards data ─────────────────────────────────────────────────
const cards = useMemo(() => {
  // ✅ Guard: check if cardsData has 'list' property before accessing it
  if (!cardsData || !('list' in cardsData) || !Array.isArray((cardsData as any).list)) {
    return [];
  }
  return (cardsData as any).list.map(normalizeCard);
}, [cardsData]);
  // ✅ Get active card
  const activeCard = useMemo(() => {
    if (cards.length === 0) return null;
    return cards[selectedCardIndex] ?? cards[0];
  }, [cards, selectedCardIndex]);

  // ✅ Get transactions for active card
  const { 
    data: transactionsData = { list: [], total: 0 }, 
    isLoading: transactionsLoading,
    refetch: refetchTransactions 
  } = useCardTransactions({
    cardId: activeCard?.cardId || '',
    page: '1',
    limit: '10'
  });

  const transactions = transactionsData.list || [];

  // ✅ Determine card state
  const cardState = useMemo((): CardState => {
    // Loading state
    if (cardsLoading || kycLoading) return CARD_STATES.LOADING;
    
    // Error state
    if (cardsError || kycError) return CARD_STATES.ERROR;
    
    // KYC states
    if (kycStatusData) {
      const auditStatus = kycStatusData.auditStatus ?? kycStatusData.kycStatus ?? kycStatusData.status ?? 5;
      const mappedKyc = TEVAU_KYC_STATUS_MAP[auditStatus] ?? 'NOT_STARTED';
      
      // auditStatus 5 = docs may or may not be uploaded
      if (auditStatus === 5) {
        const hasDocuments = Boolean(kycStatusData.identityFrontPicUrl) && 
                           Boolean(kycStatusData.identityBackPicUrl);
        return hasDocuments ? CARD_STATES.KYC_LIVENESS_PENDING : CARD_STATES.KYC_REQUIRED;
      }
      
      switch (mappedKyc) {
        case 'NOT_STARTED': return CARD_STATES.KYC_REQUIRED;
        case 'REJECTED':    return CARD_STATES.KYC_REJECTED;
        case 'PENDING':     return CARD_STATES.KYC_PENDING;
      }
    } else {
      return CARD_STATES.KYC_REQUIRED;
    }
    
    // Cards state
    return cards.length === 0 ? CARD_STATES.NO_CARDS : CARD_STATES.HAS_CARDS;
  }, [cardsLoading, kycLoading, cardsError, kycError, kycStatusData, cards.length]);

  // ✅ KYC status string
  const kycStatus = useMemo(() => {
    if (!kycStatusData) return 'NOT_STARTED';
    const auditStatus = kycStatusData.auditStatus ?? kycStatusData.kycStatus ?? kycStatusData.status ?? 5;
    return TEVAU_KYC_STATUS_MAP[auditStatus] ?? 'NOT_STARTED';
  }, [kycStatusData]);

  // ✅ KYC audit status
  const kycAuditStatus = useMemo(() => {
    if (!kycStatusData) return null;
    return kycStatusData.auditStatus ?? kycStatusData.kycStatus ?? kycStatusData.status ?? null;
  }, [kycStatusData]);

  // ✅ Loading states
  const loading = cardsLoading || kycLoading;
  const refreshing = false; // React Query handles background refreshing

  // ── Initialize: Handle user creation if needed ───────────────────────────
  const initialize = useCallback(async () => {
    try {
      // If KYC query failed with 404/400, create user first
      if (kycError) {
        const status = (kycError as any)?.response?.status;
        if (status === 404 || status === 400) {
          try {
            await cardService.createUser();
            await refreshAuthProfile();
            await queryClient.invalidateQueries({ queryKey: ['card', 'kyc'] });
            return;
          } catch (createError) {
            console.error('Failed to create user:', createError);
          }
        }
      }
    } catch (err: any) {
      setError(err?.response?.data?.msg ?? err?.message ?? 'Failed to initialize');
    }
  }, [kycError, refreshAuthProfile, queryClient]);

  // ── Refresh ───────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    try {
      await refreshAuthProfile();
      await Promise.all([
        refetchCards(),
        refetchKyc(),
        activeCard?.cardId ? refetchTransactions() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing card data:', error);
    }
  }, [refreshAuthProfile, refetchCards, refetchKyc, refetchTransactions, activeCard?.cardId]);

  // ── KYC URL ───────────────────────────────────────────────────────────────
  const fetchKycUrl = useCallback(async (): Promise<string | null> => {
    try {
      const result = await cardService.getKycUrl();
      const url = (result as any)?.link ?? null;
      setKycUrl(url);
      return url;
    } catch {
      setError('Failed to get KYC verification URL');
      return null;
    }
  }, []);

  // ── Check liveness status ─────────────────────────────────────────────────
  const checkLivenessStatus = useCallback(
    async (): Promise<'passed' | 'failed' | 'in_progress' | null> => {
      try {
        const result = await cardService.getLivenessStatus();
        const auditStatus = result?.data?.auditStatus ?? result?.auditStatus;
        if (auditStatus === 1) return 'passed';
        if (auditStatus === 2) return 'failed';
        if (auditStatus === 0 || auditStatus === 3) return 'in_progress';
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  // ── Create card ───────────────────────────────────────────────────────────
  const createCard = useCallback(
    async (payload: CreateCardPayload): Promise<boolean> => {
      try {
        setActionLoading(true);
        await createCardMutation.mutateAsync(payload);
        return true;
      } catch (err: any) {
        setError(err?.response?.data?.msg ?? 'Failed to create card');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [createCardMutation],
  );

  // ── Freeze / Unfreeze ─────────────────────────────────────────────────────
  const toggleFreeze = useCallback(
    async (index?: number): Promise<boolean> => {
      const card = cards[index ?? selectedCardIndex];
      if (!card) return false;
      
      try {
        setActionLoading(true);
        if (card.status === 'frozen') {
          await unfreezeCardMutation.mutateAsync(card.cardId);
        } else {
          await freezeCardMutation.mutateAsync(card.cardId);
        }
        return true;
      } catch (err: any) {
        setError(err?.response?.data?.msg ?? 'Failed to update card status');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [cards, selectedCardIndex, freezeCardMutation, unfreezeCardMutation],
  );

  // ── Close card ────────────────────────────────────────────────────────────
  const closeCard = useCallback(
    async (cardId: string): Promise<boolean> => {
      try {
        setActionLoading(true);
        // You might need to add this mutation to useApi.ts
        await cardService.closeCard(cardId);
        await refetchCards();
        return true;
      } catch (err: any) {
        setError(err?.response?.data?.msg ?? 'Failed to close card');
        return false;
      } finally {
        setActionLoading(false);
      }
    },
    [refetchCards],
  );

  // ── Get card PAN URL ──────────────────────────────────────────────────────
  const getCardPanUrl = useCallback(
    async (cardId: string): Promise<string | null> => {
      try {
        const result = await cardService.getCardPan(cardId);
        return (result as any)?.accessUrl ?? null;
      } catch {
        setError('Failed to get card details');
        return null;
      }
    },
    [],
  );

  // ── Load card detail ──────────────────────────────────────────────────────
  const loadCardDetail = useCallback(async (cardId: string) => {
    try {
      const detail = await cardService.getCardDetail(cardId);
      if (mountedRef.current) setSelectedCardDetail(detail);
      return detail;
    } catch {
      return null;
    }
  }, []);

  // ── Load transactions ─────────────────────────────────────────────────────
  const loadTransactions = useCallback(
    async (cardId: string, page = '1', limit = '10') => {
      try {
        await refetchTransactions();
        return transactionsData;
      } catch {
        return { total: 0, list: [], pages: 0 };
      }
    },
    [refetchTransactions, transactionsData],
  );

  // ── Load cards (for backwards compatibility) ──────────────────────────────
  const loadCards = useCallback(async () => {
    await refetchCards();
  }, [refetchCards]);

  // ── Auto-init on mount ────────────────────────────────────────────────────
  useEffect(() => {
    initialize();
  }, [initialize]);

  // ── Update selected card index when cards change ─────────────────────────
  useEffect(() => {
    setSelectedCardIndex(prev => prev >= cards.length ? 0 : prev);
  }, [cards.length]);

  return {
    // State
    cardState,
    cards,
    activeCard,
    selectedCardIndex,
    selectedCardDetail,
    kycStatus,
    kycUrl,
    kycAuditStatus,
    loading,
    refreshing,
    actionLoading: actionLoading || createCardMutation.isPending || 
                   freezeCardMutation.isPending || unfreezeCardMutation.isPending,
    error: error || (cardsError as any)?.message || (kycError as any)?.message,
    transactions,
    transactionsLoading,

    // Actions
    setSelectedCardIndex,
    initialize,
    refresh,
    fetchKycUrl,
    checkLivenessStatus,
    createCard,
    toggleFreeze,
    closeCard,
    getCardPanUrl,
    loadCardDetail,
    loadTransactions,
    loadCards,
    setError,
  };
}