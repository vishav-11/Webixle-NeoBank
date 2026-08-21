// hooks/queires/index.ts
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';

// ─── Services ─────────────────────────────────────────────────────────────────
import { authService }         from '@/services/authService';
import { walletService }       from '@/services/walletService';
import { swapService }         from '@/services/swapService';
import { earnService }         from '@/services/earnService';
import { creditService }       from '@/services/creditService';
import { kycService }          from '@/services/kycService';
import { notificationService } from '@/services/notificationService';
import { twoFactorService }    from '@/services/twoFactorService';
import cardService             from '@/services/cardService';
import loanService             from '@/services/loanService';
import p2pService              from '@/services/p2pService';
import supportService          from '@/services/supportService';
import { paymentMethodService } from '@/services/paymentMethodService';
import { moonpayService } from '@/services/moonpayService';
import type {
  BuyQuoteParams,
  SellQuoteParams,
  BuyTransactionParams,
  SellTransactionParams,
  MoonPayFiatCurrency,
  MoonPayCurrency,
  MoonPayCountry,
  SellQuoteResponse,
  BuyQuoteResponse,
  MoonPayTransactionListItem,
} from '@/services/moonpayService';

import type { PlatformAsset, BuyableCrypto } from '@/types/platformAsset';
import React from 'react';
import { useAuth } from '@/context/AuthContext';


// ─── Types re-export ──────────────────────────────────────────────────────────
export type { UserProfile, UpdateProfilePayload } from '@/services/authService';
export type { 
  SwapQuoteParams, 
  SwapExecuteParams,
  PlatformSwapAsset,
  SwapHistoryItem,
} from '@/services/swapService';
export type { EarnProduct, EarnPosition, SubscribePayload } from '@/services/earnService';
export type { CreditAccount, SupportedAsset, CollateralItem, PaginatedTx, TxFilter, CreditRisk } from '@/types/credit';
export type { LoanPair, LoanData, LoanDetail, LoanStats, CreateLoanPayload, RepayLoanPayload } from '@/types/loanType';
export type { P2PAd, P2POrder, P2POrderDetail, CreateAdPayload, PlaceOrderPayload } from '@/types/p2pTypes';
export type {
  PaymentMethod,
  UserPaymentAccount,
  AddPaymentAccountPayload,
  ActiveMethodsParams,
} from '@/services/paymentMethodService';
export type { BuyQuoteParams, SellQuoteParams, BuyTransactionParams, SellTransactionParams };
export type { PlatformAsset, MoonPayCurrency, BuyableCrypto };




// ─── Wallet Types ─────────────────────────────────────────────────────────────
export interface DashboardAsset {
  symbol:            string;
  name:              string;
  chainId:           string;
  availableBalance:  string;
  lockedBalance:     string;
  totalBalance:      string;
  totalLockUsd:      string;
  totalAvailableUsd: string;
  usdValue:          string;
}

export interface DashboardData {
  totalUsd: string;
  assets:   DashboardAsset[];
}

// ✅ Single canonical WalletAsset definition (duplicate removed)
export interface WalletAsset {
  _id:                 string;
  symbol:              string;
  name:                string;
  decimals:            number;
  chainId:             string;
  assetType:           string;
  balance?:            string;
  withdrawalFee:       string;
  minWithdrawalAmount: string;
  priceUsd?:           number;
  depositEnabled?:     boolean;
  withdrawalEnabled?:  boolean;
  coinGeckoId?:        string;
}

export interface SwapQuote {
  toAmount:      string;   // ✅ decimal-formatted (UI display ke liye derive kiya gaya)
  dstAmount:     string;   // raw backend value (smallest unit)
  minOut:        string;   // raw backend value (smallest unit)
  minOutDisplay: string;   // decimal-formatted minOut
  slippage:      number;   // e.g. 1 (%)
}

// ── Helper: smallest unit → decimal string ───────────────────────────────────
export function fromSmallestUnit(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num)) return '0';
    return (num / Math.pow(10, decimals)).toString();
  } catch {
    return '0';
  }
}

