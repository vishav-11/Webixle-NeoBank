import { api }       from './apiClient';
import { ENDPOINTS } from './endpoints';
import type {
  CreditAccount, SupportedAsset, CollateralItem,
  PaginatedTx, TxFilter, CreditRisk,
  BorrowPreview, RepayPreview,
} from '@/types/credit';

// ─── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; fetchedAt: number; }
const cache = new Map<string, CacheEntry<unknown>>();

const TTL = {
  OVERVIEW:   30_000,
  HEALTH:     20_000,
  ASSETS:    120_000,
  COLLATERAL: 15_000,
};

function getCache<T>(key: string, ttl: number): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > ttl) { cache.delete(key); return null; }
  return entry.data;
}
function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() });
}
function bust(...keys: string[]): void { keys.forEach(k => cache.delete(k)); }

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toNum(v: unknown, fallback = 0): number {
  const n = Number(v);
  return isNaN(n) ? fallback : n;
}

function mapRiskLevel(raw: string | undefined, score?: number): import('@/types/credit').RiskLevel {
  const s = raw?.toUpperCase();
  if (s === 'SAFE')    return 'Safe';
  if (s === 'HEALTHY') return 'Healthy';
  if (s === 'WARNING') return 'Warning';
  if (s === 'DANGER')  return 'Danger';
  const sc = score ?? 0;
  if (sc < 0.3)  return 'Safe';
  if (sc < 0.6)  return 'Healthy';
  if (sc < 0.85) return 'Warning';
  return 'Danger';
}

function mapRiskMessage(level: import('@/types/credit').RiskLevel): string {
  switch (level) {
    case 'Safe':    return 'Your position is healthy with low risk';
    case 'Healthy': return 'Position is in good health';
    case 'Warning': return 'Consider reducing exposure';
    case 'Danger':  return 'High risk — take action to avoid liquidation';
  }
}

// ─── Normalisers ───────────────────────────────────────────────────────────────

/**
 * GET /credit/overview response:
 * { totalLimit, availableCredit, usedCredit, interestAccrued, riskScore, riskLevel }
 */
function normaliseOverview(raw: any): CreditAccount {
  const d = raw?.data ?? raw;
  const riskLevel = mapRiskLevel(d.riskLevel, toNum(d.riskScore));
  return {
    id:              d._id ?? 'overview',
    status:          'active',
    creditLimit:     toNum(d.totalLimit),
    availableCredit: toNum(d.availableCredit),
    usedCredit:      toNum(d.usedCredit),
    interestRate:    toNum(d.interestRate ?? d.interest_rate, 5.5),
    accruedInterest: toNum(d.interestAccrued ?? d.interest_accrued),
    riskLevel,
  };
}

function normaliseAssets(raw: any): SupportedAsset[] {
  const list: any[] = Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw) ? raw : [];
  return list.map((a) => ({
    id:                   a.creditAssetConfigId ?? a._id ?? a.assetId ?? '',
    assetId:              a.assetId ?? '',
    symbol:               a.symbol ?? '',
    name:                 a.name ?? a.symbol ?? '',
    chainId:              a.chainId ?? 'ETH',
    decimals:             toNum(a.decimals, 18),
    ltv:                  toNum(a.ltv, 70),
    apr:                  toNum(a.interestRate, 5.5),
    liquidationThreshold: toNum(a.liquidationThreshold, 80),
    balance:              toNum(a.user_balance ?? a.balance, 0),
    balanceUsd:           toNum(a.user_balance_usd ?? a.balanceUsd, 0),
  }));
}

function normaliseCollaterals(raw: any): CollateralItem[] {
  const list: any[] = Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw) ? raw : [];
  return list.map((c) => {
    const asset = typeof c.asset === 'object' && c.asset !== null ? c.asset : {};
    return {
      id:       c._id ?? '',
      symbol:   asset.symbol ?? c.symbol ?? '',
      name:     asset.name   ?? c.name   ?? '',
      amount:   toNum(c.amount),
      valueUsd: toNum(c.usdValue ?? c.valueUsd),
      ltv:      toNum(c.ltv, 60),
      chainId:  c.chainId ?? asset.chainId ?? 'ETH',
      status:   (c.status?.toUpperCase() === 'ACTIVE' ? 'active'
               : c.status?.toUpperCase() === 'LOCKED' ? 'locked' : 'pending') as any,
    };
  });
}

function normaliseRisk(raw: any): CreditRisk {
  const d     = raw?.data ?? raw;
  const score = toNum(d.riskScore ?? d.health_factor ?? d.healthFactor, 0);
  const level = mapRiskLevel(d.riskLevel, score);
  return {
    level,
    livRatio:         score * 100,
    liquidationAt:    toNum(d.liquidationThreshold ?? d.liquidation_threshold, 0.8),
    safeBorrowLimit:  toNum(d.safeBorrowLimit ?? d.safe_borrow_limit ?? d.availableCredit, 0),
    liquidationPrice: toNum(d.liquidationPrice ?? d.liquidation_price, 0),
    message:          d.warningMessage ?? d.warning_message ?? mapRiskMessage(level),
  };
}

