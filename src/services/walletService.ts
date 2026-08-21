import { api } from './apiClient';
import { ENDPOINTS } from './endpoints';

export const walletService = {

  getDashboard: () =>
    api.get(ENDPOINTS.WALLET.GET_DASHBOARD),

  getAllWallets: () =>
    api.get(ENDPOINTS.WALLET.GET_ALL_WALLETS),

  getBalance: (chain?: string) =>
    api.get(
      ENDPOINTS.WALLET.GET_ASSET_BALANCE_BASE,
      chain ? { chain: chain?.toLowerCase() === 'trx' ? 'TRON' : chain } : undefined
    ),

getWalletBalance: (chainId: string, assetId: string) =>
  api.get(
    ENDPOINTS.WALLET.GET_WALLET_BALANCE(
      chainId?.toLowerCase() === 'trx' ? 'TRON' : chainId,
      assetId
    )
  ),
getAssetsByChain: (chainId: string) =>
  api.get(
    ENDPOINTS.WALLET.GET_ASSETS_BY_CHAIN,
    {
      chainId: chainId?.toLowerCase() === 'trx' ? 'TRON' : chainId
    }
  ),
getAssetsList:()=>
  api.get(ENDPOINTS.WALLET.GET_ASSET_LIST)
,

  getDepositAddress: (assetId: string, chainId: string) =>
    api.get(
      ENDPOINTS.WALLET.GET_DEPOSIT_ADDRESS,
      { assetId, chainId: chainId?.toLowerCase() === 'trx' ? 'TRON' : chainId }
    ),

  getTransactionHistory: (page = 1, limit = 20) =>
    api.get(
      ENDPOINTS.WALLET.TRANSACTION_HISTORY,
      { page, limit }
    ),

  getTransactionDetail: (id: string) =>
    api.get(
      ENDPOINTS.WALLET.TRANSACTION_DETAIL(id)
    ),

sendToUser: (payload: {
  to: string;
  amount: number;
  assetId: string;
  chainId: string;
}) =>
  api.post(
    ENDPOINTS.WALLET.SEND_TO_USER,
    {
      ...payload,
      chainId:
        payload.chainId?.toLowerCase() === 'trx'
          ? 'TRON'
          : payload.chainId,
    }
  ),

withdraw: (payload: {
  toAddress: string;
  amount: number;
  assetId: string;
  chainId: string;
  network: string;
}) =>
  api.post(
    ENDPOINTS.WALLET.WITHDRAW_CRYPTO,
    {
      ...payload,
      chainId:
        payload.chainId?.toLowerCase() === 'trx'
          ? 'TRON'
          : payload.chainId,
    }
  ),

  getSupportedBlockchains: () =>
    api.get(
      ENDPOINTS.WALLET.GET_SUPPORTED_BLOCKCHAINS
    ),
  verifyPin: (payload: {}) =>
  api.post(ENDPOINTS.PIN.VERIFY_PIN, payload),
  
};