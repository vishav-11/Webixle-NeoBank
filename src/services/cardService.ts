/**
 * cardService.ts
 * All Card API calls following the p2pService pattern.
 * Uses safe response unwrapping — never throws on missing data keys.
 */

import { api } from '@/services/apiClient';
import { ENDPOINTS } from './endpoints';
import type {
  CardListResponse,
  CardDetail,
  CardTransaction,
  TransactionListResponse,
  TransactionDetail,
  CardLimitItem,
  CardPanResponse,
  CardPinResponse,
  CreateCardPayload,
  TopupPayload,
  ActivateCardPayload,
  TransactionHistoryPayload,
  AuthorisePayload,
  BindCardPayload,
  CardFeeItem,
  RefundRequestPayload,
  KycQueryResponse,
  KycUrlResponse,
  Country,
  CreateDocumentFilePayload,
  CreateDocumentFileResponse,
} from '../types/cardTypes';

// ─── Helpers ──────────────────────────────────────────────────────────────────
// api already returns r.data. Backend may still wrap in { data: T },
// so unwrap handles: { data: T } → T   or   T → T

function unwrap<T>(res: any): T {
  if (res !== null && typeof res === 'object' && 'data' in res) {
    return res.data as T;
  }
  return res as T;
}

function toCardList(raw: any): CardListResponse {
  // handle both: { data: { list, total, pages } } and { list, total, pages }
  const d = (raw !== null && typeof raw === 'object' && 'data' in raw) ? raw.data : raw;
  return {
    total: d?.total ?? 0,
    pages: d?.pages ?? 0,
    list:  Array.isArray(d?.list) ? d.list : [],
  };
}

function toTransactionList(raw: any): TransactionListResponse {
  const d = (raw !== null && typeof raw === 'object' && 'data' in raw) ? raw.data : raw;
  return {
    total: d?.total ?? 0,
    pages: d?.pages ?? 0,
    list:  Array.isArray(d?.list) ? d.list : [],
  };
}

function toArray<T>(raw: any): T[] {
  const d = (raw !== null && typeof raw === 'object' && 'data' in raw) ? raw.data : raw;
  return Array.isArray(d) ? d : [];
}

// ─── Service ──────────────────────────────────────────────────────────────────

