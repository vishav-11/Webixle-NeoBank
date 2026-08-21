// CardModule/constants.ts

import type { CardInfo, CardRevealResponse, CardSummaryResponse, Budget, CardMode } from './types';
import {
  WEBIXLE_SIGNATURE_GRADIENT,
  WEBIXLE_BLACK_GRADIENT,
  WEBIXLE_METAL_GRADIENT,
  WEBIXLE_FACE_COLORS,
} from '@/components/common/webixleCardTheme';

// ─────────────────────────────────────────────
// API base — matches cardRoutes.js EXACTLY (same order, same params).
// `cardRoutes.js` and `occupation.routes.js` are exported together from
// interlaceCard/index.js as two separate routers; on the server both are
// mounted under the SAME base path (API_PREFIX) with an extra
// `/interlaceCard` segment per resource — adjust API_PREFIX below if your
// server.js mounts them differently.
// ─────────────────────────────────────────────

const API_PREFIX = '/api/v1/metavault';

const rawAppUrl =
  process.env.EXPO_PUBLIC_API_URL || 'https://metaapi.yourmetavault.com';

const APP_URL = rawAppUrl
  .replace(/\/+$/, '')
  .replace(new RegExp(`(${API_PREFIX})+$`), '');

export const CARD_API_PREFIX = `${APP_URL}${API_PREFIX}`;

