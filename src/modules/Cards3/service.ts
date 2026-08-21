// CardModule/service.ts
// Talks to the REAL interlaceCard backend routes (cardRoutes.js +
// occupation.routes.js). Every backend response is double-wrapped:
//   1. Our controller always does  res.json({ success, message, data })
//   2. `data` itself is `response.data` straight from axios → Interlace's
//      OWN envelope (their `code`/`data` wrapper), NOT unwrapped again.
// So the real payload is usually 2 levels deep. `unwrap()` below digs
// through `.data` safely so this module still works whether your app's
// apiClient already strips the outer `{success,message,data}` envelope or
// not. Once the backend is live, console.log one real response per call
// and adjust the `map*` functions — nothing else needs to change.

import { api } from '@/services/apiClient';
import { Platform } from 'react-native';
import {
  CARD_ENDPOINTS,
  MOCK_CARDS,
  MOCK_REVEAL,
  MOCK_SUMMARY,
  MOCK_BINS,
  MOCK_OCCUPATIONS,
  MOCK_BUDGETS,
  MOCK_ACCESS_TOKEN,
  MOCK_TRANSACTION_SCENARIOS,
  MOCK_NEGATIVE_BALANCE_CARDS,
  CARDHOLDER_TIER_DEFAULT,
  MOCK_TRANSACTIONS,
} from './constants';
import type {
  CardInfo,
  CardDesign,
  CardListResponse,
  CardRevealResponse,
  CardSummaryResponse,
  CardActionResponse,
  UpdateCardPayload,
  InterlaceAccount,
  InterlaceKycStatus,
  SubmitAccountKycPayload,
  KycVerificationResult,
  UploadedFile,
  OccupationOption,
  CardBin,
  CreateCardholderPayload,
  CardholderInfo,
  CreateCardPayload,
  Budget,
  CreateBudgetPayload,
  CreateBudgetCardPayload,
  CardStatus,
  UpdateCardPinPayload,
  CardAccessTokenResponse,
  CardTransactionScenario,
  SetTransactionScenariosPayload,
  NegativeBalanceCard,
  NegativeBalanceQuery,
  BatchDeleteCardsPayload,
  CardTransaction,
  TransferPayload,
  CardTransactionsQuery,
  CardTransactionsResponse,
} from './types';

// Digs through nested `.data` wrappers (our envelope + Interlace's own)
// without throwing if a level is missing.
function unwrap(res: any): any {
  let cur = res;
  for (let i = 0; i < 3; i++) {
    if (cur && typeof cur === 'object' && 'data' in cur && cur.data !== undefined) {
      cur = cur.data;
    } else {
      break;
    }
  }
  return cur;
}

// Some errors are meaningful STATE, not failures — the KYC/no-account
// screens key off these exact backend messages (see card.service.js),
// so surface them instead of silently mocking on every call.
function backendMessage(err: any): string | undefined {
  return err?.response?.data?.message ?? err?.message;
}

// Client-side handle for a single "create this card" attempt. Interlace's
// docs mark `referenceId` as required on POST /cards/prepaid, but our
// backend doesn't generate one for you (unlike `idempotencyKey`, which it
// does auto-generate) — so we always send one from here. Swap this for
// `expo-crypto`'s `randomUUID()` if that's available in your Expo SDK;
// this is just a guaranteed-available fallback.
function generateReferenceId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// mapRawCard (defined further down, used by getCards) is the single
// source of truth for the real card shape — reuse it here instead of
// keeping a second, stale mapper with fields (`lastFour`, `pan`,
// `formFactor`) that don't exist on Interlace's actual response.
function mapCard(raw: any): CardInfo {
  return mapRawCard(raw);
}

function mapReveal(raw: any): CardRevealResponse {
  return {
    fullNumber: raw?.pan ?? raw?.fullNumber ?? '',
    expiryMonth: raw?.expMonth ?? raw?.expiryMonth ?? '',
    expiryYear: raw?.expYear ?? raw?.expiryYear ?? '',
    cvv: raw?.cvv ?? '',
  };
}

function mapSummary(raw: any, cardId: string): CardSummaryResponse {
  return {
    cardId,
    balance: raw?.balance ?? raw?.availableBalance ?? '0',
    currency: raw?.currency,
    availableToSpend: raw?.availableToSpend,
  };
}

