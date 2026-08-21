// hooks/index.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService, creditService, p2pService, earnService, loanService } from '@/services';
import { moonpayService } from '@/services/moonpayService';
import type {
  BuyQuoteParams,
  SellQuoteParams,
  BuyTransactionParams,
  SellTransactionParams,
} from '@/services/moonpayService';

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const queryKeys = {
  wallet: {
    balance: ['wallet', 'balance'] as const,
    assets:  ['wallet', 'assets']  as const,
  },

  credit: {
    position:     ['credit', 'position'] as const,
    transactions: (page: number) => ['credit', 'transactions', page] as const,
  },

  p2p: {
    market: (asset?: string, side?: string) => ['p2p', 'market', asset, side] as const,
    orders: (status?: string)               => ['p2p', 'orders', status]      as const,
    myAds:  ['p2p', 'ads', 'mine']          as const,
  },

  earn: {
    products:  (type?: string) => ['earn', 'products', type] as const,
    positions: ['earn', 'positions']                         as const,
  },

  loans: {
    positions: ['loans', 'positions'] as const,
  },

  // ✅ MoonPay query keys - ab sahi jagah hai
  moonpay: {
    buyQuote:         (params: object) => ['moonpay', 'buyQuote',  params] as const,
    sellQuote:        (params: object) => ['moonpay', 'sellQuote', params] as const,
    currencies:       ['moonpay', 'currencies']       as const,
    fiatCurrencies:   ['moonpay', 'fiatCurrencies']   as const,
    cryptoCurrencies: ['moonpay', 'cryptoCurrencies'] as const,
    countries:        ['moonpay', 'countries']        as const,
    transaction:      (id: string) => ['moonpay', 'transaction', id] as const,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ─── CREDIT ───────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useCreditPosition() {
  return useQuery({
    queryKey: queryKeys.credit.position,
    queryFn:  creditService.getPosition,
    staleTime: 60_000,
  });
}

export function useCreditTransactions(page = 1) {
  return useQuery({
    queryKey: queryKeys.credit.transactions(page),
    queryFn:  () => creditService.getTransactions(page),
  });
}

export function useRepayCredit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => creditService.repay(amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.credit.position });
      qc.invalidateQueries({ queryKey: ['credit', 'transactions'] });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── P2P ──────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useP2PMarket(asset?: string, side?: string) {
  return useQuery({
    queryKey: queryKeys.p2p.market(asset, side),
    queryFn:  () => p2pService.getMarketOffers(asset, side),
    staleTime: 15_000,
  });
}

export function useMyP2POrders(status?: string) {
  return useQuery({
    queryKey: queryKeys.p2p.orders(status),
    queryFn:  () => p2pService.getMyOrders(status),
  });
}

export function useMyP2PAds() {
  return useQuery({
    queryKey: queryKeys.p2p.myAds,
    queryFn:  p2pService.getMyAds,
  });
}

export function useCreateP2POrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, amount }: { offerId: string; amount: number }) =>
      p2pService.createOrder(offerId, amount),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['p2p'] }),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── EARN ─────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useEarnProducts(type?: 'flexible' | 'fixed') {
  return useQuery({
    queryKey: queryKeys.earn.products(type),
    queryFn:  () => earnService.getProducts(type),
    staleTime: 5 * 60_000,
  });
}

export function useEarnPositions() {
  return useQuery({
    queryKey: queryKeys.earn.positions,
    queryFn:  earnService.getPositions,
    staleTime: 60_000,
  });
}

export function useSubscribeEarn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, amount }: { productId: string; amount: number }) =>
      earnService.subscribe(productId, amount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.earn.positions });
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOANS ────────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function useLoanPositions() {
  return useQuery({
    queryKey: queryKeys.loans.positions,
    queryFn:  loanService.getPositions,
    staleTime: 30_000,
  });
}

export function useBorrow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (p: {
      collateralAssetId: string;
      collateralAmount:  number;
      borrowAmount:      number;
      borrowAsset:       string;
    }) => loanService.borrow(
      p.collateralAssetId,
      p.collateralAmount,
      p.borrowAmount,
      p.borrowAsset
    ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.loans.positions });
      qc.invalidateQueries({ queryKey: queryKeys.wallet.balance });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MOONPAY ──────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Live buy quote - fiat se crypto kitna milega
 * Auto-fetch jab amount >= 20 aur currencyCode available ho
 */