// Every path below matches cardRoutes.js / occupation.routes.js EXACTLY.
export const CARD_ENDPOINTS = {
  // ── Account ───────────────────────────────────────────────────────
  // router.post("/account/create", ...)
  createAccount: `${CARD_API_PREFIX}/interlaceCard/account/create`,
  // router.get("/accounts", ...)
  accounts: `${CARD_API_PREFIX}/interlaceCard/accounts`,

  // ── KYC ───────────────────────────────────────────────────────────
  // router.post("/account/submit-kyc", ...)
  submitKyc: `${CARD_API_PREFIX}/interlaceCard/account/submit-kyc`,
  // router.get("/kyc-verification-result", ...)
  kycResult: `${CARD_API_PREFIX}/interlaceCard/kyc-verification-result`,
  // router.post("/upload-file", ...) — multipart, field name "files"
  uploadFile: `${CARD_API_PREFIX}/interlaceCard/upload-file`,
  // router.get("/occupations", ...) — from occupation.routes.js
  occupations: `${CARD_API_PREFIX}/interlaceCard/occupation/occupations`,

  // ── Cards ─────────────────────────────────────────────────────────
  // router.get("/cards", ...)
  list: `${CARD_API_PREFIX}/interlaceCard/cards`,
  // router.get("/cards/:id/payment-details", ...)  → reveal (pan/cvv/exp)
  reveal: (id: string) => `${CARD_API_PREFIX}/interlaceCard/cards/${id}/payment-details`,
  // router.get("/cards/:id/summary", ...) → balance
  summary: (id: string) => `${CARD_API_PREFIX}/interlaceCard/cards/${id}/summary`,
  // router.put("/cards/update", ...)  — NOTE: cardId goes in the BODY, not the URL
  update: `${CARD_API_PREFIX}/interlaceCard/cards/update`,
  // router.delete("/cards/delete/:cardId", ...)
  delete: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/delete/${cardId}`,
  // router.delete("/cards/batch-delete", ...)
  batchDelete: `${CARD_API_PREFIX}/interlaceCard/cards/batch-delete`,
  // router.post("/cards/freeze/:cardId", ...)
  freeze: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/freeze/${cardId}`,
  // router.post("/cards/unfreeze/:cardId", ...)
  unfreeze: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/unfreeze/${cardId}`,
  // router.get("/cards/negative-balance", ...)
  negativeBalance: `${CARD_API_PREFIX}/interlaceCard/cards/negative-balance`,

  // ── Bins ──────────────────────────────────────────────────────────
  // router.get("/cards/recommended-bin", ...)
  recommendedBin: `${CARD_API_PREFIX}/interlaceCard/cards/recommended-bin`,
  // router.get("/cards/bins", ...)
  bins: `${CARD_API_PREFIX}/interlaceCard/cards/bins`,
  // router.get("/cards/bins/maintenance", ...)
  binsMaintenance: `${CARD_API_PREFIX}/interlaceCard/cards/bins/maintenance`,

  // ── Card issuance (= the REAL "create a card" calls) ─────────────────
  // router.post("/cards/prepaid", ...) — separate from cardholders;
  // requires an approved cardholderId + binId + cardMode + useType.
  create: `${CARD_API_PREFIX}/interlaceCard/cards/prepaid`,
  // router.post("/cards/budget-card", ...) — same idea, but tied to a
  // Budget instead of a free balance; needs a budgetId (see budgets below).
  createBudgetCard: `${CARD_API_PREFIX}/interlaceCard/cards/budget-card`,

  // ── Budgets (only needed for the "Budget card" creation type) ────────
  // router.post("/budget", ...)
  createBudget: `${CARD_API_PREFIX}/interlaceCard/budget`,
  // router.get("/budgets", ...)
  budgets: `${CARD_API_PREFIX}/interlaceCard/budgets`,
  // router.get("/budget/:id", ...)
  budget: (id: string) => `${CARD_API_PREFIX}/interlaceCard/budget/${id}`,

  // ── Cardholders (must exist + be approved BEFORE `create` above) ────
  // router.post("/cardholders", ...)
  createCardholder: `${CARD_API_PREFIX}/interlaceCard/cardholders`,
  // router.get("/cardholders/:cardholderId", ...)
  cardholder: (id: string) => `${CARD_API_PREFIX}/interlaceCard/cardholders/${id}`,
  // router.get("/cardholders", ...)
  cardholders: `${CARD_API_PREFIX}/interlaceCard/cardholders`,
  // router.patch("/cardholders/:cardholderId", ...)
  updateCardholder: (id: string) => `${CARD_API_PREFIX}/interlaceCard/cardholders/${id}`,
  // router.delete("/cardholders/:cardholderId", ...)
  deleteCardholder: (id: string) => `${CARD_API_PREFIX}/interlaceCard/cardholders/${id}`,
  // router.post("/cardholders/kyc/trigger", ...)
  triggerCardholderKyc: `${CARD_API_PREFIX}/interlaceCard/cardholders/kyc/trigger`,

  // ── Card management (PIN / secure view / spend controls) ────────────
  // router.put("/cards/:cardId/pin", ...)
  pin: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/${cardId}/pin`,
  // router.get("/cards/:cardId/access-token", ...) — secure hosted-view token
  accessToken: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/${cardId}/access-token`,
  // router.get("/cards/card-transaction-scenarios", ...)
  transactionScenarios: `${CARD_API_PREFIX}/interlaceCard/cards/card-transaction-scenarios`,
  // router.post("/cards/:cardId/transaction-scenarios", ...)
  setTransactionScenarios: (cardId: string) => `${CARD_API_PREFIX}/interlaceCard/cards/${cardId}/transaction-scenarios`,

  // router.get("/cards/transactions", ...)
  transactions: `${CARD_API_PREFIX}/interlaceCard/cards/transactions`,
  // router.post("/cards/transfer-out", ...)
  transferOut: `${CARD_API_PREFIX}/interlaceCard/cards/transfer-out`,
  // router.post("/cards/transfer-in", ...)
  transferIn: `${CARD_API_PREFIX}/interlaceCard/cards/transfer-in`,
};

// ─────────────────────────────────────────────
// React Query cache keys
// ─────────────────────────────────────────────
export const CARD_KEYS = {
  all:            ['cards'] as const,
  detail:         (id: string) => ['cards', id] as const,
  reveal:         (id: string) => ['cards', id, 'reveal'] as const,
  summary:        (id: string) => ['cards', id, 'summary'] as const,
  accounts:       ['cards', 'accounts'] as const,
  kycResult:      ['cards', 'kycResult'] as const,
  occupations:    ['cards', 'occupations'] as const,
  recommendedBin: ['cards', 'recommendedBin'] as const,
  bins:           ['cards', 'bins'] as const,
  cardholder:     (id: string) => ['cards', 'cardholder', id] as const,
  cardholders:    ['cards', 'cardholders'] as const,
  moduleStage:    ['cards', 'moduleStage'] as const,
  budgets:        ['cards', 'budgets'] as const,
  accessToken:    (id: string) => ['cards', id, 'accessToken'] as const,
  transactionScenarios: (cardId?: string) => ['cards', 'transactionScenarios', cardId ?? 'catalog'] as const,
  negativeBalance: ['cards', 'negativeBalance'] as const,
  transactions: (query?: any) => ['cards', 'transactions', query ?? {}] as const,
};

// KYC polling — how often to re-check kyc-verification-result while a
// submission is under Interlace review.
export const KYC_POLL_INTERVAL_MS = 8000;

// Hard cap on cards per user. Interlace itself doesn't enforce a per-user
// limit, so this is a PRODUCT decision guarded client-side here — the
// backend's /cards/prepaid route currently has no matching server-side
// check, so treat this as a UX guard, not a security boundary.
export const MAX_CARDS_PER_USER = 5;

// Same list `card.service.js#submitAccountKyc` validates against.
// Confirmed-working value from a live createCardholder call (see
// CHANGES_postman_payload_fixes.md) — Interlace 400s without SOME
// cardholderTier; "CONSUMER" is the one that's actually been verified.
export const CARDHOLDER_TIER_DEFAULT = 'CONSUMER';

export const ID_TYPES: { label: string; value: string }[] = [
  { label: 'Passport', value: 'PASSPORT' },
  { label: 'National ID (CN)', value: 'CN-RIC' },
  { label: 'Hong Kong ID', value: 'HK-HKID' },
  { label: "Driver's License", value: 'DLN' },
  { label: 'Government-Issued ID Card', value: 'Government-Issued ID Card' },
  { label: 'EU Residency Permit', value: 'EU Residency Permit' },
  { label: 'UAE Residency Permit', value: 'UAE Residency Permit' },
];

export const ACCOUNT_PURPOSE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Personal spending', value: 'PERSONAL_SPENDING' },
  { label: 'Salary / income receipt', value: 'SALARY' },
  { label: 'Online shopping', value: 'ONLINE_SHOPPING' },
  { label: 'Travel & subscriptions', value: 'TRAVEL_SUBSCRIPTIONS' },
  { label: 'Business expenses', value: 'BUSINESS_EXPENSES' },
];