function normaliseTxs(raw: any, page: number): PaginatedTx {
  const list: any[] = Array.isArray(raw?.data) ? raw.data
    : Array.isArray(raw) ? raw : [];

  const data = list.map((tx): import('@/types/credit').CreditTransaction => {
    const type = (tx.type?.toUpperCase() ?? 'BORROW') as import('@/types/credit').TxType;
    const amt  = toNum(tx.amount);
    const isCr = type === 'REPAY' || type === 'INTEREST';
    return {
      id:        tx._id ?? '',
      type,
      label:     type === 'BORROW'      ? `Borrowed $${amt.toFixed(2)}`
               : type === 'REPAY'       ? `Repaid $${amt.toFixed(2)}`
               : type === 'INTEREST'    ? `Interest $${amt.toFixed(2)}`
               : `Liquidation $${amt.toFixed(2)}`,
      amountUsd: amt,
      direction: isCr ? 'credit' : 'debit',
      createdAt: tx.createdAt ?? tx.created_at ?? new Date().toISOString(),
    };
  });

  return {
    data,
    page,
    totalPages: toNum(raw?.totalPages ?? raw?.meta?.totalPages, 1) || 1,
    total:      toNum(raw?.total ?? raw?.meta?.total, data.length),
  };
}

// ─── Service ───────────────────────────────────────────────────────────────────

export const creditService = {

  // Primary data source — replaces getAccount
  getOverview: async (): Promise<CreditAccount> => {
    const cached = getCache<CreditAccount>('overview', TTL.OVERVIEW);
    if (cached) return cached;
    const res  = await api.get(ENDPOINTS.CREDIT.GET_OVERVIEW);
    const data = normaliseOverview(res);
    setCache('overview', data);
    return data;
  },

  // Alias kept for compat
  getAccount: async (): Promise<CreditAccount> => creditService.getOverview(),

  activate: async (): Promise<void> => {
    await api.post(ENDPOINTS.CREDIT.ACTIVATE, {});
    bust('overview');
  },

  getSupportedAssets: async (): Promise<SupportedAsset[]> => {
    const cached = getCache<SupportedAsset[]>('assets', TTL.ASSETS);
    if (cached) return cached;
    const res  = await api.get(ENDPOINTS.CREDIT.GET_SUPPORTED_ASSETS);
    const data = normaliseAssets(res);
    setCache('assets', data);
    return data;
  },

  previewLimit: async (assetId: string, amount: number): Promise<BorrowPreview> => {
    const res = await api.get(ENDPOINTS.CREDIT.PREVIEW_LIMIT, { assetId, amount });
    return (res as any)?.data ?? res;
  },

  listCollateral: async (): Promise<CollateralItem[]> => {
    const cached = getCache<CollateralItem[]>('collateral', TTL.COLLATERAL);
    if (cached) return cached;
    const res  = await api.get(ENDPOINTS.CREDIT.LIST_COLLATERAL);
    const data = normaliseCollaterals(res);
    setCache('collateral', data);
    return data;
  },

  addCollateral: async (payload: {
    assetId: string;
    chainId: string;
    amount:  number;
    ltv?:    number;
  }): Promise<void> => {
    await api.post(ENDPOINTS.CREDIT.ADD_COLLATERAL, payload);
    bust('collateral', 'overview', 'health', 'risk');
  },

  removeCollateral: async (id: string): Promise<void> => {
    await api.post(ENDPOINTS.CREDIT.REMOVE_COLLATERAL(id), {});
    bust('collateral', 'overview', 'health', 'risk');
  },

  getRisk: async (): Promise<CreditRisk> => {
    const cached = getCache<CreditRisk>('risk', TTL.HEALTH);
    if (cached) return cached;
    const res  = await api.get(ENDPOINTS.CREDIT.GET_RISK);
    const data = normaliseRisk(res);
    setCache('risk', data);
    return data;
  },

  getHealth: async (): Promise<CreditRisk> => {
    const cached = getCache<CreditRisk>('health', TTL.HEALTH);
    if (cached) return cached;
    const res  = await api.get(ENDPOINTS.CREDIT.GET_HEALTH);
    const data = normaliseRisk(res);
    setCache('health', data);
    return data;
  },

  borrow: async (payload: { amount: number; assetId?: string }): Promise<void> => {
    await api.post(ENDPOINTS.CREDIT.BORROW, payload);
    bust('overview', 'health', 'risk');
  },

  repayPreview: async (amount: number): Promise<RepayPreview> => {
    const res = await api.get(ENDPOINTS.CREDIT.REPAY_PREVIEW, { amount });
    const d   = (res as any)?.data ?? res;
    return {
      totalOwed:    toNum(d.outstanding_balance ?? d.totalOwed),
      principal:    toNum(d.principal),
      interest:     toNum(d.interest),
      newAvailable: toNum(d.new_available ?? d.newAvailable),
      newRiskLevel: mapRiskLevel(d.new_risk_level ?? d.newRiskLevel),
    };
  },

  repay: async (payload: { amount: number; pin?: string }): Promise<void> => {
    await api.post(ENDPOINTS.CREDIT.REPAY, payload);
    bust('overview', 'health', 'risk');
  },

  getTransactions: async (
    filter: TxFilter = 'all',
    page   = 1,
    limit  = 20,
  ): Promise<PaginatedTx> => {
    const key    = `txns_${filter}_${page}`;
    const cached = getCache<PaginatedTx>(key, 20_000);
    if (cached) return cached;

    const params: Record<string, unknown> = { page, limit };
    if (filter !== 'all') params.type = filter.toUpperCase();

    const res  = await api.get(ENDPOINTS.CREDIT.GET_TRANSACTIONS, params);
    const data = normaliseTxs(res, page);
    setCache(key, data);
    return data;
  },

  bustAll: () => cache.clear(),
};