function mapBin(raw: any): CardBin {
  return {
    binId: raw?.id ?? raw?.binId,
    bin: raw?.bin,
    type: raw?.type,
    currencies: raw?.currencies ?? (raw?.currency ? [raw.currency] : []),
    network: raw?.network ?? raw?.scheme ?? 'VISA',
    countryRegion: raw?.countryRegion ?? raw?.country ?? '',
    verification: raw?.verification ?? { avs: false, threeDs: false },
    purchaseLimit: raw?.purchaseLimit ?? { day: '/', single: '/', lifetime: '/' },
    supportPhysicalCard: raw?.supportPhysicalCard ?? false,
    extend: raw?.extend,
  };
}
// card.service.js

function mapBudget(raw: { balance: any; id: any; name: any; status: any; currency: any; }) {
  // balance can be a primitive OR a nested object like
  // { id, available, currency }
  const balanceObj = raw.balance;
  const isObject = balanceObj !== null && typeof balanceObj === 'object';

  return {
    id:       raw.id,
    name:     raw.name,
    status:   raw.status ?? 'ACTIVE',
    // Flatten to primitives so nothing downstream ever sees an object
    balance:  isObject
                ? parseFloat(balanceObj.available ?? '0')
                : (raw.balance ?? null),
    currency: isObject
                ? (balanceObj.currency ?? 'USD')
                : (raw.currency ?? 'USD'),
  };
}

function mapCardholder(raw: any): CardholderInfo {
  return {
    id: raw?.id ?? raw?.cardholderId,
    accountId: raw?.accountId,
    // NOT `raw?.binId` — that field doesn't exist on the real response.
    // A cardholder can cover several bins; Interlace returns them as
    // `cardBinList`. See types.ts#CardholderInfo for why this matters.
    cardBinList: raw?.cardBinList ?? [],
    status: raw?.status ?? 'PENDING',
    firstName: raw?.firstName,
    lastName: raw?.lastName,
    userName: raw?.userName,
    email: raw?.email,
    phoneCountryCode: raw?.phoneCountryCode,
    phoneNumber: raw?.phoneNumber,
    referenceId: raw?.referenceId,
    dob: raw?.dob,
    nationality: raw?.nationality,
    cardholderTier: raw?.cardholderTier,
    businessModel: raw?.businessModel,
    address: raw?.address,
    createdAt: raw?.createdAt,
  };
}


function mapAccessToken(raw: any): CardAccessTokenResponse {
  return {
    token: raw?.token ?? raw?.accessToken,
    url: raw?.url ?? raw?.iframeUrl ?? raw?.hostedUrl,
    expiresAt: raw?.expiresAt,
    expiresIn: raw?.expiresIn,
    ...raw,
  };
}

function mapScenario(raw: any): CardTransactionScenario {
  return {
    code: raw?.code ?? raw?.scene ?? raw?.id,
    label: raw?.label ?? raw?.name ?? raw?.description,
    description: raw?.description,
    ...raw,
  };
}

function mapNegativeBalanceCard(raw: any): NegativeBalanceCard {
  const last4 = raw?.last4 ?? raw?.lastFour ?? raw?.cardNumber?.slice(-4);
  return {
    cardId: raw?.cardId ?? raw?.id,
    label: raw?.label,
    last4,
    balance: raw?.balance ?? raw?.availableBalance ?? '0',
    currency: raw?.currency ?? 'USD',
    status: raw?.status,
    ...raw,
  };
}

// CardModule/service.ts