// ── Helper: amount to wei/smallest unit convert karo ─────────────────────────
export function toSmallestUnit(amount: string, decimals: number): string {
  try {
    const num = parseFloat(amount);
    if (isNaN(num) || num <= 0) return '0';
    // BigInt use karo precision ke liye
    const factor = Math.pow(10, decimals);
    return Math.floor(num * factor).toString();
  } catch {
    return '0';
  }
}

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const QK = {
  // Auth
  auth: {
    profile: ['auth', 'profile'] as const,
  },

  // KYC
  kyc: {
    status: ['kyc', 'status'] as const,
  },

  // Wallet
  wallet: {
    dashboard:     ['wallet', 'dashboard']    as const,
    allWallets:    ['wallet', 'all']          as const,
    blockchains:   ['wallet', 'blockchains']  as const,
    transactions:  ['wallet', 'transactions'] as const,
    assetsList:    ['wallet','assetList'] as const,
    transaction:   (id: string) => ['wallet', 'transaction', id] as const,
    balance:       (chain?: string) => ['wallet', 'balance', chain] as const,
    assetBalance:  (chainId: string, assetId: string) =>
      ['wallet', 'assetBalance', chainId, assetId] as const,
    assetBalancePrefix: ['wallet', 'assetBalance'] as const, // ✅ prefix for bulk invalidation
    assetsByChain: (chainId: string) => ['wallet', 'assets', chainId] as const,
    depositAddress:(assetId: string, chainId: string) =>
      ['wallet', 'deposit', assetId, chainId] as const,
  },

  // Swap
  swap: {
    assets:    ['swap', 'assets']  as const,
    history:   (page: number) => ['swap', 'history', page] as const,
    detail:    (id: string)   => ['swap', 'detail', id]    as const,
    active:    ['swap', 'active']    as const,
    portfolio: ['swap', 'portfolio'] as const,
    quote:     (params: object) => ['swap', 'quote', params] as const,
  },

  // Earn
  earn: {
    dashboard:  ['earn', 'dashboard']   as const,
    products:   ['earn', 'products']    as const,
    positions:  ['earn', 'positions']   as const,
    position:   (id: string) => ['earn', 'position', id] as const,
    portfolio:  ['earn', 'portfolio']   as const,
    leaderboard:['earn', 'leaderboard'] as const,
    history:    (page: number, limit: number) =>
      ['earn', 'history', page, limit] as const,
    redeemPreview: (id: string) => ['earn', 'redeemPreview', id] as const,
  },

  // Credit
  credit: {
    overview:    ['credit', 'overview']    as const,
    health:      ['credit', 'health']      as const,
    risk:        ['credit', 'risk']        as const,
    assets:      ['credit', 'assets']      as const,
    collateral:  ['credit', 'collateral']  as const,
    transactions:(filter: string, page: number) =>
      ['credit', 'transactions', filter, page] as const,
    repayPreview:(amount: number) => ['credit', 'repayPreview', amount] as const,
    previewLimit:(assetId: string, amount: number) =>
      ['credit', 'previewLimit', assetId, amount] as const,
  },

  // Loan
  loan: {
    pairs:      ['loan', 'pairs']      as const,
    myLoans:    ['loan', 'my']         as const,
    completed:  ['loan', 'completed']  as const,
    stats:      ['loan', 'stats']      as const,
    detail:     (id: string) => ['loan', 'detail', id]        as const,
    txns:       (id: string) => ['loan', 'transactions', id]  as const,
    preview:    (payload: object) => ['loan', 'preview', payload] as const,
  },

  // P2P
  p2p: {
    ads:        (params?: object) => ['p2p', 'ads', params]       as const,
    myAds:      ['p2p', 'myAds']                                  as const,
    myOrders:   ['p2p', 'myOrders']                               as const,
    order:      (id: string) => ['p2p', 'order', id]              as const,
    dispute:    (id: string) => ['p2p', 'dispute', id]            as const,
    sla:        ['p2p', 'sla']                                    as const,
    assets:     (chainId: string) => ['p2p', 'assets', chainId]   as const,
    myTradeRequests: ['p2p', 'myTradeRequests'],
  },

  // Notifications
  notification: {
    all:  (params?: object) => ['notification', 'all', params] as const,
    last: ['notification', 'last'] as const,
  },

  // Card
  card: {
    list:         (page: string, limit: string) =>
      ['card', 'list', page, limit] as const,
    detail:       (cardId: string) => ['card', 'detail', cardId]       as const,
    pan:          (cardId: string) => ['card', 'pan', cardId]          as const,
    pin:          (cardId: string) => ['card', 'pin', cardId]          as const,
    limit:        (cardId: string) => ['card', 'limit', cardId]        as const,
    transactions: (payload: object) => ['card', 'txns', payload]       as const,
    txDetail:     (orderId: string) => ['card', 'txDetail', orderId]   as const,
    disputes:     (params: object)  => ['card', 'disputes', params]    as const,
    prefundBal:   ['card', 'prefundBalance'] as const,
    kyc:          ['card', 'kyc']           as const,
    kycUrl:       ['card', 'kycUrl']        as const,
    countries:    (search?: string) => ['card', 'countries', search]   as const,
    liveness:     ['card', 'liveness'] as const,
    user:         ['card', 'user']     as const,
  },

  // Support
  support: {
    faqs:    ['support', 'faqs']    as const,
    tickets: ['support', 'tickets'] as const,
  },
   paymentMethod: {
   activeMethods: (params?: object) => ['paymentMethod', 'active', params] as const,
   detail:        (id: string)       => ['paymentMethod', 'detail', id]    as const,
   accounts:      ['paymentMethod', 'accounts'] as const,
 },
 moonpay: {
    cryptoCurrencies: ['moonpay', 'cryptoCurrencies'] as const,
    fiatCurrencies:   ['moonpay', 'fiatCurrencies']   as const,
    countries:        ['moonpay', 'countries']         as const,
    buyQuote:  (params: object) => ['moonpay', 'buyQuote',  params] as const,
    sellQuote: (params: object) => ['moonpay', 'sellQuote', params] as const,
    transaction: (id: string)  => ['moonpay', 'transaction', id]   as const,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SHARED INVALIDATION HELPER ───────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Har money-moving mutation (swap, send, withdraw, borrow, repay, loan, p2p,
 * card topup, buy/sell) ke success ke baad ye call karo.
 * Pehle sirf dashboard/allWallets/assetsList invalidate ho rahe the -
 * assetBalance (jo SwapScreen/SendScreen individual balance ke liye use karta hai)
 * kabhi invalidate hi nahi hota tha, isliye UI purana/stale balance dikhata rehta tha.
 */
function invalidateWalletData(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QK.wallet.dashboard });
  qc.invalidateQueries({ queryKey: QK.wallet.allWallets });
  qc.invalidateQueries({ queryKey: QK.wallet.assetsList });
  qc.invalidateQueries({ queryKey: QK.wallet.assetBalancePrefix }); // ✅ prefix match -> sab assetBalance keys refresh
  qc.invalidateQueries({ queryKey: QK.wallet.transactions });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── AUTH HOOKS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function getProfileQueryKey(userId?: string | null) {
  return [...QK.auth.profile, userId ?? 'guest'] as const;
}

export function updateProfileCache(
  qc: ReturnType<typeof useQueryClient>,
  updater: (old: any) => any,
) {
  qc.setQueriesData<any>({ queryKey: QK.auth.profile }, (old: any) => {
    if (!old) return old;
    return updater(old);
  });
}
 

export function invalidateProfileCache(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: QK.auth.profile });
}
 
// ═══════════════════════════════════════════════════════════════════════════════
// useProfile — UPDATED to use the helper above instead of inlining the key.
// Behavior is IDENTICAL to before (same key shape, same staleTime, same
// enabled condition) — this is a refactor for consistency, not a logic change.
// ═══════════════════════════════════════════════════════════════════════════════
 
export function useProfile() {
  const { user, isAuthenticated } = useAuth();
 
  return useQuery({
    // ✅ Ab helper se — koi bhi doosri file yahi helper use karke exact
    // isi key ko target kar sakti hai (getProfileQueryKey).
    queryKey: getProfileQueryKey(user?._id),
 
    queryFn: async () => {
      const res = await authService.getProfile() as any;
      return res?.data?.user ?? res?.data ?? res;
    },
 
    staleTime: 5 * 60_000,
 
    // ✅ सिर्फ authenticated होने पर fetch करो
    enabled: isAuthenticated && !!user?._id,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, payload }: {
      userId:  string;
      payload: import('@/services/authService').UpdateProfilePayload;
    }) => authService.updateProfile(userId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.auth.profile });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── KYC HOOKS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useKycStatus() {
  return useQuery({
    queryKey: QK.kyc.status,
    queryFn:  () => kycService.getStatus(),
    staleTime: 30_000,
  });
}

export function useInitiateKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => kycService.initiate(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.kyc.status });
      qc.invalidateQueries({ queryKey: QK.auth.profile });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── WALLET HOOKS ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useWalletDashboard() {
  return useQuery<DashboardData>({
    queryKey: QK.wallet.dashboard,
    queryFn:  async () => {
      const res  = await walletService.getDashboard() as any;
      return (res?.data ?? res) as DashboardData;
    },
    staleTime:       30_000,
    refetchInterval: 60_000,
  });
}

export function useAllWallets() {
  return useQuery({
    queryKey: QK.wallet.allWallets,
    queryFn:  async () => {
      const res = await walletService.getAllWallets() as any;
      return res?.data ?? res;
    },
    staleTime: 60_000,
  });
}

export function useSupportedBlockchains() {
  return useQuery({
    queryKey: QK.wallet.blockchains,
    queryFn:  async () => {
      const res = await walletService.getSupportedBlockchains() as any;
      return res?.data ?? res;
    },
    staleTime: 5 * 60_000,
  });
}

export function useWalletBalance(chain?: string) {
  return useQuery({
    queryKey: QK.wallet.balance(chain),
    queryFn:  async () => {
      const res = await walletService.getBalance(chain) as any;
      return res?.data ?? res;
    },
    staleTime: 30_000,
  });
}

export function useAssetBalance(chainId?: string, assetId?: string) {
  return useQuery<string>({
    queryKey: QK.wallet.assetBalance(chainId ?? '', assetId ?? ''),
    queryFn:  async () => {
      const res  = await walletService.getWalletBalance(chainId!, assetId!) as any;
      const data = res?.data ?? res;
      return data?.availableBalance ?? '0';
    },
    enabled:   !!chainId && !!assetId,
    staleTime: 30_000,
  });
}

export function useAssetsByChain(chainId: string) {
  return useQuery({
    queryKey: QK.wallet.assetsByChain(chainId),
    queryFn:  async () => {
      const res = await walletService.getAssetsByChain(chainId) as any;
      return (res?.data ?? res) as WalletAsset[];
    },
    enabled:   !!chainId,
    staleTime: 60_000,
  });
}

