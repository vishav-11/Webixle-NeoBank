import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletService } from '@/services/walletService';

// ─── Types (hook file mein define karo) ──────────────────────────────────────
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

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const WALLET_KEYS = {
  all:          ['wallet'] as const,
  dashboard:    ['wallet', 'dashboard'] as const,
  wallets:      ['wallet', 'all-wallets'] as const,
  balance:      (chain?: string) => ['wallet', 'balance', chain] as const,
  assets:       (chainId: string) => ['wallet', 'assets', chainId] as const,
  transactions: (page: number, limit: number) =>
    ['wallet', 'transactions', page, limit] as const,
  transaction:  (id: string) => ['wallet', 'transaction', id] as const,
  blockchains:  ['wallet', 'blockchains'] as const,
};

// ─── Dashboard Hook — properly typed ─────────────────────────────────────────
export function useWalletDashboard() {
  return useQuery<DashboardData>({
    queryKey: WALLET_KEYS.dashboard,
    queryFn: async () => {
      const res = await walletService.getDashboard() as any;
      // API response normalize: { data: {...} } ya directly {...}
      const data = res?.data ?? res;
      return data as DashboardData;
    },
    staleTime:       30_000,
    refetchInterval: 60_000,
  });
}

// ─── All Wallets Hook ─────────────────────────────────────────────────────────
export function useAllWallets() {
  return useQuery({
    queryKey: WALLET_KEYS.wallets,
    queryFn: async () => {
      const res = await walletService.getAllWallets() as any;
      return res?.data ?? res;
    },
  });
}

// ─── Balance Hook ─────────────────────────────────────────────────────────────
export function useBalance(chain?: string) {
  return useQuery({
    queryKey: WALLET_KEYS.balance(chain),
    queryFn: async () => {
      const res = await walletService.getBalance(chain) as any;
      return res?.data ?? res;
    },
  });
}

// ─── Assets By Chain ──────────────────────────────────────────────────────────
export function useAssetsByChain(chainId: string) {
  return useQuery({
    queryKey: WALLET_KEYS.assets(chainId),
    queryFn: async () => {
      const res = await walletService.getAssetsByChain(chainId) as any;
      return res?.data ?? res;
    },
    enabled: !!chainId,
  });
}

// ─── Transaction History Hook ─────────────────────────────────────────────────
export function useTransactionHistory(page = 1, limit = 20) {
  return useQuery({
    queryKey: WALLET_KEYS.transactions(page, limit),
    queryFn: async () => {
      const res = await walletService.getTransactionHistory(page, limit) as any;
      return res?.data ?? res;
    },
    placeholderData: (prev) => prev,
  });
}

// ─── Transaction Detail Hook ──────────────────────────────────────────────────
export function useTransactionDetail(id: string) {
  return useQuery({
    queryKey: WALLET_KEYS.transaction(id),
    queryFn: async () => {
      const res = await walletService.getTransactionDetail(id) as any;
      return res?.data ?? res;
    },
    enabled: !!id,
  });
}

// ─── Supported Blockchains ────────────────────────────────────────────────────
export function useSupportedBlockchains() {
  return useQuery({
    queryKey: WALLET_KEYS.blockchains,
    queryFn: async () => {
      const res = await walletService.getSupportedBlockchains() as any;
      return res?.data ?? res;
    },
    staleTime: 5 * 60_000,
  });
}

// ─── Send Mutation ────────────────────────────────────────────────────────────
export function useSendToUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      to: string;
      amount:    number;
      assetId:     string;
      chainId:     string;
    }) => walletService.sendToUser(payload) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.wallets });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });
}

// ─── Withdraw Mutation ────────────────────────────────────────────────────────
export function useWithdraw() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      toAddress: string;
      amount:    number;
      assetId:     string;
      chainId:     string;
      network:   string;
    }) => walletService.withdraw(payload) as Promise<any>,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: WALLET_KEYS.dashboard });
      queryClient.invalidateQueries({ queryKey: ['wallet', 'transactions'] });
    },
  });
}