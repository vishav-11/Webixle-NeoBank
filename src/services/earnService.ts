import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

// ─── Types ────────────────────────────────────────────────────────────────────

// API se jo format aata hai products ka
export interface EarnProduct {
  id: string;
  symbol: string;
  name: string;
  apy: number;
  type: 'fixed' | 'flexible';
  duration: number | null;
  minAmount: number;
  balance?: number;
}

// Position ke andar nested product
export interface EarnProductNested {
  _id: string;
  name: string;
  asset: string;
  chainId: string;
  type: 'FIXED' | 'FLEXIBLE';
  apy: number;
  durationDays?: number;
  minDeposit: string;
  maxDeposit: string;
  autoCompound: boolean;
  earlyWithdrawPenaltyPercent: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface EarnPosition {
  _id: string;
  userId: string;
  productId: EarnProductNested;
  asset: string;
  chainId: string;
  amount: string;
  earned: string;
  startAt: string;
  endAt: string | null;
  lastAccruedAt: string;
  status: 'ACTIVE' | 'REDEEMED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
  liveEarned?: string;
}

export interface EarnDashboard {
  totalStaked: number;
  totalEarned: number;
  positions: EarnPosition[];
   rank?: number;
}

export interface Portfolio {
  totalStaked: number;
  totalEarned: number;
  activePositions: number;
  positions: EarnPosition[];
}

export interface LeaderboardItem {
  _id: string;
  userId: { _id: string; email: string };
  totalStaked: string;
  totalEarned: string;
  createdAt: string;
  updatedAt: string;
  rank?: number;
}

export interface RewardHistoryItem {
  _id: string;
  type: 'SUBSCRIBE' | 'DAILY_REWARD' | 'REDEEM' | 'PENALTY' | 'COMPOUND';
  asset: { _id: string; chainId: string; name: string; symbol: string };
  amount: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
  positionId?: {
    _id: string;
    productId?: {
      _id: string;
      name?: string;
      type?: string;
      apy?: number;
      durationDays?: number;
    };
    asset: string;
    chainId: string;
    amount: string;
    earned: string;
    startAt: string;
    endAt: string | null;
    status: string;
  };
  userId?: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface PaginatedHistoryResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  data: RewardHistoryItem[];
}

export interface PreviewEarnResponse {
  dailyEarn: number;
  monthlyEarn: number;
  yearlyEarn: number;
}

export interface RedeemPreviewResponse {
  principal: number;
  totalEarned: number;
  penalty: number;
  finalReward: number;
}

// Calculator response — per product result
export interface CalculatorProductResult {
  id: string;
  symbol: string;
  name: string;
  apy: number;
  type: 'fixed' | 'flexible';
  duration: number | null;
  minAmount: number;
  balance?: number;
  // calculated fields (backend might return these)
  dailyEarn?: number;
  monthlyEarn?: number;
  yearlyEarn?: number;
  totalEarn?: number;
  penalty?: number;
  totalReturn?: number;
}

export interface CalculatorResult {
  apy: number;
  amount: number;
  durationDays: string | number;
  dailyEarn: number;
  monthlyEarn: number;
  yearlyEarn: number;
  totalEarn: number;
  penalty: number;
  totalReturn: number;
}

export interface SubscribePayload {
  productId: string;
  amount: string;
}

// Calculator payload — NO productId
export interface CalculatorPayload {
  productId: string;   
  amount: string;
  days: string;       
  isEarly: string;     
}

export interface PreviewPayload {
  productId: string;
  amount: string;
}

// ─── Earn Service ─────────────────────────────────────────────────────────────
export const earnService = {

  getDashboard: async (): Promise<EarnDashboard> => {
    const res = await api.get(ENDPOINTS.EARN.DASHBOARD) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getProducts: async (): Promise<EarnProduct[]> => {
    const res = await api.get(ENDPOINTS.EARN.PRODUCTS) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getPositions: async (): Promise<EarnPosition[]> => {
    const res = await api.get(ENDPOINTS.EARN.MY_POSITIONS) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getPositionDetail: async (id: string): Promise<EarnPosition> => {
    const res = await api.get(ENDPOINTS.EARN.POSITION_DETAIL(id)) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getPortfolio: async (): Promise<Portfolio> => {
    const res = await api.get(ENDPOINTS.EARN.PORTFOLIO) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getLeaderboard: async (): Promise<LeaderboardItem[]> => {
    const res = await api.get(ENDPOINTS.EARN.LEADERBOARD) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  getRewardHistory: async (
    page = 1,
    limit = 10,
  ): Promise<PaginatedHistoryResponse> => {
    const res = await api.get(ENDPOINTS.EARN.REWARD_HISTORY, { page, limit }) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  subscribe: async (payload: SubscribePayload): Promise<any> => {
    const res = await api.post(ENDPOINTS.EARN.SUBSCRIBE, payload) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  redeem: async (positionId: string): Promise<any> => {
    const res = await api.post(ENDPOINTS.EARN.REDEEM(positionId), {}) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  preview: async (payload: PreviewPayload): Promise<PreviewEarnResponse> => {
    const res = await api.post(ENDPOINTS.EARN.PREVIEW, payload) as any;
    return res.data ?? res; // ✅ Already correct, but added fallback
  },

  redeemPreview: async (positionId: string): Promise<RedeemPreviewResponse> => {
    const res = await api.get(ENDPOINTS.EARN.REDEEM_PREVIEW(positionId)) as any;
    return res.data ?? res; // ✅ Unwrap
  },

  calculator: async (payload: CalculatorPayload): Promise<CalculatorResult> => {
    const res = await api.post(ENDPOINTS.EARN.EARNING_CALCULATOR, payload) as any;
    return res.data ?? res; // ✅ Unwrap
  },
};