export function useAssetsList() {
  return useQuery({
    queryKey: QK.wallet.assetsList, // ✅ () hata diya
    queryFn: async () => {
      const res = await walletService.getAssetsList() as any;
      return (res?.data ?? res) as PlatformAsset[];
    },
    staleTime: 10 * 60_000,
  });
}
export function useDepositAddress(assetId: string, chainId: string) {
  return useQuery({
    queryKey: QK.wallet.depositAddress(assetId, chainId),
    queryFn:  async () => {
      const res = await walletService.getDepositAddress(assetId, chainId) as any;
      return res?.data ?? res;
    },
    enabled:   !!assetId && !!chainId,
    staleTime: 10 * 60_000,
  });
}

// In @/hooks/useApi.ts

export function useTransactionHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: [...QK.wallet.transactions, page, limit], // ✅ Include pagination in key
    queryFn:  async () => {
      const res     = await walletService.getTransactionHistory(page, limit) as any;
      const dataObj = res?.data ?? res;
      
      // ✅ Return normalized response
      return {
        items:      dataObj?.items ?? dataObj?.transactions ?? dataObj?.data ?? [],
        total:      dataObj?.total ?? 0,
        page:       dataObj?.page ?? page,
        limit:      dataObj?.limit ?? limit,
        totalPages: dataObj?.totalPages ?? 1,
      };
    },
    placeholderData: (prev: any) => prev,
    staleTime: 15_000,
  });
}

// ✅ Add response type
export interface TransactionHistoryResponse {
  items:      Transaction[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

// ✅ Export Transaction type
export interface Transaction {
  _id:            string;
  userId?:        string;
  asset:          { _id: string; name: string; symbol: string } | string;
  type:           string;
  status?:        string;
  amount:         string | number;
  balanceBefore?: string;
  balanceAfter?:  string;
  refType?:       string;
  refId?:         string;
  note?:          string;
  fee?:           string | number;
  toAddress?:     string;
  fromAddress?:   string;
  txHash?:        string;
  usdValue?:      string | number;
  createdAt:      string;
  updatedAt?:     string;
}

export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: QK.wallet.transaction(id),
    queryFn:  async () => {
      const res = await walletService.getTransactionDetail(id) as any;
      return res?.data ?? res;
    },
    enabled: !!id,
  });
}


export function useSendCrypto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      to: string;
      amount:    number;
      assetId:     string;
      chainId:     string;
    }) => walletService.sendToUser(payload) as Promise<any>,
    retry: false, // ✅ financial action - kabhi auto-retry na ho
    onSuccess: () => {
      invalidateWalletData(qc); // ✅ ab assetBalance bhi refresh hoga
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      toAddress: string;
      amount:    number;
      assetId:     string;
      chainId:     string;
      network:   string;
    }) => walletService.withdraw(payload) as Promise<any>,
    retry: false, // ✅
    onSuccess: () => {
      invalidateWalletData(qc);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SWAP HOOKS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ✅ Single API call - getAssetsList se
 * Old: getAllWallets + getAssetsByChain (2 calls)
 * New: getAssetsList (1 call)
 */
export function useSwapAssets() {
  return useQuery<PlatformAsset[]>({
    queryKey: QK.wallet.assetsList,
    queryFn: async () => {
      const res = await walletService.getAssetsList() as any;
      const list = (res?.data ?? res ?? []) as PlatformAsset[];
      
      // Sirf deposit/withdrawal enabled assets
      return list.filter(a => 
        a.depositEnabled || a.withdrawalEnabled
      );
    },
    staleTime: 10 * 60_000,
  });
}

/**
 * User ke wallets se balance fetch karo
 * Returns: Map of assetId -> availableBalance
 */
export function useSwapBalances() {
  return useQuery({
    queryKey: [...QK.wallet.allWallets, 'swap-balances'],
    queryFn: async () => {
      const res = await walletService.getAllWallets() as any;
      const wallets = (res?.data ?? res ?? []) as any[];
      
      // assetId -> balance map banao
      const balanceMap: Record<string, string> = {};
      wallets.forEach((w: any) => {
        if (w.asset?._id || w.assetId) {
          const assetId = w.asset?._id ?? w.assetId;
          balanceMap[assetId] = w.availableBalance ?? '0';
        }
      });
      
      return balanceMap;
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * ✅ Updated useSwapQuote
 * Backend format: { chainId, fromAssetId, toAssetId, amount } → { dstAmount, minOut, slippage }
 */
export function useSwapQuote(
  params: (import('@/services/swapService').SwapQuoteParams & { toDecimals?: number }) | null
) {
  return useQuery<SwapQuote>({
    queryKey: QK.swap.quote(params ?? {}),
    queryFn: async () => {
      // toDecimals sirf UI conversion ke liye hai, backend ko nahi bhejna
      const { toDecimals, ...payload } = params! as any;

      const res = await swapService.getQuote(payload) as any;
      const d   = res?.data ?? res;

      const dstAmount = String(d?.dstAmount ?? '0');
      const minOut    = String(d?.minOut    ?? '0');
      const decimals  = toDecimals ?? 18;

      return {
        toAmount:      fromSmallestUnit(dstAmount, decimals),
        dstAmount,
        minOut,
        minOutDisplay: fromSmallestUnit(minOut, decimals),
        slippage:      Number(d?.slippage ?? 1),
      };
    },
    enabled: !!params &&
             !!params.chainId &&
             !!params.fromAssetId &&
             !!params.toAssetId &&
             params.fromAssetId !== params.toAssetId &&
             params.amount !== '0' &&
             params.amount !== '',
    staleTime:       15_000,
    refetchInterval: 20_000,
    retry:           1,
  });
}

export function useSwapHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: QK.swap.history(page),
    queryFn: async () => {
      const res     = await swapService.getHistory(page, limit) as any;
      const dataObj = res?.data ?? res;
      return {
        items:      dataObj?.items ?? dataObj?.swaps ?? dataObj?.data ?? [],
        total:      dataObj?.total      ?? 0,
        page:       dataObj?.page       ?? page,
        limit:      dataObj?.limit      ?? limit,
        totalPages: dataObj?.totalPages ?? 1,
      };
    },
    placeholderData: (prev: any) => prev,
    staleTime: 30_000,
  });
}

export function useSwapDetail(id: string) {
  return useQuery({
    queryKey: QK.swap.detail(id),
    queryFn: async () => {
      const res = await swapService.getDetail(id) as any;
      return res?.data ?? res;
    },
    enabled: !!id,
  });
}

export function useSwapPortfolio() {
  return useQuery({
    queryKey: QK.swap.portfolio,
    queryFn: async () => {
      const res = await swapService.getPortfolio() as any;
      return res?.data ?? res;
    },
    staleTime: 60_000,
  });
}

export function useActiveSwaps() {
  return useQuery({
    queryKey: QK.swap.active,
    queryFn: async () => {
      const res = await swapService.getActive() as any;
      return res?.data ?? res;
    },
    refetchInterval: 15_000,
  });
}

export function useExecuteSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('@/services/swapService').SwapExecuteParams) =>
      swapService.execute(payload) as Promise<any>,
    retry: false, // ✅ financial action - kabhi auto-retry na ho (double-execute bug ka fix)
    onSuccess: () => {
      invalidateWalletData(qc); // ✅ ab assetBalance bhi refresh hoga
      qc.invalidateQueries({ queryKey: QK.swap.active });
      qc.invalidateQueries({ queryKey: QK.swap.history(1) });
    },
  });
}

