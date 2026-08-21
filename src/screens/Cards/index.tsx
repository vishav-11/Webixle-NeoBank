/**
 * cards/index.ts
 * Single import point for the entire cards module.
 *
 * Usage:
 *   import { CardsScreen, useCard, cardService } from '@/cards';
 *   import type { NormalizedCard, CardState } from '@/cards';
 */

// ── Screen ────────────────────────────────────────────────────────────────────
export { default as CardsScreen } from './CardsScreen';

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useCard } from '@/hooks/useCards';

// ── Service ───────────────────────────────────────────────────────────────────
export { default as cardService } from '@/services/cardService';

// ── Constants ─────────────────────────────────────────────────────────────────
export {
  TEVAU_TYPE_MAP,
  TEVAU_STATUS_MAP,
  TEVAU_STATUS_LABELS,
  TEVAU_KYC_STATUS_MAP,
  TEVAU_KYC_STATUS_LABELS,
  ID_CARD_TYPES,
} from '@/constants/card';


// ── Types ─────────────────────────────────────────────────────────────────────
export { CARD_STATES } from '@/types/cardTypes';
export type {
  // Raw API types
  TevauCard,
  CardListResponse,
  CardDetail,
  CardTransaction,
  TransactionListResponse,
  TransactionDetail,
  CardLimitItem,
  CardFeeItem,
  CardPanResponse,
  CardPinResponse,

  // Payloads
  CreateCardPayload,
  TopupPayload,
  ActivateCardPayload,
  TransactionHistoryPayload,
  AuthorisePayload,
  BindCardPayload,
  RefundRequestPayload,

  // KYC
  IdentityCardType,
  SubmitKycPayload,
  KycUrlResponse,
  KycQueryResponse,
  Country,
  CreateDocumentFilePayload,
  CreateDocumentFileResponse,

  // UI
  NormalizedCard,
  CardType,
  CardUIStatus,
  CardState,
  CardTab,
  LinkedAccount,
  Dispute,
  SpendingCategory,
} from '@/types/cardTypes';

// ── UI Components (for custom use) ────────────────────────────────────────────
export { default as CardVisual }    from './components/CardVisual';
export { default as ManageTab }     from './components/manage/ManageTab';
export { default as LimitsTab }     from './components/limits/LimitsTab';
export { default as DisputesTab }   from './components/disputes/DisputesTab';
export { default as AccountsTab }   from './components/accounts/AccountsTab';
export { default as TopUpModal }    from './components/TopUpModal';
export { default as KycGate }       from './components/kyc/KycGate';
export { default as KycDocumentUpload } from './components/kyc/KycDocumentUpload';
export {
  Skeleton,
  CardInfoSkeleton,
  NetworkSelectorSkeleton,
  BalanceSkeleton,
  FeeBreakdownSkeleton,
} from './components/Skeleton';
