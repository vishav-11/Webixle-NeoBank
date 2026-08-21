/**
 * cardTypes.ts
 * All Card-related TypeScript types for the new project structure.
 */

// ─── Raw API types (Tevau Provider) ──────────────────────────────────────────

export interface TevauCard {
  cardId: string;
  cardCode: string;
  cardNumber?: string;
  cardCurrency: string;
  cardBalance: number;
  cardStatus: number;
  cardType: number;
}

export interface CardListResponse {
  total: number;
  list: TevauCard[];
  pages: number;
}

export interface CardDetail extends TevauCard {
  dialCode: number;
  phoneNumber: string;
  email: string;
  physicalAddress?: {
    address: string;
    countryArea: string;
    city: string;
    postCode: string;
    firstName: string;
    lastName: string;
    province: string;
    recipientTitle: string;
  };
}

export interface CardTransaction {
  orderId: string;
  cardId: string;
  merchantName: string;
  amount: string;
  currency: string;
  status: string;
  createTime: string;
  type: string;
}

export interface TransactionListResponse {
  total: number;
  list: CardTransaction[];
  pages: number;
}

export interface TransactionDetail extends CardTransaction {
  fee: string;
  settleAmount: string;
  settleCurrency: string;
  description: string;
}

export interface CardLimitItem {
  tradeQuotaAmt: number;
  dayQuotaAmt: number;
  monthQuotaAmt: number;
  yearQuotaAmt: number;
}

export interface CardFeeItem {
  chargeItem: string;
  fixedAmount: string;
  percentage: string;
}

export interface CardPanResponse {
  accessUrl: string;
}

export interface CardPinResponse {
  pin: string;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateCardPayload {
  type: 'virtual' | 'physical';
  dialCode: string;
  phoneNumber: string;
  billingAddress: {
    address: string;
    countryCode: string;
    city: string;
    postCode: string;
  };
  postalAddress: {
    address: string;
    countryCode: string;
    city: string;
    postCode: string;
    state: string;
  };
}

export interface TopupPayload {
  cardId: string;
  amount: string;
  assetId: string;
  blockchainType: string;
}

export interface ActivateCardPayload {
  cardId: string;
  activeCode: string;
}

export interface TransactionHistoryPayload {
  cardId: string;
  page: string;
  limit: string;
  createTimeStart?: string;
  createTimeEnd?: string;
}

export interface AuthorisePayload {
  cardId: string;
  amount: string;
  currency: string;
  merchantName: string;
}

export interface BindCardPayload {
  userId: string;
  activeCode: string;
  cardNumber: string;
  address: string;
  countryArea: string;
  city: string;
  postCode: string;
  dialCode: number;
  phoneNumber: string;
  email: string;
}

export interface RefundRequestPayload {
  transactionID: string;
  amount: string;
  reason: string;
}

// ─── KYC types ────────────────────────────────────────────────────────────────

export type IdentityCardType =
  | 'ID_CARD'
  | 'PASSPORT'
  | 'DRIVERS'
  | 'DRIVER_LICENSE'
  | 'RESIDENCE_PERMIT';

export interface SubmitKycPayload {
  front: any;
  back: any;
  dob: string;
  identityCardType: IdentityCardType;
  identityCardNumber: string;
  identityExpiry: string;
  countryCode: string;
}

export interface KycUrlResponse {
  link: string;
}

export interface KycQueryResponse {
  auditStatus: number;
  kycStatus?: number;
  status?: number;
  identityFrontPicUrl?: string;
  identityBackPicUrl?: string;
}

export interface Country {
  code: string;
  name: string;
  flag?: string;
}

export interface CreateDocumentFilePayload {
  userCode: string;
  fileName: string;
  documentType:
    | 'IDENTITY_FRONT'
    | 'IDENTITY_BACK'
    | 'LIVENESS_FACIAL_RECOGNITION_REPORT'
    | 'AML_REPORT'
    | 'ID_VERIFICATION_REPORT';
}

export interface CreateDocumentFileResponse {
  host: string;
  ossAccessKeyId: string;
  policy: string;
  signature: string;
  key: string;
}

// ─── Normalized UI types ──────────────────────────────────────────────────────

export type CardType = 'virtual' | 'physical';
export type CardUIStatus = 'active' | 'frozen' | 'processing' | 'closed';

export interface NormalizedCard {
  id: string;
  cardId: string;
  type: CardType;
  status: CardUIStatus;
  statusLabel: string;
  rawStatus: number;
  nickname: string;
  last_four: string;
  card_number: string;
  cvv: string;
  expiry_month: string;
  expiry_year: string;
  daily_limit: number;
  monthly_limit: number;
  balance: number;
  currency: string;
  cardCode: string;
}

// ─── Card State Machine ───────────────────────────────────────────────────────

export const CARD_STATES = {
  LOADING:              'LOADING',
  KYC_REQUIRED:         'KYC_REQUIRED',
  KYC_PENDING:          'KYC_PENDING',
  KYC_REJECTED:         'KYC_REJECTED',
  KYC_LIVENESS_PENDING: 'KYC_LIVENESS_PENDING',
  NO_CARDS:             'NO_CARDS',
  HAS_CARDS:            'HAS_CARDS',
  ERROR:                'ERROR',
} as const;

export type CardState = (typeof CARD_STATES)[keyof typeof CARD_STATES];

// ─── Tab types ────────────────────────────────────────────────────────────────

export type CardTab = 'manage' | 'limits' | 'disputes' | 'accounts';

// ─── Linked account types ─────────────────────────────────────────────────────

export interface LinkedAccount {
  id: string;
  symbol: string;
  name: string;
  balance: string;
  isPrimary: boolean;
}

// ─── Dispute types ────────────────────────────────────────────────────────────

export interface Dispute {
  id: string;
  transactionId: string;
  amount: string;
  currency: string;
  merchantName: string;
  status: 'PENDING' | 'OPEN' | 'RESOLVED' | 'REJECTED';
  reason: string;
  createdAt: string;
}

// ─── Spending category types ──────────────────────────────────────────────────

export interface SpendingCategory {
  name: string;
  amount: number;
  percentage: number;
  icon: string;
}