export const SOURCE_TYPE_OPTIONS: { label: string; value: string }[] = [
  { label: 'Salary', value: 'SALARY' },
  { label: 'Business income', value: 'BUSINESS_INCOME' },
  { label: 'Savings', value: 'SAVINGS' },
  { label: 'Investment returns', value: 'INVESTMENT' },
  { label: 'Other', value: 'OTHER' },
];

// ─────────────────────────────────────────────
// Card creation — bin `formFactor` (VIRTUAL/PHYSICAL, from listCardBins)
// maps 1:1 to Interlace's `cardMode` (VIRTUAL_CARD/PHYSICAL_CARD) that
// createPrepaidCard/createBudgetCard actually expect on the wire.
// ─────────────────────────────────────────────
// BIN → card-type mapping. Confirmed from Interlace's own field docs:
// each BIN is scoped to exactly ONE card type — `type: 0` bins can only
// issue Budget cards, `type: 1` bins can only issue Prepaid cards. A BIN
// picked in step 3 therefore determines the card type for step 5 — it's
// not a separate user choice.
// ─────────────────────────────────────────────
export const BIN_TYPE_LABEL: Record<number, string> = {
  0: 'Budget Card',
  1: 'Prepaid Card',
};

export function binTypeToCardCreationType(type: number): 'BUDGET' | 'PREPAID' {
  return type === 0 ? 'BUDGET' : 'PREPAID';
}

// `cardMode` (VIRTUAL_CARD / PHYSICAL_CARD) is a per-card choice at
// issuance, independent of the bin — gate the PHYSICAL option on the
// selected bin's `supportPhysicalCard` flag.
export const CARD_MODE_OPTIONS: { label: string; value: CardMode; description: string; icon: string }[] = [
  { label: 'Virtual card', value: 'VIRTUAL_CARD', description: 'Ready instantly — use online right away.', icon: 'phone-portrait-outline' },
  { label: 'Physical card', value: 'PHYSICAL_CARD', description: 'Shipped to you — arrives in a few business days.', icon: 'card-outline' },
];

// `useType` is required by createPrepaidCard (card.service.js throws a 400
// without it) but Interlace doesn't publicly document its accepted enum —
// same situation as ACCOUNT_PURPOSE_OPTIONS/SOURCE_TYPE_OPTIONS above.
// These two cover the common "how will this card be used" cases; swap or
// extend once Interlace confirms the exact values your BIN agreement allows.
export const USE_TYPE_OPTIONS: { label: string; value: string; description: string; icon: string }[] = [
  {
    label: 'Everyday spending',
    value: 'STANDARD',
    description: 'Reusable — swipe, tap or shop online again and again.',
    icon: 'repeat-outline',
  },
  {
    label: 'One-time use',
    value: 'SINGLE_USE',
    description: 'Locks itself after the very first successful payment.',
    icon: 'flash-outline',
  },
];

