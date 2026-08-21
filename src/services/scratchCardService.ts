import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScratchCardStatus = 'pending' | 'opened' | 'redeemed';

// ✅ Backend flat structure - nested scratchCard nahi hai
export interface AssignedScratchCard {
  _id: string;

  // Relations
  scratchCardId: string;
  userId: string;
  assignedBy: string;

  // Card details (flat)
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  reward: number;
  couponCode?: string | null;
  link?: string | null;
  reason?: string | null;
  triggerRef?: string | null;

  // Status
  status: ScratchCardStatus;
  openedOn?: string | null;
  redeemedOn?: string | null;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdOn?: string;
  updatedOn?: string;

  __v?: number;
}

export interface ScratchCardsListResponse {
  status: string;
  message?: string;
  data: AssignedScratchCard[];
}

export interface ScratchCardResponse {
  status: string;
  message?: string;
  data: AssignedScratchCard;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const scratchCardService = {
  getMyCards: () =>
    api.get<ScratchCardsListResponse>(ENDPOINTS.SCRATCH_CARDS.MY_CARDS),

  openCard: (assignedCardId: string) =>
    api.patch<ScratchCardResponse>(
      ENDPOINTS.SCRATCH_CARDS.OPEN(assignedCardId)
    ),

  redeemCard: (assignedCardId: string) =>
    api.patch<ScratchCardResponse>(
      ENDPOINTS.SCRATCH_CARDS.REDEEM(assignedCardId)
    ),
};