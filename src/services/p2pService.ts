/**
 * p2pService.ts
 * All P2P API calls with safe response unwrapping.
 */

import { api } from "@/services/apiClient";
import { ENDPOINTS } from "@/services/endpoints";
import type {
  P2PAd,
  P2PAdListResponse,
  P2POrder,
  P2POrderDetail,
  P2PDisputeDetail,
  SLADashboardData,
  CreateAdPayload,
  UpdateAdPayload,
  PlaceOrderPayload,
  RateSellerPayload,
  RaiseDisputePayload,
  P2PListAdsParams,
  P2PChainAsset,
  P2PTradeRequest,
} from "@/types/p2pTypes";

// helpers
function unwrap<T>(res: any): T {
  return (res?.data !== undefined ? res.data : res) as T;
}

function toAdList(raw: any): P2PAdListResponse {
  const d = raw?.data !== undefined ? raw.data : raw;
  if (Array.isArray(d))
    return { page: 1, limit: d.length, total: d.length, totalData: d.length, totalPage: 1, ads: d };
  return {
    page: d?.page ?? 1,
    limit: d?.limit ?? 10,
    totalData: d?.totalData ?? 0,
    totalPage: d?.totalPage ?? 0,
    total: d?.total ?? 0,
    ads: Array.isArray(d?.ads) ? d.ads : [],
  };
}

function toOrderArray(raw: any): P2POrder[] {
  const d = raw?.data !== undefined ? raw.data : raw;
  return Array.isArray(d) ? d : (d?.orders ?? d?.data ?? []);
}

function toTradeRequestArray(raw: any): P2PTradeRequest[] {
  const d = raw?.data !== undefined ? raw.data : raw;
  return Array.isArray(d) ? d : (d?.data ?? []);
}

const p2pService = {
  listAds: async (params?: P2PListAdsParams): Promise<P2PAdListResponse> =>
    toAdList(await api.get(ENDPOINTS.P2P.LIST_ADS, params)),
  myAds: async (): Promise<P2PAdListResponse> =>
    toAdList(await api.get(ENDPOINTS.P2P.MY_ADS)),
  myOrders: async (): Promise<P2POrder[]> =>
    toOrderArray(await api.get(ENDPOINTS.P2P.MY_ORDERS)),
  orderDetail: async (id: string): Promise<P2POrderDetail> =>
    unwrap(await api.get(ENDPOINTS.P2P.ORDER_DETAIL(id))),
  assetsByChain: async (chainId: string): Promise<P2PChainAsset[]> => {
    const d = unwrap<any>(
      await api.get(ENDPOINTS.WALLET.GET_ASSETS_BY_CHAIN, { chainId }),
    );
    return Array.isArray(d) ? d : [];
  },
  createAd: async (body: CreateAdPayload): Promise<P2PAd> =>
    unwrap(await api.post(ENDPOINTS.P2P.CREATE_AD, body)),
  updateAd: async (id: string, body: UpdateAdPayload): Promise<P2PAd> =>
    unwrap(await api.patch(ENDPOINTS.P2P.UPDATE_AD(id), body)),
  deleteAd: async (id: string): Promise<void> => {
    await api.delete(ENDPOINTS.P2P.DELETE_AD(id), {});
  },
  // placeOrder:   async (body: PlaceOrderPayload): Promise<P2POrder>  => unwrap(await api.post(ENDPOINTS.P2P.PLACE_ORDER, body)),
  cancelOrder: async (id: string, reason?: string): Promise<P2POrder> =>
    unwrap(
      await api.post(ENDPOINTS.P2P.CANCEL_ORDER(id), { cancelReason: reason }),
    ),
  markFiatSent: async (id: string, proof?: string): Promise<P2POrder> =>
    unwrap(await api.post(ENDPOINTS.P2P.MARK_FIAT_SENT(id), { proof })),
  releaseOrder: async (id: string): Promise<P2POrder> =>
    unwrap(await api.post(ENDPOINTS.P2P.RELEASE_ORDER(id), {})),
  rateSeller: async (
    orderId: string,
    body: RateSellerPayload,
  ): Promise<void> => {
    await api.post(ENDPOINTS.P2P.RATE_SELLER(orderId), body);
  },
  raiseDispute: async (
    orderId: string,
    body: RaiseDisputePayload,
  ): Promise<P2PDisputeDetail> =>
    unwrap(await api.post(ENDPOINTS.P2P.RAISE_DISPUTE(orderId), body)),
  disputeDetail: async (id: string): Promise<P2PDisputeDetail> =>
    unwrap(await api.get(ENDPOINTS.P2P.DISPUTE_DETAIL(id))),
  slaDashboard: async (): Promise<SLADashboardData> =>
    unwrap(await api.get(ENDPOINTS.P2P.SLA_DASHBOARD)),
  tradeRequest: async (body: PlaceOrderPayload): Promise<P2POrder> =>
    unwrap(await api.post(ENDPOINTS.P2P.TRADE_REQUEST, body)),
  myTradeRequests: async (): Promise<P2PTradeRequest[]> =>
    toTradeRequestArray(await api.get(ENDPOINTS.P2P.MY_TRADE_REQUESTS)),
  placeOrder: async (body: PlaceOrderPayload): Promise<P2POrder> =>
    unwrap(await api.post(ENDPOINTS.P2P.TRADE_REQUEST, body)),
};

export default p2pService;