// ─────────────────────────────────────────────
// Card PIN — client-side mirror of card.service.js#updateCardPin's rules,
// so the Set PIN screen can reject a bad PIN instantly instead of round-
// tripping to the server. Keep this in exact sync with the backend list.
// ─────────────────────────────────────────────
export function validateCardPin(pin: string): string | null {
  if (!/^\d{6}$/.test(pin)) return 'PIN must be exactly 6 digits.';
  if (/(\d)\1\1/.test(pin)) return 'PIN cannot repeat the same digit three times.';
  for (let i = 0; i < 4; i++) {
    const a = Number(pin[i]);
    const b = Number(pin[i + 1]);
    const c = Number(pin[i + 2]);
    if (b === a + 1 && c === b + 1) return 'PIN cannot contain 3 ascending digits (e.g. 123).';
    if (b === a - 1 && c === b - 1) return 'PIN cannot contain 3 descending digits (e.g. 321).';
  }
  return null;
}

// ─────────────────────────────────────────────
// Transaction scenarios ("spend controls") — Interlace calls these
// "consumption scenarios" on the wire. card.service.js only validates that
// `scenes` is a non-empty array and `type` is present — it doesn't expose
// the accepted scene codes or type enum. These are reasonable common
// merchant-category placeholders (same pattern as USE_TYPE_OPTIONS);
// confirm against your Interlace BIN agreement and swap if different.
// ─────────────────────────────────────────────
export const SCENARIO_TYPE_OPTIONS: { label: string; value: string; description: string }[] = [
  { label: 'Allow only these', value: 'WHITELIST', description: 'Card only works for the categories you select below.' },
  { label: 'Block these', value: 'BLACKLIST', description: 'Card works everywhere except the categories you select below.' },
];

export const SCENE_OPTIONS: { code: string; label: string; icon: string }[] = [
  { code: 'ECOMMERCE', label: 'Online shopping', icon: 'cart-outline' },
  { code: 'POS', label: 'In-store (POS)', icon: 'storefront-outline' },
  { code: 'ATM', label: 'ATM withdrawal', icon: 'cash-outline' },
  { code: 'SUBSCRIPTION', label: 'Subscriptions', icon: 'repeat-outline' },
  { code: 'GAMBLING', label: 'Gambling', icon: 'dice-outline' },
  { code: 'CRYPTO', label: 'Crypto exchanges', icon: 'logo-bitcoin' },
  { code: 'TRAVEL', label: 'Travel & airlines', icon: 'airplane-outline' },
  { code: 'FOREIGN', label: 'Foreign / cross-border', icon: 'earth-outline' },
];

// ─────────────────────────────────────────────
// Mock data — used automatically whenever the real endpoint fails or isn't
// live yet. Also what the KYC/no-account/no-card empty states fall back to
// so the UI still looks correct in a demo/dev build.
// ─────────────────────────────────────────────
export const MOCK_CARDS: CardInfo[] = [
  {
    id: 'card_virtual_black',
    design: 'virtual_black',
    tierLabel: 'VIRTUAL BLACK',
    typeLabel: 'VIRTUAL BLACK',
    network: 'VISA',
    status: 'ACTIVE',
    last4: '3254',
    maskedNumber: '**** **** **** 3254',
    balanceUsd: '00.00',
    holderName: 'Alex',
  },
  {
    id: 'card_physical_metal',
    design: 'physical_metal',
    tierLabel: 'LEGACY',
    typeLabel: 'PHYSICAL METAL',
    network: 'VISA',
    status: 'ACTIVE',
    last4: '3254',
    maskedNumber: '**** **** **** 3254',
    balanceUsd: '0.00',
    holderName: 'Alex',
  },
];

export const MOCK_REVEAL: CardRevealResponse = {
  fullNumber: '4242 4242 4242 3254',
  expiryMonth: '09',
  expiryYear: '28',
  cvv: '482',
};

export const MOCK_SUMMARY: CardSummaryResponse = {
  cardId: 'card_virtual_black',
  balance: '0.00',
  currency: 'USD',
};

export const MOCK_BINS = [
  {
    id: 'bin_prepaid_visa', bin: '454924', type: 1, currencies: ['USD'], network: 'VISA',
    countryRegion: 'US', verification: { avs: true, threeDs: true },
    purchaseLimit: { day: '/', single: '/', lifetime: '/' }, supportPhysicalCard: true,
  },
  {
    id: 'bin_budget_visa', bin: '454924', type: 0, currencies: ['USD'], network: 'VISA',
    countryRegion: 'US', verification: { avs: true, threeDs: true },
    purchaseLimit: { day: '/', single: '/', lifetime: '/' }, supportPhysicalCard: true,
  },
];