export function useCancelSwap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => swapService.cancel(id) as Promise<any>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.swap.active });
      qc.invalidateQueries({ queryKey: QK.swap.history(1) });
    },
  });
}
// ═══════════════════════════════════════════════════════════════════════════════
// ─── EARN HOOKS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useEarnDashboard() {
  return useQuery({
    queryKey: QK.earn.dashboard,
    queryFn: async () => {
      const res = await earnService.getDashboard() as any;
      return res?.data ?? res; // ✅ debug console.logs hata diye
    },
    staleTime: 30_000,
  });
}

export function useEarnProducts() {
  return useQuery({
    queryKey: QK.earn.products,
    queryFn:  async () => {
      const res = await earnService.getProducts() as any;
      return (res?.data ?? res) as import('@/services/earnService').EarnProduct[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useEarnPositions() {
  return useQuery({
    queryKey: QK.earn.positions,
    queryFn:  async () => {
      const res = await earnService.getPositions() as any;
      return (res?.data ?? res) as import('@/services/earnService').EarnPosition[];
    },
    staleTime: 30_000,
  });
}

export function useEarnPositionDetail(id: string) {
  return useQuery({
    queryKey: QK.earn.position(id),
    queryFn:  async () => {
      const res = await earnService.getPositionDetail(id) as any;
      return res?.data ?? res;
    },
    enabled: !!id,
  });
}

export function useEarnPortfolio() {
  return useQuery({
    queryKey: QK.earn.portfolio,
    queryFn:  async () => {
      const res = await earnService.getPortfolio() as any;
      return res?.data ?? res;
    },
    staleTime: 60_000,
  });
}

export function useEarnLeaderboard() {
  return useQuery({
    queryKey: QK.earn.leaderboard,
    queryFn:  async () => {
      const res = await earnService.getLeaderboard() as any;
      return res?.data ?? res;
    },
    staleTime: 5 * 60_000,
  });
}

export function useEarnHistory(page = 1, limit = 10) {
  return useQuery({
    queryKey: QK.earn.history(page, limit),
    queryFn:  async () => {
      const res = await earnService.getRewardHistory(page, limit) as any;
      return res?.data ?? res;
    },
    placeholderData: (prev: any) => prev,
  });
}

export function useRedeemPreview(positionId: string) {
  return useQuery({
    queryKey: QK.earn.redeemPreview(positionId),
    queryFn:  async () => {
      const res = await earnService.redeemPreview(positionId) as any;
      return res?.data ?? res; // ✅ debug console.logs hata diye
    },
    enabled: !!positionId,
  });
}

export function useSubscribeEarn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('@/services/earnService').SubscribePayload) =>
      earnService.subscribe(payload) as Promise<any>,
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.earn.positions });
      qc.invalidateQueries({ queryKey: QK.earn.dashboard });
      invalidateWalletData(qc);
    },
  });
}

export function useRedeemEarn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (positionId: string) =>
      earnService.redeem(positionId) as Promise<any>,
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.earn.positions });
      qc.invalidateQueries({ queryKey: QK.earn.dashboard });
      invalidateWalletData(qc);
    },
  });
}

export interface EarnCalculatorResult {
  apy: number;
  amount: number;
  durationDays: string;
  dailyEarn: number;
  monthlyEarn: number;
  yearlyEarn: number;
  totalEarn: number;
  penalty: number;
  totalReturn: number;
}

export function useEarnCalculator() {
  return useMutation<EarnCalculatorResult, any, import('@/services/earnService').CalculatorPayload>({
    mutationFn: async (payload) => {
      const res = (await earnService.calculator(payload)) as any;

      // ✅ handle both: axios response OR already unwrapped body
      const body = res?.data ?? res;
      return (body?.data ?? body) as EarnCalculatorResult;
    },
  });
}

export function useEarnPreview() {
  return useMutation({
    mutationFn: (payload: import('@/services/earnService').PreviewPayload) =>
      earnService.preview(payload) as Promise<any>,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CREDIT HOOKS ─────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useCreditOverview() {
  return useQuery({
    queryKey: QK.credit.overview,
    queryFn:  () => creditService.getOverview(),
    staleTime: 30_000,
  });
}

export function useCreditHealth() {
  return useQuery({
    queryKey: QK.credit.health,
    queryFn:  () => creditService.getHealth(),
    staleTime: 20_000,
  });
}

export function useCreditRisk() {
  return useQuery({
    queryKey: QK.credit.risk,
    queryFn:  () => creditService.getRisk(),
    staleTime: 20_000,
  });
}

export function useSupportedCreditAssets() {
  return useQuery({
    queryKey: QK.credit.assets,
    queryFn:  () => creditService.getSupportedAssets(),
    staleTime: 2 * 60_000,
  });
}

export function useCreditCollateral() {
  return useQuery({
    queryKey: QK.credit.collateral,
    queryFn:  () => creditService.listCollateral(),
    staleTime: 15_000,
  });
}

export function useCreditTransactions(
  filter: import('@/types/credit').TxFilter = 'all',
  page = 1
) {
  return useQuery({
    queryKey: QK.credit.transactions(filter, page),
    queryFn:  () => creditService.getTransactions(filter, page),
    placeholderData: (prev: any) => prev,
    staleTime: 20_000,
  });
}

export function useRepayPreview(amount: number) {
  return useQuery({
    queryKey: QK.credit.repayPreview(amount),
    queryFn:  () => creditService.repayPreview(amount),
    enabled:   amount > 0,
    staleTime: 10_000,
  });
}

export function usePreviewLimit(assetId: string, amount: number) {
  return useQuery({
    queryKey: QK.credit.previewLimit(assetId, amount),
    queryFn:  () => creditService.previewLimit(assetId, amount),
    enabled:   !!assetId && amount > 0,
    staleTime: 10_000,
  });
}


export function useActivateCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => creditService.activate(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.credit.overview });
    },
  });
}

// hooks/queires/index.ts mein sirf yeh change karo

export function useAddCreditCollateral() {
  const qc = useQueryClient();
  return useMutation({
    // ✅ ltv add kiya type mein
    mutationFn: (payload: {
      assetId: string;
      chainId: string;
      amount:  number;
      ltv:     number;   // ✅ backend ko chahiye
    }) => creditService.addCollateral(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.credit.collateral });
      qc.invalidateQueries({ queryKey: QK.credit.overview });
      qc.invalidateQueries({ queryKey: QK.credit.health });
      invalidateWalletData(qc); // ✅ wallet bhi update (assetBalance samet)
    },
  });
}

export function useRemoveCreditCollateral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => creditService.removeCollateral(id),
    retry: false, // ✅ financial action
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.credit.collateral });
      qc.invalidateQueries({ queryKey: QK.credit.overview });
      qc.invalidateQueries({ queryKey: QK.credit.health });
      invalidateWalletData(qc);
    },
  });
}

export function useBorrowCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { amount: number; assetId?: string }) =>
      creditService.borrow(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.credit.overview });
      qc.invalidateQueries({ queryKey: QK.credit.health });
      invalidateWalletData(qc);
    },
  });
}