function mapRawCard(raw: any): CardInfo {
  // Real fields confirmed from a live GET /cards response — `cardLastFour`
  // and `userName`, NOT `last4`/`cardNumber` or `holderName`/`cardholderName`.
  // There's also no `network` field on a card at all (only on its BIN).
  const last4 = raw.cardLastFour ?? raw.last4 ?? raw.cardNumber?.slice(-4) ?? '****';
  const cardMode: string = raw.cardMode ?? 'VIRTUAL_CARD';
  const isPhysical = cardMode === 'PHYSICAL_CARD';

  const mapped = {
    id:           raw.id ?? raw.cardId ?? '',
    accountId:    raw.accountId,
    cardholderId: raw.cardholderId,
    binId:        raw.binId,
    label:        raw.label,
    status:       (raw.status as CardStatus) ?? 'INACTIVE',
    last4,
    maskedNumber: `**** **** **** ${last4}`,
    network:      raw.network ?? raw.cardBrand ?? 'VISA',
    currency:     raw.currency ?? 'USD',
    holderName:   raw.userName ?? raw.holderName ?? raw.cardholderName ?? '',
    // UI-only fields
    design:       isPhysical ? 'physical_metal' : 'virtual_black',
    tierLabel:    isPhysical ? 'PHYSICAL METAL' : 'VIRTUAL BLACK',
    typeLabel:    isPhysical ? 'PHYSICAL METAL' : 'VIRTUAL BLACK',
    balanceUsd:   raw.balance  ?? undefined,
    // Extra confirmed-real fields
    cardMode:        cardMode,
    bin:             raw.bin,
    cardReferenceId: raw.cardReferenceId,
    balanceId:       raw.balanceId,
    createTime:      raw.createTime,
  } as any;

  return mapped as CardInfo;
}


function mapTransaction(raw: any): CardTransaction {
  return {
    id: raw?.id ?? raw?.transactionId ?? raw?.clientTransactionId ?? '',
    accountId: raw?.accountId,
    cardId: raw?.cardId,
    clientTransactionId: raw?.clientTransactionId,
    type: raw?.type ?? raw?.transactionType,
    status: raw?.status,
    amount: raw?.amount,
    currency: raw?.currency ?? 'USD',
    merchantName: raw?.merchantName ?? raw?.merchant?.name,
    description: raw?.description ?? raw?.remark,
    createTime: raw?.createTime ?? raw?.transactionTime ?? raw?.createdAt,
    ...raw,
  };
}
export const cardService = {
  // ═══════════════════════════════════════════════════════════════
  // ── ACCOUNT ──────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * POST /account/create
   * Requires the user's PLATFORM kyc (user.kycStatus) to already be
   * "Approved" — that's the app's own onboarding KYC, unrelated to the
   * Interlace KYC below. Throws "Complete KYC first" if not, and
   * "Interlace account already exists" if called twice.
   */
  async createAccount(): Promise<InterlaceAccount> {
    const res = await api.post(CARD_ENDPOINTS.createAccount, {});
    const body = unwrap(res);
    return { accountId: body?.accountId, interlaceDisplayId: body?.interlaceDisplayId };
  },

  async getAccounts(params?: { page?: number; limit?: number }) {
    const res = await api.get(CARD_ENDPOINTS.accounts, { params });
    return unwrap(res);
  },

  // ═══════════════════════════════════════════════════════════════
  // ── KYC ──────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** POST /account/submit-kyc — see SubmitAccountKycPayload for the exact required shape. */
  async submitAccountKyc(payload: SubmitAccountKycPayload) {
    const res = await api.post(CARD_ENDPOINTS.submitKyc, payload);
    return unwrap(res);
  },

  /**
   * GET /kyc-verification-result
   * Throws "Interlace KYC is not started." until submitAccountKyc has run
   * once. Poll this (see useKycVerificationResult) after submission.
   */

async getKycVerificationResult(): Promise<KycVerificationResult> {
  const res = await api.get(CARD_ENDPOINTS.kycResult);
  
  // `res` can be unknown (axios response or already-unwrapped body) — coerce for logging
  console.log('[service:kycResult] FULL res.data:', JSON.stringify((res as any)?.data ?? res, null, 2));
  
  const body = unwrap(res);
  
  console.log('[service:kycResult] unwrapped body:', JSON.stringify(body, null, 2));

  // ✅ Sabhi possible nesting patterns handle karo
  const raw = 
    body?.kyc ??           // { kyc: { status: "PASSED" } }
    body?.data?.kyc ??     // { data: { kyc: { status: "PASSED" } } }
    body?.data ??          // { data: { status: "PASSED" } }  ← ADD THIS
    body ??                // { status: "PASSED" }
    {};

  console.log('[service:kycResult] raw after extraction:', JSON.stringify(raw, null, 2));

  const rawStatus = (raw?.status ?? '').toUpperCase();
  
  console.log('[service:kycResult] rawStatus extracted:', rawStatus);

  // ✅ Agar rawStatus empty hai to problem yahan hai
  if (!rawStatus) {
    console.warn('[service:kycResult] ⚠️ rawStatus is EMPTY — wrong nesting path!');
    console.warn('[service:kycResult] body keys:', Object.keys(body ?? {}));
  }

  const normalizedStatus = (() => {
    if (rawStatus === 'PASSED' || rawStatus === 'APPROVED') return 'approved';
    if (rawStatus === 'REJECTED' || rawStatus === 'FAILED' || rawStatus === 'CANCELED') return 'rejected';
    if (rawStatus === 'SUBMITTED' || rawStatus === 'PENDING' || rawStatus === 'IN_PROGRESS') return 'submitted';
    return rawStatus.toLowerCase();
  })();

  console.log('[service:kycResult] FINAL:', { rawStatus, normalizedStatus });

  return {
    ...raw,
    status: normalizedStatus,
    rawStatus,
    caseId: raw?.caseId,
    accountId: raw?.accountId,
    reason: raw?.reason ?? raw?.rejectReason ?? '',
  };
},

  /** POST /upload-file — multipart, field name MUST be "files" (multer .array("files")). */
async uploadFiles(files: { uri: string; name: string; type: string }[]): Promise<UploadedFile[]> {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // ── WEB: uri blob me convert karo, tab append karo
      for (const f of files) {
        const response = await fetch(f.uri);
        const blob = await response.blob();
        const file = new File([blob], f.name, { type: f.type });
        formData.append('files', file);
      }
    } else {
      // ── NATIVE (iOS/Android): RN ka object shape
      files.forEach((f) => {
        // @ts-ignore React Native FormData file shape
        formData.append('files', { uri: f.uri, name: f.name, type: f.type });
      });
    }

   const res = await api.postForm(CARD_ENDPOINTS.uploadFile, formData);

    const body = unwrap(res);
    const list = Array.isArray(body) ? body : body?.files ?? body?.items ?? [];
    return list.map((f: any) => ({
      id: f?.id ?? f?.fileId,
      url: f?.url,
      name: f?.name,
    }));
  } catch (err) {
    throw new Error(backendMessage(err) ?? 'File upload failed. Please try again.');
  }
},

  /** GET /occupations (occupation.routes.js) — dropdown list for the KYC form. */
