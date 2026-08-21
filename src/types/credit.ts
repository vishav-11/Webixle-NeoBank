// src/types/credit.ts
// ============================================
// CREDIT SYSTEM TYPES — fixed to match API
// ============================================

export type RiskLevel = 'Safe' | 'Healthy' | 'Warning' | 'Danger';
export type TxType    = 'BORROW' | 'REPAY' | 'INTEREST' | 'LIQUIDATION';
export type TxFilter  = 'all' | 'borrow' | 'repay' | 'interest' | 'liquidation';

// ── Account ────────────────────────────────────────────────────────────────────
// Maps from GET /credit/account (RawCreditAccount)
export interface CreditAccount {
  id:              string;           // _id
  status:          'active' | 'inactive' | 'suspended';
  creditLimit:     number;           // totalLimit
  availableCredit: number;
  usedCredit:      number;
  interestRate:    number;           // from supported asset config
  accruedInterest: number;           // interestAccrued
  riskLevel:       RiskLevel;
}

// ── Supported Asset ────────────────────────────────────────────────────────────
// Maps from GET /credit/supported-assets (RawSupportedAssetFlat)
export interface SupportedAsset {
  id:           string;      // creditAssetConfigId
  assetId:      string;
  symbol:       string;
  name:         string;
  chainId:      string;
  decimals:     number;
  ltv:          number;      // e.g. 70 → "70%"
  apr:          number;      // interestRate e.g. 5.5 → "5.50%"
  liquidationThreshold: number;
  balance:      number;      // user_balance (wallet balance)
  balanceUsd:   number;      // user_balance * current_price
}

// ── Collateral ─────────────────────────────────────────────────────────────────
// Maps from GET /credit/collateral (RawCreditCollateral)
export interface CollateralItem {
  id:       string;    // _id
  symbol:   string;    // asset.symbol
  name:     string;    // asset.name
  amount:   number;
  valueUsd: number;    // usdValue
  ltv:      number;
  chainId:  string;
  status:   'active' | 'locked' | 'pending'; // maps from "ACTIVE" etc.
}

// ── Transaction ────────────────────────────────────────────────────────────────
// Maps from GET /credit/transactions
export interface CreditTransaction {
  id:        string;   // _id
  type:      TxType;
  label:     string;   // derived: "Borrowed $95" etc.
  amountUsd: number;   // amount (already USD)
  direction: 'credit' | 'debit';  // REPAY/INTEREST=credit, BORROW/LIQUIDATION=debit
  createdAt: string;   // ISO
}

// ── Paginated Response ─────────────────────────────────────────────────────────
export interface PaginatedTx {
  data:       CreditTransaction[];
  page:       number;
  totalPages: number;
  total:      number;
}

// ── Risk ───────────────────────────────────────────────────────────────────────
// Maps from GET /credit/risk (riskScore, collateralValue, creditBalance)
export interface CreditRisk {
  level:            RiskLevel;
  livRatio:         number;    // riskScore * 100
  liquidationAt:    number;    // liquidationThreshold
  safeBorrowLimit:  number;
  liquidationPrice: number;
  message:          string;
}

// ── Preview ────────────────────────────────────────────────────────────────────
export interface BorrowPreview {
  maxBorrow:    number;
  fee:          number;
  newUsed:      number;
  newAvailable: number;
  newRiskLevel: RiskLevel;
}

export interface RepayPreview {
  totalOwed:    number;
  principal:    number;
  interest:     number;
  newAvailable: number;
  newRiskLevel: RiskLevel;
}