import { get, post } from './apiClient';
import type {
  WalletBalance, CreditPosition, CreditTransaction,
  P2POffer, P2POrder, EarnProduct, EarnPosition, LoanPosition,
  ApiResponse, PaginatedResponse,
} from '@/types';

export const walletService = {
  getBalance: () => get<ApiResponse<WalletBalance>>('/wallet/balance'),
  getAssets:  () => get<ApiResponse<WalletBalance['assets']>>('/wallet/assets'),
};

export const creditService = {
  getPosition:     () => get<ApiResponse<CreditPosition>>('/credit/position'),
  getTransactions: (page = 1, limit = 20) => get<PaginatedResponse<CreditTransaction>>('/credit/transactions', { page, limit }),
  repay:           (amount: number) => post<ApiResponse<CreditTransaction>>('/credit/repay', { amount }),
  addCollateral:   (assetId: string, amount: number) => post<ApiResponse<CreditPosition>>('/credit/collateral', { assetId, amount }),
};

export const p2pService = {
  getMarketOffers: (asset?: string, side?: string, page = 1) => get<PaginatedResponse<P2POffer>>('/p2p/offers', { asset, side, page }),
  getMyOrders:     (status?: string) => get<ApiResponse<P2POrder[]>>('/p2p/orders/mine', { status }),
  getMyAds:        () => get<ApiResponse<P2POffer[]>>('/p2p/ads/mine'),
  createOrder:     (offerId: string, amount: number) => post<ApiResponse<P2POrder>>('/p2p/orders', { offerId, amount }),
  createAd:        (payload: Partial<P2POffer>) => post<ApiResponse<P2POffer>>('/p2p/ads', payload),
};

export const earnService = {
  getProducts:  (type?: 'flexible' | 'fixed') => get<ApiResponse<EarnProduct[]>>('/earn/products', { type }),
  getPositions: () => get<ApiResponse<EarnPosition[]>>('/earn/positions'),
  subscribe:    (productId: string, amount: number) => post<ApiResponse<EarnPosition>>('/earn/subscribe', { productId, amount }),
  redeem:       (positionId: string) => post<ApiResponse<void>>('/earn/redeem', { positionId }),
};

export const loanService = {
  getPositions:  () => get<ApiResponse<LoanPosition[]>>('/loans/positions'),
  borrow:        (collateralAssetId: string, collateralAmount: number, borrowAmount: number, borrowAsset: string) =>
    post<ApiResponse<LoanPosition>>('/loans/borrow', { collateralAssetId, collateralAmount, borrowAmount, borrowAsset }),
  repay:         (positionId: string, amount: number) => post<ApiResponse<LoanPosition>>('/loans/repay', { positionId, amount }),
  addCollateral: (positionId: string, amount: number) => post<ApiResponse<LoanPosition>>('/loans/collateral', { positionId, amount }),
};