// CardModule/service.ts

// CardModule/service.ts

async getOccupations(search = '', page = 1): Promise<{
  docs: { code: string; title: string }[];
  totalPages: number;
  page: number;
}> {
  let normalizedSearch = (search ?? '').trim();
  
  if (
    !normalizedSearch || 
    normalizedSearch === 'undefined' || 
    normalizedSearch === 'null'
  ) {
    normalizedSearch = '';
  }

  console.log(`[service:getOccupations] search="${normalizedSearch}" page=${page}`);

  // ✅ Build params object
  const params: Record<string, any> = { 
    page: Number(page), 
    limit: 20 
  };
  
  if (normalizedSearch) {
    params.search = normalizedSearch;
  }

  console.log('[service:getOccupations] Sending params:', params);

  // ✅ FIX: Pass params directly, NOT { params }
  const res = await api.get(CARD_ENDPOINTS.occupations, params);
  //                                                     ^^^^^^ No wrapper!
  
  const body = unwrap(res);
  const data = body?.data ?? body;

  console.log('[service:getOccupations] Response:', {
    docsCount: data?.docs?.length ?? 0,
    page: data?.page,
    totalPages: data?.totalPages,
  });

  return {
    docs: (data?.docs ?? []).map((o: any) => ({
      code: o.code,
      title: o.title,
    })),
    totalPages: data?.totalPages ?? 1,
    page: data?.page ?? page,
  };
},


  // ═══════════════════════════════════════════════════════════════
  // ── CARDS ────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  