export function useRepayCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { amount: number; pin?: string }) =>
      creditService.repay(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.credit.overview });
      qc.invalidateQueries({ queryKey: QK.credit.health });
      qc.invalidateQueries({ queryKey: ['credit', 'transactions'] });
      invalidateWalletData(qc);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOAN HOOKS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useLoanPairs() {
  return useQuery({
    queryKey: QK.loan.pairs,
    queryFn:  () => loanService.getPairs(),
    staleTime: 5 * 60_000,
  });
}

export function useMyLoans() {
  return useQuery({
    queryKey: QK.loan.myLoans,
    queryFn:  () => loanService.getMyLoans(),
    staleTime: 30_000,
  });
}

export function useCompletedLoans() {
  return useQuery({
    queryKey: QK.loan.completed,
    queryFn:  () => loanService.getCompleted(),
    staleTime: 60_000,
  });
}

export function useLoanDetail(id: string) {
  return useQuery({
    queryKey: QK.loan.detail(id),
    queryFn:  () => loanService.getDetail(id),
    enabled:  !!id,
    staleTime: 15_000,
  });
}

export function useLoanTransactions(id: string) {
  return useQuery({
    queryKey: QK.loan.txns(id),
    queryFn:  () => loanService.getTransactions(id),
    enabled:  !!id,
  });
}

export function useLoanStats() {
  return useQuery({
    queryKey: QK.loan.stats,
    queryFn:  () => loanService.getStats(),
    staleTime: 60_000,
  });
}

export function useLoanPreview(payload: import('@/types/loanType').LoanPreviewPayload | null) {
  return useQuery({
    queryKey: QK.loan.preview(payload ?? {}),
    queryFn:  () => loanService.getPreview(payload!),
    enabled:  !!payload,
    staleTime: 10_000,
  });
}

export function useCreateLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('@/types/loanType').CreateLoanPayload) =>
      loanService.create(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.loan.myLoans });
      qc.invalidateQueries({ queryKey: QK.loan.stats });
      invalidateWalletData(qc);
    },
  });
}

export function useRepayLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, payload }: {
      loanId:  string;
      payload: import('@/types/loanType').RepayLoanPayload;
    }) => loanService.repay(loanId, payload),
    retry: false, // ✅ financial action
    onSuccess: (_, { loanId }) => {
      qc.invalidateQueries({ queryKey: QK.loan.detail(loanId) });
      qc.invalidateQueries({ queryKey: QK.loan.myLoans });
      invalidateWalletData(qc);
    },
  });
}

export function useAddLoanCollateral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, payload }: {
      loanId:  string;
      payload: import('@/types/loanType').AddCollateralPayload;
    }) => loanService.addCollateral(loanId, payload),
    retry: false, // ✅ financial action
    onSuccess: (_, { loanId }) => {
      qc.invalidateQueries({ queryKey: QK.loan.detail(loanId) });
      invalidateWalletData(qc);
    },
  });
}

export function useWithdrawLoanCollateral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ loanId, payload }: {
      loanId:  string;
      payload: import('@/types/loanType').WithdrawCollateralPayload;
    }) => loanService.withdrawCollateral(loanId, payload),
    retry: false, // ✅ financial action
    onSuccess: (_, { loanId }) => {
      qc.invalidateQueries({ queryKey: QK.loan.detail(loanId) });
      invalidateWalletData(qc);
    },
  });
}

export function useCloseLoan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (loanId: string) => loanService.close(loanId),
    retry: false, // ✅ financial action
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.loan.myLoans });
      qc.invalidateQueries({ queryKey: QK.loan.completed });
      qc.invalidateQueries({ queryKey: QK.loan.stats });
      invalidateWalletData(qc);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── P2P HOOKS ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useP2PAds(params?: import('@/types/p2pTypes').P2PListAdsParams) {
  return useQuery({
    queryKey: QK.p2p.ads(params),
    queryFn:  () => p2pService.listAds(params),
    staleTime: 15_000,
  });
}

export function useMyP2PAds() {
  return useQuery({
    queryKey: QK.p2p.myAds,
    queryFn:  () => p2pService.myAds(),
    staleTime: 30_000,
  });
}

export function useMyP2POrders() {
  return useQuery({
    queryKey: QK.p2p.myOrders,
    queryFn:  () => p2pService.myOrders(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useP2POrderDetail(id: string) {
  return useQuery({
    queryKey: QK.p2p.order(id),
    queryFn:  () => p2pService.orderDetail(id),
    enabled:  !!id,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useP2PDisputeDetail(id: string) {
  return useQuery({
    queryKey: QK.p2p.dispute(id),
    queryFn:  () => p2pService.disputeDetail(id),
    enabled:  !!id,
  });
}

export function useP2PSLADashboard() {
  return useQuery({
    queryKey: QK.p2p.sla,
    queryFn:  () => p2pService.slaDashboard(),
    staleTime: 60_000,
  });
}

export function useCreateP2PAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: import('@/types/p2pTypes').CreateAdPayload) =>
      p2pService.createAd(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.p2p.myAds });
      qc.invalidateQueries({ queryKey: ['p2p', 'ads'] });
    },
  });
}

export function useUpdateP2PAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: {
      id:   string;
      body: import('@/types/p2pTypes').UpdateAdPayload;
    }) => p2pService.updateAd(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.p2p.myAds });
    },
  });
}

export function useDeleteP2PAd() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => p2pService.deleteAd(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.p2p.myAds });
    },
  });
}

export function useMyTradeRequests() {
  return useQuery({
    queryKey: QK.p2p.myTradeRequests,
    queryFn:  () => p2pService.myTradeRequests(),
  });
}


// export function usePlaceP2POrder() {
//   const qc = useQueryClient();
//   return useMutation({
//     mutationFn: (body: import('@/types/p2pTypes').PlaceOrderPayload) =>
//       p2pService.placeOrder(body),
//     retry: false, // ✅ financial action
//     onSuccess: () => {
//       qc.invalidateQueries({ queryKey: QK.p2p.myOrders });
//     },
//   });
// }

export function usePlaceP2POrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: import('@/types/p2pTypes').PlaceOrderPayload) =>
      p2pService.tradeRequest(body), 
    retry: false,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.p2p.myOrders });
    },
  });
}

export function useCancelP2POrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => p2pService.cancelOrder(id, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.p2p.order(id) });
      qc.invalidateQueries({ queryKey: QK.p2p.myOrders });
    },
  });
}

export function useMarkFiatSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, proof }: { id: string; proof?: string }) => p2pService.markFiatSent(id, proof),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: QK.p2p.order(id) });
      qc.invalidateQueries({ queryKey: QK.p2p.myOrders });
    },
  });
}

export function useReleaseP2POrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => p2pService.releaseOrder(id),
    retry: false, // ✅ financial action - funds release, kabhi retry na ho
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: QK.p2p.order(id) });
      qc.invalidateQueries({ queryKey: QK.p2p.myOrders });
      invalidateWalletData(qc);
    },
  });
}

export function useRateP2PSeller() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: {
      orderId: string;
      body:    import('@/types/p2pTypes').RateSellerPayload;
    }) => p2pService.rateSeller(orderId, body),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: QK.p2p.order(orderId) });
    },
  });
}

