// services/swapService.ts
import { api } from "./apiClient";
import { ENDPOINTS } from "./endpoints";

// ─── Types ────────────────────────────────────────────────────────────────────

// Platform Asset (getAssetsList se)
export interface PlatformSwapAsset {
  _id: string;
  chainId: string; // 'ETH', 'TRON', 'BTC'
  assetAddress: string;
  assetType: string;
  coinGeckoId: string;
  name: string;
  symbol: string;
  decimals: number;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  withdrawalFee: string;
  minWithdrawalAmount: string;
  maxWithdrawalAmount: string;
  tokenName: string;
  // Runtime mein add hoga
  availableBalance?: string;
  priceUsd?: number;
}

// ✅ Actual backend curl ke hisaab se:
// { chainId: "1", fromAssetId: "...", toAssetId: "...", amount: "1000000000000000000" }
export interface SwapQuoteParams {
  chainId: string; // numeric chain id as string, e.g. "1"
  fromAssetId: string;
  toAssetId: string;
  amount: string; // raw amount in smallest unit (wei etc)
}

// ✅ Actual backend response:
// { success: true, data: { dstAmount, minOut, slippage } }
export interface SwapQuoteResponse {
  dstAmount: string; // raw smallest unit
  minOut: string; // raw smallest unit, slippage-protected min
  slippage: number; // e.g. 1 (%)
}

export interface SwapExecuteParams {
  chainId: string;
  fromAssetId: string;
  toAssetId: string;
  amount: string;
  minOut: string; // slippage-protected min from quote, backend ko bhejo protection ke liye
  toAddress?: string; // ✅ optional - internal swap me address ki zaroorat nahi
  pin?: string;
}

export interface SwapHistoryItem {
  _id: string;
  fromAsset: { symbol: string; name: string; _id: string };
  toAsset: { symbol: string; name: string; _id: string };
  fromAmount: string;
  toAmount: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  chainId: string;
  txHash?: string;
  fee?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────
export const swapService = {
  /**
   * POST /swap/quote
   * Backend expects: { chainId, fromAssetId, toAssetId, amount }
   * Backend returns: { dstAmount, minOut, slippage }
   */
  getQuote: (params: SwapQuoteParams) => api.post(ENDPOINTS.SWAP.QUOTE, params),

  /**
   * POST /swap/execute
   */
  execute: (payload: SwapExecuteParams) =>
    api.post(ENDPOINTS.SWAP.EXECUTE, payload),

  /**
   * GET /swap/history?page=1&limit=10
   */
  getHistory: (page = 1, limit = 10) =>
    api.get(ENDPOINTS.SWAP.HISTORY, { page, limit }),

  /**
   * GET /swap/:id
   */
  getDetail: (id: string) => api.get(ENDPOINTS.SWAP.DETAIL(id)),

  /**
   * POST /swap/:id/cancel
   */
  cancel: (id: string) => api.post(ENDPOINTS.SWAP.CANCEL(id), {}),

  /**
   * GET /swap/portfolio
   */
  getPortfolio: () => api.get(ENDPOINTS.SWAP.PORTFOLIO),

  /**
   * GET /swap/active
   */
  getActive: () => api.get(ENDPOINTS.SWAP.ACTIVE),
};
