// ─────────────────────────────────────────────────────────────────────────────
// P2P — Centralised Type Definitions  (aligned with real API responses)
// ─────────────────────────────────────────────────────────────────────────────

// ── Primitives ────────────────────────────────────────────────────────────────

export type P2PAdType      = 'BUY' | 'SELL';
export type P2PAdStatus    = 'ACTIVE' | 'INACTIVE' | 'COMPLETED';
export type P2POrderStatus =
  | 'ESCROW_LOCKED'
  | 'PENDING'
  | 'FIAT_SENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export type P2PDisputeStatus    = 'OPEN' | 'RESOLVED' | 'CANCELLED';
export type P2PDisputeRaisedBy  = 'BUYER' | 'SELLER';
export type P2PDisputeResolution = 'RELEASE_TO_BUYER' | 'REFUND_TO_SELLER';
export type P2PSLAStatus  = 'ACTIVE' | 'BREACHED';
export type P2PUserRole   = 'BUYER' | 'SELLER';
export type P2PCancelledBy = 'SYSTEM' | 'BUYER' | 'SELLER';

// ── Shared sub-objects ────────────────────────────────────────────────────────

/** Populated asset object (returned when ad is fetched with relations) */
export interface P2PAdAsset {
  _id: string;
  symbol: string;
  name: string;
  chainId?: string;
}

/** Standalone asset from /asset/getAssetsByChain */
export interface P2PChainAsset {
  _id: string;
  symbol: string;
  name: string;
  chainId: string;
  assetAddress: string;
  assetType: 'native' | 'token';
  decimals: number;
}

export interface P2PAdUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
}

export interface P2PAdSeller {
  id: string;
  trustScore: number;
  status: string;
  totalTrades?: number;
  completionRate?: number;
  completedOrders?: number;
  positiveFeedbacks?: number;
}

export interface PaymentMethodField {
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  placeholder: string;
  isRequired: boolean;
  value: string;
}

export interface PaymentMethodDetail {
  id?: string;
  name?: string;
  code?: string;
  description?: string;
}

export interface P2PPaymentMethod {
  accountId: string;
  label: string;
  isDefault: boolean;
  method: PaymentMethodDetail;
  fields: PaymentMethodField[];
  // flat extra fields that backend sometimes inlines (e.g. mobile_number, account_no)
  [key: string]: any;
}

// ── Core entities  (shapes match real API payloads) ───────────────────────────

/**
 * Ad as returned by LIST_ADS and MY_ADS.
 *  - `asset`          → always a raw mongo ObjectId string (not populated)
 *  - `paymentMethods` → array of populated P2PPaymentMethod objects
 *  - `userId`         → partial object  { _id }
 *  - `seller`         → lightweight seller stats block
 */
export interface P2PAd {
  _id: string;
  userId: Pick<P2PAdUser, '_id'>;
  type: P2PAdType;
  /** Raw ObjectId string — resolve via asset cache */
  asset: string;
  chainId: string;
  price: string;
  currency: string;
  totalAmount: string;
  availableAmount: string;
  minLimit?: string;
  maxLimit?: string;
  /** Populated objects OR raw string IDs depending on endpoint */
  paymentMethods: P2PPaymentMethod[] | string[];
  remarks?: string;
  status: P2PAdStatus;
  seller?: P2PAdSeller;
  createdAt: string;
  updatedAt: string;
  __v?: number;
}

/**
 * Paginated wrapper returned by LIST_ADS and MY_ADS.
 * NOTE: MY_ADS also returns this shape (not a plain array).
 */
export interface P2PAdListResponse {
  page: number;
  limit: number;
  total: number;
  totalData?: number;
  totalPage?: number;
  ads: P2PAd[];
}

/**
 * Order as returned by MY_ORDERS.
 *  - `adId`     → populated P2PAd object (not just an ID)
 *  - `asset`    → raw ObjectId string
 *  - `sellerId` / `buyerId` → raw ObjectId strings
 */