export function useRaiseP2PDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, body }: {
      orderId: string;
      body:    import('@/types/p2pTypes').RaiseDisputePayload;
    }) => p2pService.raiseDispute(orderId, body),
    onSuccess: (_, { orderId }) => {
      qc.invalidateQueries({ queryKey: QK.p2p.order(orderId) });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── NOTIFICATION HOOKS ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useNotifications(params?: {
  page?: number; limit?: number; type?: string;
}) {
  return useQuery({
    queryKey: QK.notification.all(params),
    queryFn:  async () => {
      const res = await notificationService.getAll(params) as any;
      return res?.data ?? res;
    },
    staleTime:       15_000,
    refetchInterval: 30_000,
  });
}

export function useLastNotification() {
  return useQuery({
    queryKey: QK.notification.last,
    queryFn:  async () => {
      const res = await notificationService.getLast() as any;
      return res?.data ?? res;
    },
    refetchInterval: 20_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notification'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['notification'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CARD HOOKS ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useCardList(page = '1', limit = '50') {
  return useQuery({
    queryKey: QK.card.list(page, limit),
    queryFn:  () => cardService.getCardList(page, limit),
    staleTime: 30_000,
  });
}

export function useCardDetail(cardId: string) {
  return useQuery({
    queryKey: QK.card.detail(cardId),
    queryFn:  () => cardService.getCardDetail(cardId),
    enabled:  !!cardId,
    staleTime: 30_000,
  });
}

export function useCardPan(cardId: string) {
  return useQuery({
    queryKey: QK.card.pan(cardId),
    queryFn:  () => cardService.getCardPan(cardId),
    enabled:  !!cardId,
    staleTime: 5 * 60_000,
  });
}

export function useCardPin(cardId: string) {
  return useQuery({
    queryKey: QK.card.pin(cardId),
    queryFn:  () => cardService.getCardPin(cardId),
    enabled:  !!cardId,
    staleTime: 5 * 60_000,
  });
}

export function useCardLimit(cardId: string) {
  return useQuery({
    queryKey: QK.card.limit(cardId),
    queryFn:  () => cardService.getCardLimit(cardId),
    enabled:  !!cardId,
    staleTime: 60_000,
  });
}

export function useCardTransactions(
  payload: import('../../types/cardTypes').TransactionHistoryPayload
) {
  return useQuery({
    queryKey: QK.card.transactions(payload),
    queryFn:  () => cardService.getTransactionHistory(payload),
    staleTime: 15_000,
  });
}

export function useCardTxDetail(orderId: string) {
  return useQuery({
    queryKey: QK.card.txDetail(orderId),
    queryFn:  () => cardService.getTransactionDetail(orderId),
    enabled:  !!orderId,
  });
}

export function useCardKycStatus() {
  return useQuery({
    queryKey: QK.card.kyc,
    queryFn:  () => cardService.queryKyc(),
    staleTime: 60_000,
  });
}

export function useCardKycUrl() {
  return useQuery({
    queryKey: QK.card.kycUrl,
    queryFn:  () => cardService.getKycUrl(),
    staleTime: 5 * 60_000,
  });
}

export function useCardLivenessStatus() {
  return useQuery({
    queryKey: QK.card.liveness,
    queryFn:  () => cardService.getLivenessStatus(),
    staleTime: 30_000,
  });
}

export function useCardPrefundBalance() {
  return useQuery({
    queryKey: QK.card.prefundBal,
    queryFn:  () => cardService.getPrefundBalance(),
    staleTime: 30_000,
  });
}

export function useCountries(search?: string) {
  return useQuery({
    queryKey: QK.card.countries(search),
    queryFn:  () => cardService.getCountries(search),
    staleTime: 10 * 60_000,
  });
}

export function useCardDisputes(params: {
  page: number; limit: number; status: string;
  fromDate?: string; toDate?: string;
}) {
  return useQuery({
    queryKey: QK.card.disputes(params),
    queryFn:  () =>
      cardService.getDisputes(
        params.page, params.limit, params.status,
        params.fromDate, params.toDate,
      ),
    staleTime: 30_000,
  });
}

export function useCreateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../../types/cardTypes').CreateCardPayload) =>
      cardService.createCard(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card', 'list'] });
      invalidateWalletData(qc);
    },
  });
}

export function useActivateCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../../types/cardTypes').ActivateCardPayload) =>
      cardService.activateCard(payload),
    onSuccess: (_, { cardId }: any) => {
      qc.invalidateQueries({ queryKey: QK.card.detail(cardId) });
    },
  });
}

export function useFreezeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardService.freezeCard(cardId),
    onSuccess:  (_, cardId) => {
      qc.invalidateQueries({ queryKey: QK.card.detail(cardId) });
    },
  });
}

export function useUnfreezeCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => cardService.unfreezeCard(cardId),
    onSuccess:  (_, cardId) => {
      qc.invalidateQueries({ queryKey: QK.card.detail(cardId) });
    },
  });
}

export function useTopupCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../../types/cardTypes').TopupPayload) =>
      cardService.topupCard(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card'] });
      invalidateWalletData(qc);
    },
  });
}

export function useSubmitCardKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData?: FormData) =>
      formData
        ? cardService.submitKycWithDocs(formData)
        : cardService.submitKyc(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.card.kyc });
    },
  });
}

export function useTopupCardMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../../types/cardTypes').TopupPayload) =>
      cardService.topupCard(payload),
    retry: false, // ✅ financial action
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['card'] });
      invalidateWalletData(qc);
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── SUPPORT HOOKS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useFaqs() {
  return useQuery({
    queryKey: QK.support.faqs,
    queryFn:  () => supportService.getFaqs(),
    staleTime: 10 * 60_000,
  });
}

export function useSupportTickets() {
  return useQuery({
    queryKey: QK.support.tickets,
    queryFn:  () => supportService.getMySupportTickets(),
    staleTime: 30_000,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('../../types/supportTypes').CreateContactPayload) =>
      supportService.createSupportTicket(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.support.tickets });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── 2FA HOOKS ────────────────────────────────────────────────────────────────
// ══

export function useToggle2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enable: boolean) => twoFactorService.toggle(enable),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.auth.profile });
    },
  });
}

export function useVerifyEmail2FA() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => twoFactorService.verifyEmail(code),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.auth.profile });
    },
  });
}

export function useSetupAuthenticator() {
  return useMutation({
    mutationFn: () => twoFactorService.setupAuthenticator(),
  });
}

export function useVerifyAuthenticator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => twoFactorService.verifyAuthenticator(code),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: QK.auth.profile });
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// ─── PAYMENT METHOD HOOKS (add this whole section, e.g. after SWAP HOOKS) ────
// ════════════════════════════════════════════════════════════════════════════
 
export function useActivePaymentMethods(params: import('@/services/paymentMethodService').ActiveMethodsParams = {}) {
  return useQuery({
    queryKey: QK.paymentMethod.activeMethods(params),
    queryFn: async () => {
const res = await paymentMethodService.getActiveMethods(params) as any;
return {
  methods: res?.data ?? [],
  total: res?.meta?.total ?? 0,
  totalPages: res?.meta?.totalPages ?? 1,
  page: res?.meta?.page ?? 1,
};
    },
    staleTime: 5 * 60_000,
  });
}
 
export function usePaymentMethodDetail(id: string) {
  return useQuery({
    queryKey: QK.paymentMethod.detail(id),
    queryFn: async () => {
      const res = await paymentMethodService.getMethodDetail(id) as any;
return res?.data ?? res;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}
 
export function usePaymentAccounts() {
  return useQuery({
    queryKey: QK.paymentMethod.accounts,
    queryFn: async () => {
      const res = await paymentMethodService.getAccounts() as any;
return (res?.data ?? []) as import('@/services/paymentMethodService').UserPaymentAccount[];
    },
    staleTime: 30_000,
  });
}
 
export function useAddPaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: import('@/services/paymentMethodService').AddPaymentAccountPayload) =>
      paymentMethodService.addAccount(payload) as Promise<any>,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.paymentMethod.accounts });
    },
  });
}
 
