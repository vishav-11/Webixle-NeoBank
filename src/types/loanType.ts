/**
 * types/loanTypes.ts
 * All TypeScript interfaces and types for the Loan module.
 * Mirrors the pattern of p2pTypes — single source of truth.
 */

// =============================================
// Enums / Union Types
// =============================================

export type LoanStatus = 'ACTIVE' | 'REPAID' | 'LIQUIDATED' | 'CLOSED';

export type LoanHealth = 'SAFE' | 'WARNING' | 'DANGER' | 'CRITICAL';

export type LoanTxType =
  | 'BORROW'
  | 'REPAY'
  | 'ADD_COLLATERAL'
  | 'WITHDRAW_COLLATERAL'
  | 'LIQUIDATION';

// =============================================
// Asset
// =============================================

export interface AssetInfo {
  _id: string;
  symbol: string;
  name?: string;
  icon?: string;
  chainId?: string;
  decimals?: number;
  [key: string]: any;
}

// =============================================
// Loan Pair  (from getLoanPairs endpoint)
// =============================================

export interface LoanPair {
  _id?: string;
  pairId: string;
  collateral: {
    id: string;
    symbol: string;
  };
  borrow: {
    id: string;
    symbol: string;
  };
  ltv: number;       // maxLtv (%)
  interest: number;  // annual interest rate (%)
}

// =============================================
// Loan Preview  (from getLoanPreview endpoint)
// =============================================

export interface LoanPreview {
  collateralUsd: number;
  maxBorrow: number;
  ltv: number;           // maxLtv (%)
  marginCall: number;    // marginCallLtv (%)
  liquidation: number;   // liquidationLtv (%)
  interest: number;      // annual interest rate (%)
  dailyInterest: number; // interest / 365
}

// =============================================
// Loan  (core model)
// =============================================

export interface LoanData {
  _id: string;
  userId: string | { _id: string; email?: string; name?: string };
  collateralAsset: string | AssetInfo;
  borrowAsset: string | AssetInfo;
  collateralAmount: string;
  collateralUsd: string;
  borrowedAmount: string;
  borrowedUsd: string;
  interestRate: number;
  dailyRate: number;
  ltv: number;
  liquidationLtv: number;
  marginCallLtv: number;
  status: LoanStatus;
  totalInterestAccrued: string;
  lastInterestUpdate: string;
  createdAt: string;
  updatedAt: string;
}

// Loan detail (includes live currentLtv from price feed)
export interface LoanDetail extends LoanData {
  currentLtv: number;
}

// =============================================
// Loan Transaction
// =============================================

export interface LoanTransaction {
  _id: string;
  loanId: string;
  userId: string;
  type: LoanTxType;
  amount: string | number;
  note: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Loan Setting  (admin model)
// =============================================

export interface LoanSetting {
  _id: string;
  collateralAsset: string | AssetInfo;
  borrowAsset: string | AssetInfo;
  interestRate: number;
  dailyRate: number;
  maxLtv: number;
  marginCallLtv: number;
  liquidationLtv: number;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================
// Loan Stats  (user portfolio summary)
// =============================================

export interface LoanStats {
  activeLoans: number;
  totalLoans: number;
  totalBorrowedUsd: number;
  totalCollateralUsd: number;
  totalInterestAccrued: number;
  avgInterestRate: number;
  currentLtv: number;
  health: LoanHealth;
  liquidationRisk: boolean;
  lastLoanAt: string | null;
}

// =============================================
// Request Payloads
// =============================================

export interface LoanPreviewPayload {
  collateralAmount: string;
  pairId: string; // LoanSetting _id
}

export interface CreateLoanPayload {
  collateralAsset: string; // Asset _id
  borrowAsset: string;     // Asset _id
  collateralAmount: string;
  ltv: string;             // e.g. "70"
}

export interface RepayLoanPayload {
  amount: string;
}

export interface AddCollateralPayload {
  amount: string;
}

export interface WithdrawCollateralPayload {
  amount: string;
}

// =============================================
// Admin Payloads
// =============================================

export interface CreateLoanSettingPayload {
  collateralAsset: string;
  borrowAsset: string;
  interestRate: string;
  dailyRate: string;
  maxLtv: string;
  marginCallLtv: string;
  liquidationLtv: string;
}

export interface UpdateLoanSettingPayload extends CreateLoanSettingPayload {
  isActive?: string;
}

export interface ToggleLoanSettingPayload {
  isActive: boolean;
}

// =============================================
// Paginated / List Response shapes
// =============================================

export interface LoanListResponse {
  total: number;
  page: number;
  limit: number;
  data: LoanData[];
}

export interface LoanSettingListResponse {
  total: number;
  page: number;
  limit: number;
  data: LoanSetting[];
}

// =============================================
// Query Params
// =============================================

export interface GetAllLoansParams {
  page?: number;
  limit?: number;
  status?: LoanStatus;
}

export interface GetLoanSettingsParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
}

// =============================================
// UI-only helpers  (not from API — used in components)
// =============================================

/** Health config for colours / labels in the UI */
export interface HealthConfig {
  color: string;
  bg: string;
  label: string;
}

/** Asset display metadata (colour, icon glyph) */
export interface AssetMeta {
  icon: string;
  color: string;
  bg: string;
}

/** Filter tab value used in LoanHistory screen */
export type LoanFilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED';

/** Action modal type used in LoanDetails screen */
export type LoanActionModal = 'repay' | 'add' | 'withdraw' | null;