export function useMoonPayBuyQuote(params: BuyQuoteParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moonpay.buyQuote(params),
    queryFn:  async () => {
      const res = await moonpayService.getBuyQuote(params) as any;
      return res?.data ?? res;
    },
    enabled:   enabled && !!params.currencyCode && params.amount >= 20,
    staleTime: 30_000, // 30 sec - price change hota hai
    retry:     1,
  });
}

/**
 * Live sell quote - crypto se fiat kitna milega
 */
export function useMoonPaySellQuote(params: SellQuoteParams, enabled = true) {
  return useQuery({
    queryKey: queryKeys.moonpay.sellQuote(params),
    queryFn:  async () => {
      const res = await moonpayService.getSellQuote(params) as any;
      return res?.data ?? res;
    },
    enabled:   enabled && !!params.currencyCode && params.amount > 0,
    staleTime: 30_000,
    retry:     1,
  });
}

/**
 * Buy transaction - signed MoonPay widget URL create karo
 * ✅ email + walletAddress backend se auto-inject hoga
 * Frontend se sirf: currencyCode, chainId, assetId, amount
 */
export function useCreateBuyTransaction() {
  return useMutation({
    mutationFn: (params: BuyTransactionParams) =>
      moonpayService.createBuyTransaction(params),
    onError: (err: any) => {
      console.error(
        '[MoonPay] Buy transaction error:',
        err?.parsed?.message ?? err.message
      );
    },
  });
}

/**
 * Sell transaction - signed MoonPay widget URL create karo
 */
export function useCreateSellTransaction() {
  return useMutation({
    mutationFn: (params: SellTransactionParams) =>
      moonpayService.createSellTransaction(params),
    onError: (err: any) => {
      console.error(
        '[MoonPay] Sell transaction error:',
        err?.parsed?.message ?? err.message
      );
    },
  });
}

/**
 * Supported crypto currencies - dropdown ke liye
 */
export function useMoonPayCryptoCurrencies() {
  return useQuery({
    queryKey: queryKeys.moonpay.cryptoCurrencies,
    queryFn:  async () => {
      const res = await moonpayService.getSupportedCryptoCurrencies() as any;
      return res?.data ?? res;
    },
    staleTime: 10 * 60_000, // 10 min - currencies rarely change
  });
}

/**
 * Supported fiat currencies
 */
export function useMoonPayFiatCurrencies() {
  return useQuery({
    queryKey: queryKeys.moonpay.fiatCurrencies,
    queryFn:  async () => {
      const res = await moonpayService.getSupportedFiatCurrencies() as any;
      return res?.data ?? res;
    },
    staleTime: 10 * 60_000,
  });
}

/**
 * Supported countries
 */
export function useMoonPayCountries() {
  return useQuery({
    queryKey: queryKeys.moonpay.countries,
    queryFn:  async () => {
      const res = await moonpayService.getSupportedCountries() as any;
      return res?.data ?? res;
    },
    staleTime: 30 * 60_000, // 30 min
  });
}

/**
 * Transaction detail by ID - webhook ke baad status check
 */
export function useMoonPayTransaction(transactionId: string) {
  return useQuery({
    queryKey: queryKeys.moonpay.transaction(transactionId),
    queryFn:  async () => {
      const res = await moonpayService.getTransaction(transactionId) as any;
      return res?.data ?? res;
    },
    enabled:   !!transactionId,
    staleTime: 10_000, // 10 sec - status change ho sakta hai
    refetchInterval: (query) => {
      // ✅ Pending status mein auto-refetch karo
      const status = (query.state.data as any)?.status;
      if (status === 'pending' || status === 'waitingPayment') {
        return 10_000; // har 10 sec
      }
      return false; // completed/failed pe stop
    },
  });
}

// ─── Export Types ──────────────────────────────────────────────────────────────
export type {
  BuyQuoteParams,
  SellQuoteParams,
  BuyTransactionParams,
  SellTransactionParams,
};