getCards: async (): Promise<CardListResponse> => {
  const res = await api.get<any>(CARD_ENDPOINTS.list);

  // Was: a hardcoded `res.data?.data?.data` chain, unlike every other
  // function in this file. If the shared `api` client's interceptor
  // strips one `.data` layer differently than assumed here, that fixed
  // chain silently lands one hop short OR one hop too far — either way
  // `rawList` ends up `undefined` → `[]`, `cards.length` is always 0, and
  // the whole module thinks you have no cards even when GET /cards
  // returns a real one. `unwrap()` (used everywhere else below) is
  // robust to this because it walks `.data` until it stops finding one,
  // instead of assuming a fixed depth.
  const inner = unwrap(res); // → { list: [...], total: "1" }
  const rawList: any[] = inner?.list ?? [];

  const items: CardInfo[] = rawList.map(mapRawCard);

  return {
    items,
    total: Number(inner?.total ?? 0),
  };
},

  async getCardSummary(cardId: string): Promise<CardSummaryResponse> {
    try {
      const res = await api.get(CARD_ENDPOINTS.summary(cardId));
      return mapSummary(unwrap(res), cardId);
    } catch {
      return { ...MOCK_SUMMARY, cardId };
    }
  },

  async getCardReveal(cardId: string): Promise<CardRevealResponse> {
    try {
      const res = await api.get(CARD_ENDPOINTS.reveal(cardId));
      return mapReveal(unwrap(res));
    } catch {
      return MOCK_REVEAL;
    }
  },

  async freezeCard(cardId: string): Promise<CardActionResponse> {
    // Body per Postman: { accountId, clientTransactionId } — accountId is
    // optional (server defaults to the user's account), clientTransactionId
    // is our own idempotency/tracking id.
    const res = await api.post(CARD_ENDPOINTS.freeze(cardId), {
      clientTransactionId: generateReferenceId(),
    });
    const body = unwrap(res);
    return { status: body?.status ?? 'FROZEN' };
  },

  async unfreezeCard(cardId: string): Promise<CardActionResponse> {
    const res = await api.post(CARD_ENDPOINTS.unfreeze(cardId), {
      clientTransactionId: generateReferenceId(),
    });
    const body = unwrap(res);
    return { status: body?.status ?? 'ACTIVE' };
  },

  // NOTE: backend expects { cardId, label, accountId?, email? } — cardId in
  // the BODY (router.put("/cards/update", ...)), not the URL.
  async updateCardSettings(payload: UpdateCardPayload): Promise<CardInfo> {
    const res = await api.put(CARD_ENDPOINTS.update, payload);
    return mapCard(unwrap(res));
  },

  async deleteCard(cardId: string, clientTransactionId?: string): Promise<CardActionResponse> {
    const res = await api.delete(CARD_ENDPOINTS.delete(cardId), {
      data: { clientTransactionId: clientTransactionId ?? generateReferenceId() },
    } as any);
    const body = unwrap(res);
    return { status: body?.status ?? 'INACTIVE' };
  },

  /**
   * POST /cards/prepaid — the REAL "issue a card" step. Must run AFTER
   * createCardholder AND the cardholder is approved by Interlace/the
   * issuing bank; needs binId + cardholderId + cardMode + useType (all
   * required — see card.service.js#createPrepaidCard). Synchronous per
   * Interlace's docs: on success the Card resource comes back immediately.
   */
  async createCard(payload: CreateCardPayload): Promise<CardInfo> {
    const res = await api.post(CARD_ENDPOINTS.create, {
      ...payload,
      referenceId: payload.referenceId ?? generateReferenceId(),
    });
    return mapCard(unwrap(res));
  },

  // ═══════════════════════════════════════════════════════════════
  // ── BUDGETS & BUDGET CARDS ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** GET /budgets — the pool of Budgets a user can issue a budget card against. */
  async listBudgets(): Promise<Budget[]> {
    try {
      const res = await api.get(CARD_ENDPOINTS.budgets);
      const body = unwrap(res);
      console.log('body', body)
      const list = body?.list ?? body?.items ?? body?.docs ?? (Array.isArray(body) ? body : []);
      return list.map(mapBudget);
    } catch {
      return MOCK_BUDGETS;
    }
  },

  /** POST /budget — only `name` is required (see card.service.js#createBudget). */
  async createBudget(payload: CreateBudgetPayload): Promise<Budget> {
    const res = await api.post(CARD_ENDPOINTS.createBudget, payload);
    return mapBudget(unwrap(res));
  },

  /**
   * POST /cards/budget-card — issues a card tied to a Budget instead of a
   * free-floating prepaid balance. Requires binId + cardholderId + cardMode
   * + referenceId + budgetId (see card.service.js#createBudgetCard) —
   * unlike createCard/prepaid, useType is optional here.
   */
  async createBudgetCard(payload: CreateBudgetCardPayload): Promise<CardInfo> {
    const res = await api.post(CARD_ENDPOINTS.createBudgetCard, {
      ...payload,
      referenceId: payload.referenceId ?? generateReferenceId(),
    });
    return mapCard(unwrap(res));
  },

  // ═══════════════════════════════════════════════════════════════
  // ── BINS ─────────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  async getRecommendedBin(): Promise<CardBin | null> {
    try {
      const res = await api.get(CARD_ENDPOINTS.recommendedBin);
      const body = unwrap(res);
      if (!body) return null;
      return mapBin(Array.isArray(body) ? body[0] : body);
    } catch {
      return mapBin(MOCK_BINS[0]);
    }
  },

  async listCardBins(): Promise<CardBin[]> {
    try {
      const res = await api.get(CARD_ENDPOINTS.bins);
      const body = unwrap(res);
      const list = body?.list ?? body?.items ?? (Array.isArray(body) ? body : []);
      if (!list.length) return MOCK_BINS.map(mapBin);
      return list.map(mapBin);
    } catch {
      return MOCK_BINS.map(mapBin);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ── CARDHOLDERS (must exist + be approved before creating a card) ──
  // ═══════════════════════════════════════════════════════════════

  /** POST /cardholders — requires binId + Interlace KYC already approved. */
  async createCardholder(payload: CreateCardholderPayload): Promise<CardholderInfo> {
    // Real body per a confirmed live call: { binId, accountId,
    // cardholderTier: "CONSUMER", nameAbbreviation, referenceId }.
    // accountId is filled server-side from the logged-in user;
    // cardholderTier defaults to the confirmed-working "CONSUMER" if the
    // caller didn't override it; referenceId is auto-generated if missing.
    const res = await api.post(CARD_ENDPOINTS.createCardholder, {
      ...payload,
      cardholderTier: payload.cardholderTier ?? CARDHOLDER_TIER_DEFAULT,
      referenceId: payload.referenceId ?? generateReferenceId(),
    });
    return mapCardholder(unwrap(res));
  },

  async getCardholder(cardholderId: string): Promise<CardholderInfo> {
    const res = await api.get(CARD_ENDPOINTS.cardholder(cardholderId));
    return mapCardholder(unwrap(res));
  },

  async listCardholders(): Promise<CardholderInfo[]> {
    const res = await api.get(CARD_ENDPOINTS.cardholders);
    const body = unwrap(res);
    const list = body?.list ?? body?.items ?? (Array.isArray(body) ? body : []);
    return list.map(mapCardholder);
  },

  async triggerCardholderKycVerification(cardholderId: string) {
    const res = await api.post(CARD_ENDPOINTS.triggerCardholderKyc, { cardholderId });
    return unwrap(res);
  },

  // ═══════════════════════════════════════════════════════════════
  // ── CARD PIN ─────────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * PUT /cards/:cardId/pin — sets/changes the card's PIN.
   * `pin` must pass validateCardPin() (constants.ts) before this is ever
   * called — the backend enforces the exact same rules and will 400
   * otherwise (see card.service.js#updateCardPin).
   */
  async updateCardPin(payload: UpdateCardPinPayload): Promise<CardActionResponse> {
    const res = await api.put(CARD_ENDPOINTS.pin(payload.cardId), {
      pin: payload.pin,
      accountId: payload.accountId,
    });
    const body = unwrap(res);
    return { status: body?.status ?? 'ACTIVE' };
  },

  // ═══════════════════════════════════════════════════════════════
  // ── SECURE CARD VIEW (access-token) ─────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /cards/:cardId/access-token — issues a short-lived token/URL for
   * viewing full, unmasked card details through Interlace's own secure
   * surface (an alternative to getCardReveal's raw pan/cvv passthrough).
   * Response shape isn't documented beyond `response.data`, so mapAccessToken
   * reads whichever of token/url is present — confirm the real shape once
   * this is live and tighten CardAccessTokenResponse accordingly.
   */
  async getCardAccessToken(cardId: string): Promise<CardAccessTokenResponse> {
    try {
      const res = await api.get(CARD_ENDPOINTS.accessToken(cardId));
      return mapAccessToken(unwrap(res));
    } catch (err) {
      throw new Error(backendMessage(err) ?? 'Could not open secure card view.');
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ── TRANSACTION SCENARIOS (spend controls) ──────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** GET /cards/card-transaction-scenarios — the catalog of scene codes this account can restrict. */
  async listCardTransactionScenarios(): Promise<CardTransactionScenario[]> {
    try {
      const res = await api.get(CARD_ENDPOINTS.transactionScenarios);
      const body = unwrap(res);
      const list = body?.list ?? body?.items ?? body?.docs ?? (Array.isArray(body) ? body : []);
      if (!list.length) return MOCK_TRANSACTION_SCENARIOS.map(mapScenario);
      return list.map(mapScenario);
    } catch {
      return MOCK_TRANSACTION_SCENARIOS.map(mapScenario);
    }
  },

  /**
   * POST /cards/:cardId/transaction-scenarios — applies spend controls to
   * one card. `scenes` (non-empty array of codes) + `type` are both
   * required by the backend (see card.service.js#setCardTransactionScenarios).
   */
  async setCardTransactionScenarios(payload: SetTransactionScenariosPayload) {
    const res = await api.post(CARD_ENDPOINTS.setTransactionScenarios(payload.cardId), {
      scenes: payload.scenes,
      type: payload.type,
      accountId: payload.accountId,
    });
    return unwrap(res);
  },

  // ═══════════════════════════════════════════════════════════════
  // ── NEGATIVE BALANCE CARDS ───────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /** GET /cards/negative-balance — cards on this account currently owing money. */
  async listNegativeBalanceCards(query?: NegativeBalanceQuery): Promise<NegativeBalanceCard[]> {
    try {
      const res = await api.get(CARD_ENDPOINTS.negativeBalance, { params: query });
      const body = unwrap(res);
      const list = body?.list ?? body?.items ?? body?.docs ?? (Array.isArray(body) ? body : []);
      return list.map(mapNegativeBalanceCard);
    } catch {
      return MOCK_NEGATIVE_BALANCE_CARDS.map(mapNegativeBalanceCard);
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // ── BATCH DELETE ──────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * DELETE /cards/batch-delete — removes several cards in one call. Real
   * wire shape per Postman is `{ cards: [{ accountId?, cardId,
   * clientTransactionId }] }` — NOT a flat `cardIds` array. The public
   * `BatchDeleteCardsPayload` type still takes a simple `cardIds: string[]`
   * (nicer for callers like ManageCardsScreen); this maps it to the real
   * shape and generates a clientTransactionId per card.
   */
  async batchDeleteCards(payload: BatchDeleteCardsPayload) {
    const res = await api.delete(CARD_ENDPOINTS.batchDelete, {
      data: {
        cards: payload.cardIds.map((cardId) => ({
          cardId,
          clientTransactionId: generateReferenceId(),
        })),
      },
    } as any);
    return unwrap(res);
  },


  // ═══════════════════════════════════════════════════════════════
  // ── TRANSACTIONS ─────────────────────────────────────────────────
  // ═══════════════════════════════════════════════════════════════

  /**
   * GET /cards/transactions — all card transactions for the logged-in
   * account, optionally filtered. Only non-empty filters are sent —
   * literal "null" query strings aren't needed since every filter here
   * is optional on the backend.
   */
  async getCardTransactions(query?: CardTransactionsQuery): Promise<CardTransactionsResponse> {
    const params: Record<string, any> = {};
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') params[k] = v;
      });
    }
    try {
      const res = await api.get(CARD_ENDPOINTS.transactions, { params });
      const body = unwrap(res);
      const list = body?.list ?? body?.items ?? body?.docs ?? (Array.isArray(body) ? body : []);
      return {
        items: list.map(mapTransaction),
        total: Number(body?.total ?? list.length ?? 0),
      };
    } catch {
      return { items: MOCK_TRANSACTIONS.map(mapTransaction), total: MOCK_TRANSACTIONS.length };
    }
  },

  /** POST /cards/transfer-out — moves funds out of the card account. */
  async transferOut(payload: TransferPayload) {
    const res = await api.post(CARD_ENDPOINTS.transferOut, {
      ...payload,
      clientTransactionId: payload.clientTransactionId ?? generateReferenceId(),
    });
    return unwrap(res);
  },

  /** POST /cards/transfer-in — moves funds into the card account. */
  async transferIn(payload: TransferPayload) {
    const res = await api.post(CARD_ENDPOINTS.transferIn, {
      ...payload,
      clientTransactionId: payload.clientTransactionId ?? generateReferenceId(),
    });
    return unwrap(res);
  },
};

export { backendMessage };