export const MOCK_BUDGETS: Budget[] = [
  { id: 'budget_groceries', name: 'Groceries', balance: '120.00', currency: 'USD' },
  { id: 'budget_travel', name: 'Travel', balance: '340.50', currency: 'USD' },
];

export const MOCK_ACCESS_TOKEN = { token: 'mock_access_token', url: undefined as string | undefined };

export const MOCK_TRANSACTION_SCENARIOS: { code: string; label?: string }[] =
  SCENE_OPTIONS.map((s) => ({ code: s.code, label: s.label }));

export const MOCK_NEGATIVE_BALANCE_CARDS: { cardId: string; label?: string; last4?: string; balance: string; currency?: string }[] = [];

export const MOCK_OCCUPATIONS = [
  { id: '1', label: 'Software Engineer', value: 'SOFTWARE_ENGINEER' },
  { id: '2', label: 'Business Owner', value: 'BUSINESS_OWNER' },
  { id: '3', label: 'Freelancer', value: 'FREELANCER' },
  { id: '4', label: 'Student', value: 'STUDENT' },
  { id: '5', label: 'Other', value: 'OTHER' },
];

// ─────────────────────────────────────────────
// Fixed brand card faces — unchanged from before. `design` still has no
// backend source (see types.ts note); mapCardDesign() in service.ts is
// where that gets assigned.
// ─────────────────────────────────────────────
export const CARD_FACE_IMAGES = {
  virtual_black: require('../../assets/cards/card_dark_front.png'),
  physical_metal: require('../../assets/cards/card_light_front.png'),
};

export const CARD_FACE = {
  signature: {
    gradient: WEBIXLE_SIGNATURE_GRADIENT,
    gradientLocations: undefined as number[] | undefined,
    chip: WEBIXLE_FACE_COLORS.signature.chip,
    text: WEBIXLE_FACE_COLORS.signature.text,
    text2: WEBIXLE_FACE_COLORS.signature.text2,
    contactless: 'rgba(255,255,255,0.5)',
    image: undefined as any,
  },
  virtual_black: {
    gradient: WEBIXLE_BLACK_GRADIENT,
    gradientLocations: undefined as number[] | undefined,
    chip: WEBIXLE_FACE_COLORS.black.chip,
    text: WEBIXLE_FACE_COLORS.black.text,
    text2: WEBIXLE_FACE_COLORS.black.text2,
    contactless: 'rgba(255,255,255,0.5)',
    image: CARD_FACE_IMAGES.virtual_black,
  },
  physical_metal: {
    gradient: WEBIXLE_METAL_GRADIENT,
    gradientLocations: undefined as number[] | undefined,
    chip: WEBIXLE_FACE_COLORS.metal.chip,
    text: WEBIXLE_FACE_COLORS.metal.text,
    text2: WEBIXLE_FACE_COLORS.metal.text2,
    contactless: 'rgba(22,18,31,0.45)',
    image: CARD_FACE_IMAGES.physical_metal,
  },
};

// ─────────────────────────────────────────────
// Carousel sizing — unchanged.
// ─────────────────────────────────────────────
export const CARD_SIDE_PADDING = 24;
export const CARD_SIDE_INSET = 28;
export const CARD_GAP = 14;
export const CARD_ASPECT = 0.63;

// Status colors used across the top status pill, KYC screens, freeze
// popup, etc. — pulled from theme where possible, fallback const kept
// tiny and local so this file has no extra theme import surface.
export const STATUS_META: Record<string, { label: string; tone: 'success' | 'pending' | 'error' | 'neutral' }> = {
  ACTIVE:   { label: 'Active',   tone: 'success' },
  CONTROL:  { label: 'Active',   tone: 'success' },
  PENDING:  { label: 'Pending',  tone: 'pending' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  FROZEN:   { label: 'Frozen',   tone: 'pending' },
  BLOCKED:  { label: 'Blocked',  tone: 'error' },
};


export const MOCK_TRANSACTIONS: {
  id: string; cardId: string; type: string; status: string;
  amount: string; currency: string; description?: string; createTime: string;
}[] = [
  {
    id: 'txn_mock_1', cardId: 'card_virtual_black', type: 'PURCHASE', status: 'SUCCESS',
    amount: '-24.50', currency: 'USD', description: 'Amazon', createTime: new Date().toISOString(),
  },
  {
    id: 'txn_mock_2', cardId: 'card_virtual_black', type: 'TOPUP', status: 'SUCCESS',
    amount: '100.00', currency: 'USD', description: 'Top up', createTime: new Date(Date.now() - 86400000).toISOString(),
  },
];