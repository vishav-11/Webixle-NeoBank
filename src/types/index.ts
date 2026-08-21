// ─── Theme ───────────────────────────────────────────────────────────────────
export type Theme = 'dark' | 'light';

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  address: string;
  username?: string;
  avatar?: string;
  createdAt: string;
}

// ─── Wallet ──────────────────────────────────────────────────────────────────
export interface Asset {
  id: string;
  symbol: string;
  name: string;
  logoUrl: string;
  balance: number;
  balanceUsd: number;
  price: number;
  change24h: number;
  chain: string;
}

export interface WalletBalance {
  totalUsd: number;
  change24hUsd: number;
  change24hPct: number;
  assets: Asset[];
}

// ─── Credit ──────────────────────────────────────────────────────────────────
export type RiskLevel = 'Safe' | 'Moderate' | 'High';

export interface CreditPosition {
  id: string;
  creditLimit: number;
  available: number;
  used: number;
  interestRate: number;
  accruedInterest: number;
  riskLevel: RiskLevel;
  collateral: Asset[];
}

export interface CreditTransaction {
  id: string;
  type: 'repay' | 'borrow';
  amount: number;
  currency: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// ─── P2P Trading ─────────────────────────────────────────────────────────────
export type OrderSide   = 'buy' | 'sell';
export type OrderStatus = 'active' | 'completed' | 'cancelled';

export interface P2POffer {
  id: string;
  asset: string;
  network: string;
  side: OrderSide;
  price: number;
  currency: string;
  available: number;
  total: number;
  minLimit: number;
  maxLimit: number;
  traderName: string;
  traderTrades: number;
  status: OrderStatus;
  createdAt: string;
}

export interface P2POrder {
  id: string;
  offerId: string;
  asset: string;
  side: OrderSide;
  amount: number;
  price: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

// ─── Earn ─────────────────────────────────────────────────────────────────────
export type EarnType = 'flexible' | 'fixed';

export interface EarnProduct {
  id: string;
  asset: string;
  assetLogo: string;
  type: EarnType;
  apy: number;
  minDeposit: number;
  currency: string;
  balance: number;
  isHot: boolean;
  lockDays?: number;
}

export interface EarnPosition {
  id: string;
  productId: string;
  asset: string;
  balance: number;
  earned: number;
  apy: number;
  type: EarnType;
  since: string;
}

// ─── Crypto Loans ────────────────────────────────────────────────────────────
export interface LoanPosition {
  id: string;
  collateral: Asset;
  borrowed: number;
  borrowedAsset: string;
  ltv: number;
  interestRate: number;
  liquidationPrice: number;
  status: 'active' | 'liquidated' | 'closed';
  createdAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type RootTabParamList = {
  index: undefined;
  p2p: undefined;
  earn: undefined;
  credit: undefined;
  loans: undefined;
  swap: undefined;
  hub: undefined;
};