export function useDeletePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentMethodService.deleteAccount(id) as Promise<any>,
    // Optimistic removal so the card animates out immediately
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QK.paymentMethod.accounts });
      const previous = qc.getQueryData<import('@/services/paymentMethodService').UserPaymentAccount[]>(
        QK.paymentMethod.accounts
      );
      qc.setQueryData(
        QK.paymentMethod.accounts,
        (old: import('@/services/paymentMethodService').UserPaymentAccount[] = []) =>
          old.filter((a) => a._id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(QK.paymentMethod.accounts, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.paymentMethod.accounts });
    },
  });
}
 
export function useSetDefaultPaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentMethodService.setDefaultAccount(id) as Promise<any>,
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: QK.paymentMethod.accounts });
      const previous = qc.getQueryData<import('@/services/paymentMethodService').UserPaymentAccount[]>(
        QK.paymentMethod.accounts
      );
      qc.setQueryData(
        QK.paymentMethod.accounts,
        (old: import('@/services/paymentMethodService').UserPaymentAccount[] = []) =>
          old.map((a) => ({ ...a, isDefault: a._id === id }))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(QK.paymentMethod.accounts, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: QK.paymentMethod.accounts });
    },
  });
}


export function usePaginatedPaymentMethods(
  opts: { limit?: number; enabled?: boolean } = {}
) {
  const { limit = 10, enabled = true } = opts;
 
  const [methods, setMethods] = useState<import('@/services/paymentMethodService').PaymentMethod[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
 
  const loadPage = useCallback(
    async (pageNum: number, reset = false) => {
      if (pageNum === 1) setIsLoading(true);
      else setIsFetchingNextPage(true);
 
      try {
      const res = await paymentMethodService.getActiveMethods({ page: pageNum, limit }) as any;
const newMethods = res?.data ?? [];
setMethods((prev) => (reset ? newMethods : [...prev, ...newMethods]));
setTotalPages(res?.meta?.totalPages ?? 1);
        setPage(pageNum);
      } catch {
        // silent — picker shows "no methods" empty state
      } finally {
        setIsLoading(false);
        setIsFetchingNextPage(false);
        setHasLoadedOnce(true);
      }
    },
    [limit]
  );
 
  // Load first page once the picker opens
  useEffect(() => {
    if (enabled && !hasLoadedOnce) {
      loadPage(1, true);
    }
  }, [enabled, hasLoadedOnce, loadPage]);
 
  const hasNextPage = page < totalPages;
  const fetchNextPage = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) loadPage(page + 1);
  }, [isFetchingNextPage, hasNextPage, page, loadPage]);
 
  return { methods, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage };
}
 

// ── Buy Quote ─────────────────────────────────────────────────────────────────
export function useMoonPayBuyQuote(
  params: BuyQuoteParams,
  enabled = true
) {
  return useQuery({
    queryKey: ['moonpay', 'buyQuote', params],
    queryFn:  async () => {
      const res = await moonpayService.getBuyQuote(params) as any;
      return (res?.data ?? res) as BuyQuoteResponse['data'];
    },
    enabled:   enabled && !!params.currencyCode && params.amount >= 1,
    staleTime: 30_000,
    retry:     1,
  });
}

// ── Sell Quote ────────────────────────────────────────────────────────────────
export function useMoonPaySellQuote(
  params: SellQuoteParams,
  enabled = true
) {
  return useQuery({
    queryKey: ['moonpay', 'sellQuote', params],
    queryFn:  async () => {
      const res = await moonpayService.getSellQuote(params) as any;
      return (res?.data ?? res) as SellQuoteResponse['data'];
    },
    enabled:   enabled && !!params.currencyCode && params.amount > 0,
    staleTime: 30_000,
    retry:     1,
  });
}

// ── Crypto Currencies ─────────────────────────────────────────────────────────
export function useMoonPayCryptoCurrencies() {
  return useQuery({
    queryKey: ['moonpay', 'cryptoCurrencies'],
    queryFn:  async () => {
      const res = await moonpayService.getSupportedCryptoCurrencies() as any;
      const list = (res?.data ?? res ?? []) as MoonPayCurrency[];
      // Sirf active + live mode currencies
      return list.filter(c => !c.isSuspended && c.supportsLiveMode);
    },
    staleTime: 10 * 60_000,
  });
}

// ── Fiat Currencies ───────────────────────────────────────────────────────────
export function useMoonPayFiatCurrencies() {
  return useQuery({
    queryKey: ['moonpay', 'fiatCurrencies'],
    queryFn:  async () => {
      const res = await moonpayService.getSupportedFiatCurrencies() as any;
      const list = (res?.data ?? res ?? []) as MoonPayFiatCurrency[];

      // ✅ Fiat mein extra info add karo
      const enriched = list.map(c => ({
        ...c,
        isBuySupported:  c.minBuyAmount !== null && c.minBuyAmount !== undefined,
        isSellSupported: c.minSellAmount !== null && c.minSellAmount !== undefined,
        symbol:          FIAT_SYMBOLS[c.code.toUpperCase()] ?? c.code.toUpperCase(),
        flagEmoji:       FIAT_FLAGS[c.code.toUpperCase()]   ?? '🏳️',
      }));

      return enriched;
    },
    staleTime: 10 * 60_000,
  });
}

// ── Countries ─────────────────────────────────────────────────────────────────
export function useMoonPayCountries() {
  return useQuery({
    queryKey: ['moonpay', 'countries'],
    queryFn:  async () => {
      const res = await moonpayService.getSupportedCountries() as any;
      const list = (res?.data ?? res ?? []) as MoonPayCountry[];
      // Sirf allowed countries
      return list.filter(c => c.isAllowed);
    },
    staleTime: 30 * 60_000, // 30 min - rarely changes
  });
}

// ── Buy Transaction ───────────────────────────────────────────────────────────
export function useCreateBuyTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: BuyTransactionParams) =>
      moonpayService.createBuyTransaction(params),
    retry: false, // ✅ financial action
    onSuccess: () => {
      invalidateWalletData(qc); // ✅ buy hone ke baad wallet balance refresh
    },
    onError: (err: any) => {
      console.error('[MoonPay] Buy error:', err?.parsed?.message ?? err.message);
    },
  });
}

// ── Sell Transaction ──────────────────────────────────────────────────────────
export function useCreateSellTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: SellTransactionParams) =>
      moonpayService.createSellTransaction(params),
    retry: false, // ✅ financial action
    onSuccess: () => {
      invalidateWalletData(qc); // ✅ sell hone ke baad wallet balance refresh
    },
    onError: (err: any) => {
      console.error('[MoonPay] Sell error:', err?.parsed?.message ?? err.message);
    },
  });
}