const cardService = {

  // ── KYC & Onboarding ───────────────────────────────────────────────────────

  createUser: async (): Promise<void> => {
    await api.post(ENDPOINTS.CARD.CREATE_USER, {});
  },

  queryUser: async (userCode?: string): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.QUERY_USER, userCode ? { userCode } : {})),

  queryKyc: async (): Promise<KycQueryResponse> =>
    unwrap<KycQueryResponse>(await api.post(ENDPOINTS.CARD.QUERY_KYC, {})),

  getKycUrl: async (): Promise<KycUrlResponse> =>
    unwrap<KycUrlResponse>(await api.post(ENDPOINTS.CARD.GET_KYC_URL, {})),

  submitKyc: async (): Promise<void> => {
    await api.post(ENDPOINTS.CARD.SUBMIT_KYC, {});
  },

  submitKycV2: async (): Promise<void> => {
    await api.post(ENDPOINTS.CARD.SUBMIT_KYC_V2, {});
  },

  /**
   * Submit KYC with document images — uses api.postForm (multipart/form-data).
   * api.postForm is the correct method for FormData in your apiClient.
   */
  submitKycWithDocs: async (formData: FormData): Promise<void> => {
    await api.postForm(ENDPOINTS.CARD.SUBMIT_KYC, formData);
  },

  getLivenessStatus: async (): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.LIVENESS_STATUS, {})),

  simulateKyc: async (passOrNot: string): Promise<void> => {
    await api.post(ENDPOINTS.CARD.SIMULATE_KYC, { passOrNot });
  },

  createDocumentFile: async (
    payload: CreateDocumentFilePayload,
  ): Promise<CreateDocumentFileResponse> =>
    unwrap<CreateDocumentFileResponse>(
      await api.post(ENDPOINTS.CARD.CREATE_DOCUMENT_FILE, payload),
    ),

  /**
   * Upload document file — uses api.postForm.
   */
  uploadDocumentFile: async (formData: FormData): Promise<void> => {
    await api.postForm(ENDPOINTS.CARD.UPLOAD_DOCUMENT_FILE, formData);
  },

  /**
   * Get countries list.
   * api.get(url, params) — 2nd arg is the params object directly (not {params:...}).
   */
  getCountries: async (search?: string): Promise<Country[]> => {
    // Pass search as a query param via api.get's params argument
    const params = search && search !== 'null' ? { search } : undefined;
    const res = await api.get(ENDPOINTS.CARD.COUNTRIES, params);
    return toArray<Country>(res);
  },

  // ── Card CRUD ──────────────────────────────────────────────────────────────

  createCard: async (payload: CreateCardPayload): Promise<void> => {
    await api.post(ENDPOINTS.CARD.CREATE_CARD, payload);
  },

  getCardList: async (page = '1', limit = '50'): Promise<CardListResponse> =>
    toCardList(await api.post(ENDPOINTS.CARD.CARD_LIST, { page, limit })),

  getCardDetail: async (cardId: string): Promise<CardDetail> =>
    unwrap<CardDetail>(await api.post(ENDPOINTS.CARD.CARD_DETAILS, { cardId })),

  getCardPan: async (cardId: string): Promise<CardPanResponse> =>
    unwrap<CardPanResponse>(await api.post(ENDPOINTS.CARD.CARD_PAN, { cardId })),

  getCardPin: async (cardId: string): Promise<CardPinResponse> =>
    unwrap<CardPinResponse>(await api.post(ENDPOINTS.CARD.CARD_PIN, { cardId })),

  getCardLimit: async (cardId: string): Promise<CardLimitItem> => {
    const res = unwrap<any>(await api.post(ENDPOINTS.CARD.CARD_LIMIT, { cardId }));
    // Backend returns array — take first item
    return Array.isArray(res) ? res[0] : res;
  },

  queryCardFee: async (cardId: string): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.QUERY_CARD_FEE, { cardId })),

  // ── Card Actions ───────────────────────────────────────────────────────────

  activateCard: async (payload: ActivateCardPayload): Promise<void> => {
    await api.post(ENDPOINTS.CARD.ACTIVATE, payload);
  },

  freezeCard: async (cardId: string): Promise<void> => {
    await api.post(ENDPOINTS.CARD.FREEZE, { cardId });
  },

  unfreezeCard: async (cardId: string): Promise<void> => {
    await api.post(ENDPOINTS.CARD.UNFREEZE, { cardId });
  },

  closeCard: async (cardId: string): Promise<void> => {
    await api.post(ENDPOINTS.CARD.CLOSE, { cardId });
  },

  updatePhone: async (
    cardId: string,
    dialCode: string,
    phoneNumber: string,
  ): Promise<void> => {
    await api.post(ENDPOINTS.CARD.UPDATE_PHONE, { cardId, dialCode, phoneNumber });
  },

  updateEmail: async (cardId: string, email: string): Promise<void> => {
    await api.post(ENDPOINTS.CARD.UPDATE_EMAIL, { cardId, email });
  },

  // ── Transactions ───────────────────────────────────────────────────────────

  /**
   * Named getTransactionHistory — matches useCard hook call.
   */
  getTransactionHistory: async (
    payload: TransactionHistoryPayload,
  ): Promise<TransactionListResponse> =>
    toTransactionList(await api.post(ENDPOINTS.CARD.TRANSACTIONS, payload)),

  getTransactionDetail: async (orderId: string): Promise<TransactionDetail> =>
    unwrap<TransactionDetail>(
      await api.post(ENDPOINTS.CARD.TRANSACTION_DETAIL, { orderId }),
    ),

  // ── Funding ────────────────────────────────────────────────────────────────

  topupCard: async (payload: TopupPayload): Promise<void> => {
    await api.post(ENDPOINTS.CARD.TOPUP, payload);
  },

  requestRefund: async (payload: RefundRequestPayload): Promise<void> => {
    await api.post(ENDPOINTS.CARD.REFUND_REQUEST, payload);
  },

  /**
   * Get disputes.
   * api.get(url, params) — pass the params object directly.
   */
  getDisputes: async (
    page: number,
    limit: number,
    status: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<any> => {
    const params: Record<string, any> = { page, limit, status };
    if (fromDate) params.fromDate = fromDate;
    if (toDate)   params.toDate   = toDate;
    // api.get returns r.data already — no extra unwrap needed
    return api.get(ENDPOINTS.CARD.GET_DISPUTES, params);
  },

  getPrefundBalance: async (): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.PREFUND_BALANCE, {})),

  // ── Trade ──────────────────────────────────────────────────────────────────

  authoriseTrade: async (payload: AuthorisePayload): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.AUTHORISE, payload)),

  trigger3DS: async (orderId: string): Promise<any> =>
    unwrap(await api.post(ENDPOINTS.CARD.TRIGGER_3DS, { orderId })),

  // ── Admin ──────────────────────────────────────────────────────────────────

  admin: {
    getCardDetail: async (cardId: string): Promise<any> =>
      unwrap(await api.post(ENDPOINTS.CARD.ADMIN.DETAILS, { cardId })),

    adjustBalance: async (cardId: string, amount: string): Promise<void> => {
      await api.post(ENDPOINTS.CARD.ADMIN.ADJUST_BALANCE, { cardId, amount });
    },

    bindCard: async (payload: BindCardPayload): Promise<void> => {
      await api.post(ENDPOINTS.CARD.ADMIN.BIND_CARD, payload);
    },

    setCardFee: async (
      cardId: string,
      cardFeeConfigList: CardFeeItem[],
    ): Promise<void> => {
      await api.post(ENDPOINTS.CARD.ADMIN.SET_CARD_FEE, {
        cardId,
        cardFeeConfigList,
      });
    },

    queryCardFee: async (cardId: string): Promise<any> =>
      unwrap(await api.post(ENDPOINTS.CARD.ADMIN.QUERY_CARD_FEE, { cardId })),
  },
};

export default cardService;