export interface P2POrder {
  _id: string;
  /** Populated ad object */
  adId: P2PAd | string;
  sellerId: string;
  buyerId: string;
  /** Raw ObjectId string — resolve via asset cache */
  asset: string;
  chainId: string;
  amount: string;
  fiatAmount: string;
  price?: string;       // may be absent; fall back to adId.price
  currency?: string;    // may be absent; fall back to adId.currency
  status: P2POrderStatus;
  escrowReleased: boolean;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  // optional lifecycle fields
  fiatProof?: string;
  fiatSentAt?: string;
  completedAt?: string;
  cancelReason?: string;
  cancelledBy?: P2PCancelledBy | string;
  __v?: number;
}

/** Full order detail (single-order endpoint) */
export interface P2POrderDetail extends P2POrder {
  paymentMethods?: string[];
  role?: P2PUserRole;
  balanceBefore?: string;
  balanceAfter?: string;
}

export interface P2PDispute {
  _id: string;
  orderId: string;
  buyer: { name: string; email: string };
  seller: { name: string; email: string };
  asset: string;
  amount: string;
  fiatAmount: string;
  currency: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'CANCELLED';
  evidence?: string[];
  createdAt: string;
}

export interface P2PDisputeDetail {
  _id: string;
  orderId: P2POrderDetail;
  raisedBy: P2PDisputeRaisedBy;
  reason: string;
  evidence: string[];
  status: P2PDisputeStatus;
  slaExpiresAt: string;
  escalated: boolean;
  resolution?: P2PDisputeResolution;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface P2PStats {
  totalVolume: string;
  activeDisputes: number;
  avgCompletionTime: string;
  disputeRate: string;
}

export interface SLADashboardData {
  openDisputes: number;
  slaBreached: number;
  disputes: {
    disputeId: string;
    orderId: string;
    sellerId: string;
    buyerId: string;
    raisedBy: P2PDisputeRaisedBy;
    createdAt: string;
    slaExpiresAt: string;
    slaStatus: P2PSLAStatus;
  }[];
}

// ── API request payloads ──────────────────────────────────────────────────────

export interface CreateAdPayload {
  type: P2PAdType;
  asset: string;        // asset _id
  chainId: string;
  currency: string;
  price: string;
  totalAmount: string;
  paymentMethods: string[];
  minLimit?: string;
  maxLimit?: string;
  remarks?: string;
}

export interface UpdateAdPayload {
  price?: string;
  totalAmount?: string;
  paymentMethods?: string[];
  minLimit?: string;
  maxLimit?: string;
  remarks?: string;
  status?: P2PAdStatus;
}

export interface PlaceOrderPayload {
  adId: string;
  amount: string;
   paymentMethodId?: string;   // optional
  paymentAccountId?: string;  // user ka saved account
}

export interface RateSellerPayload {
  rating: number; // 1–5
  comment?: string;
}

export interface RaiseDisputePayload {
  reason: string;
  evidence?: string[];
}

// ── API query params ──────────────────────────────────────────────────────────

export interface P2PListAdsParams {
  asset?: string;       // symbol e.g. "USDT"
  currency?: string;
  type?: P2PAdType;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

// ── API response wrapper ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

// ── UI-only types ─────────────────────────────────────────────────────────────

/** Asset resolved from cache — used everywhere in UI */
export interface ResolvedAsset {
  _id: string;
  symbol: string;
  name: string;
  chainId: string;
}

export type P2PMainTab     = 'market' | 'orders' | 'myads';
export type P2PTradeFilter = 'ALL' | 'BUY' | 'SELL';

export interface P2PInputError {
  field: string;
  message: string;
}

export interface CreateAdFormState {
  type: P2PAdType;
  assetId: string;
  chainId: string;
  currency: string;
  price: string;
  totalAmount: string;
  paymentMethods: string[];
  minLimit: string;
  maxLimit: string;
  remarks: string;
}


export interface P2PTradeRequest {
  _id: string;
  buyerId: string;
  asset: { _id: string; name: string; symbol: string };
  chainId: string;
  cryptoAmount: string;
  currency: string;
  preferredPrice: string;
  totalFiatAmount: string;
  requestType: 'BUY' | 'SELL';
  status: 'PENDING' | 'ASSIGNED' | 'APPROVED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED' | string;
  assignedSellerId?: { _id: string; email: string } | null;
  paymentAccountId?: {
    _id: string;
    label: string;
    fieldValues: Record<string, string>;
  } | null;
  selectedAdId?: P2PAd | null;
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  assignedBy?: string;
}