// ── Buyable Cryptos (Platform + MoonPay merge) ────────────────────────────────
export function useBuyableCryptos() {
  const platformQ = useQuery({
    queryKey: QK.wallet.assetsList,
    queryFn: async () => {
      const res = await walletService.getAssetsList() as any;
      return (res?.data ?? res ?? []) as PlatformAsset[];
    },
    staleTime: 10 * 60_000,
  });

  const moonpayQ = useQuery({
    queryKey: ['moonpay', 'cryptoCurrencies'],
    queryFn: async () => {
      const res = await moonpayService.getSupportedCryptoCurrencies() as any;
      return (res?.data ?? res ?? []) as MoonPayCurrency[];
    },
    staleTime: 10 * 60_000,
  });

  const merged = React.useMemo<BuyableCrypto[]>(() => {
    const platform    = platformQ.data ?? [];
    const moonpayList = moonpayQ.data  ?? [];
    if (!platform.length || !moonpayList.length) return [];

    const moonpayMap = new Map<string, MoonPayCurrency>();
    moonpayList.forEach(c => {
      moonpayMap.set(c.code.toLowerCase(), c);
    });

    const result: BuyableCrypto[] = [];
    const seen = new Set<string>();

    platform.forEach(asset => {
      if (!asset.depositEnabled) return;
      const validChains = ['ETH', 'BTC', 'SOL', 'TRON', 'BSC', 'POLYGON'];
      if (!validChains.includes(asset.chainId)) return;

      const symbolLower = asset.symbol.toLowerCase();
      const moonpay = moonpayMap.get(symbolLower);
      if (!moonpay || moonpay.isSuspended) return;

      const key = `${asset.symbol}_${asset.chainId}`;
      if (seen.has(key)) return;
      seen.add(key);

      result.push({
        platformAssetId: asset._id,
        chainId:         asset.chainId,
        symbol:          asset.symbol,
        name:            asset.name,
        coinGeckoId:     asset.coinGeckoId,
        moonpayCode:     moonpay.code,
        moonpayIcon:     (moonpay as any).icon ?? '',
        minBuyAmount:    moonpay.minBuyAmount  ?? null,
        maxBuyAmount:    moonpay.maxBuyAmount  ?? null,
        isSellSupported: moonpay.isSellSupported ?? false,
        minSellAmount:   moonpay.minSellAmount ?? null,
        maxSellAmount:   moonpay.maxSellAmount ?? null,
        isSuspended:     moonpay.isSuspended   ?? false,
      });
    });

    return result;
  }, [platformQ.data, moonpayQ.data]);

  return {
    data:      merged,
    isLoading: platformQ.isLoading || moonpayQ.isLoading,
    isError:   platformQ.isError   || moonpayQ.isError,
    refetch:   () => { platformQ.refetch(); moonpayQ.refetch(); },
  };
}

export function useSellableCryptos() {
  const { data, ...rest } = useBuyableCryptos();
  return { data: data.filter(a => a.isSellSupported), ...rest };
}

// ── Transaction History ───────────────────────────────────────────────────────
export function useMoonPayTransactions() {
  return useQuery({
    queryKey: ['moonpay', 'transactions'],
    queryFn: async () => {
      const res = await moonpayService.getTransactions() as any;
      const list = (res?.data ?? res ?? []) as any[];
      
      // ✅ API response ko normalize karo
      return list.map(item => ({
        id:                  item.moonpayTransactionId ?? item._id, // ✅ moonpayTransactionId use karo
        _id:                 item._id,                              // ✅ DB id bhi rakh
        moonpayTransactionId: item.moonpayTransactionId,
        status:              item.status,
        type:                item.type,
        baseCurrencyCode:    item.baseCurrencyCode,
        baseCurrencyAmount:  parseFloat(item.baseCurrencyAmount ?? "0"),
        currencyCode:        item.currencyCode,
        quoteCurrencyAmount: parseFloat(item.cryptoAmount ?? "0"),
        walletAddress:       item.walletAddress,
        createdAt:           item.createdAt,
        updatedAt:           item.updatedAt,
        moonpayData:         item.moonpayData,
        email:               item.email,
      })) as MoonPayTransactionListItem[];
    },
    staleTime: 30_000,
    retry: 1,
  });
}
// ── Single Transaction Status ─────────────────────────────────────────────────
export function useMoonPayTransactionStatus(
  transactionId: string | null,
  enabled = true
) {
  return useQuery({
    queryKey: ['moonpay', 'transaction', transactionId],
    queryFn: async () => {
      if (!transactionId) throw new Error("No transaction ID");
      
      const res = await moonpayService.getTransaction(transactionId) as any;
      const data = res?.data ?? res;
      
      // ✅ Response normalize karo
      return {
        id:                  data.moonpayTransactionId ?? data._id ?? transactionId,
        _id:                 data._id,
        moonpayTransactionId: data.moonpayTransactionId,
        status:              data.status ?? "PENDING",
        type:                data.type,
        baseCurrencyCode:    data.baseCurrencyCode,
        baseCurrencyAmount:  parseFloat(data.baseCurrencyAmount ?? "0"),
        currencyCode:        data.currencyCode,
        quoteCurrencyAmount: parseFloat(data.cryptoAmount ?? data.quoteCurrencyAmount ?? "0"),
        walletAddress:       data.walletAddress,
        createdAt:           data.createdAt,
        updatedAt:           data.updatedAt,
        moonpayData:         data.moonpayData,
      } as MoonPayTransactionListItem;
    },
    enabled:  enabled && !!transactionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 5_000;
      const status = data.status?.toUpperCase();
      if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) return false;
      return 8_000;
    },
    staleTime: 0,
    retry: 2,
  });
}

// ─── Helper constants ──────────────────────────────────────────────────────────
const FIAT_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ',
  CAD: 'C$', AUD: 'A$', SGD: 'S$', CHF: 'Fr',
  JPY: '¥', HKD: 'HK$', MXN: 'MX$', BRL: 'R$',
  NOK: 'kr', SEK: 'kr', DKK: 'kr', PLN: 'zł',
  CZK: 'Kč', HUF: 'Ft', RON: 'lei', BGN: 'лв',
  TRY: '₺', ZAR: 'R', NZD: 'NZ$', THB: '฿',
  MYR: 'RM', IDR: 'Rp', PHP: '₱', TWD: 'NT$',
  KRW: '₩', COP: 'COP', PEN: 'S/', CLP: 'CLP',
  ARS: 'ARS', UAH: '₴', ILS: '₪', KWD: 'KD',
  SAR: '﷼', QAR: 'QR', OMR: 'OMR', BHD: 'BD',
  VND: '₫', PKR: '₨', NGN: '₦', EGP: '£',
};

const FIAT_FLAGS: Record<string, string> = {
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', AED: '🇦🇪',
  CAD: '🇨🇦', AUD: '🇦🇺', SGD: '🇸🇬', CHF: '🇨🇭',
  JPY: '🇯🇵', HKD: '🇭🇰', MXN: '🇲🇽', BRL: '🇧🇷',
  NOK: '🇳🇴', SEK: '🇸🇪', DKK: '🇩🇰', PLN: '🇵🇱',
  CZK: '🇨🇿', HUF: '🇭🇺', RON: '🇷🇴', BGN: '🇧🇬',
  TRY: '🇹🇷', ZAR: '🇿🇦', NZD: '🇳🇿', THB: '🇹🇭',
  MYR: '🇲🇾', IDR: '🇮🇩', PHP: '🇵🇭', TWD: '🇹🇼',
  KRW: '🇰🇷', COP: '🇨🇴', PEN: '🇵🇪', CLP: '🇨🇱',
  ARS: '🇦🇷', UAH: '🇺🇦', ILS: '🇮🇱', KWD: '🇰🇼',
  SAR: '🇸🇦', QAR: '🇶🇦', OMR: '🇴🇲', BHD: '🇧🇭',
  VND: '🇻🇳', PKR: '🇵🇰', NGN: '🇳🇬', EGP: '🇪🇬',
};