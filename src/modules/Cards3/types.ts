// CardModule/types.ts
// Extended to cover the FULL card lifecycle exposed by cardRoutes.js:
// account creation -> Interlace KYC -> bin selection -> cardholder ->
// cardholder approval -> POST /cards/prepaid (actual card issuance) ->
// live card.
//
// Field names for the Interlace v3 payloads mirror EXACTLY what
// card.service.js validates/forwards (see submitAccountKyc's
// `requiredFields` list and createPrepaidCard's required-field checks)
// since the Interlace docs don't publicly render their JSON schemas.

export type CardDesign = 'virtual_black' | 'physical_metal' | 'signature';

// Real Interlace card statuses (per List Cards docs): INACTIVE, CONTROL,
// ACTIVE, PENDING, FROZEN. Kept as-is instead of inventing our own enum.
export type CardStatus = 'INACTIVE' | 'CONTROL' | 'ACTIVE' | 'PENDING' | 'FROZEN' | 'BLOCKED';

export interface CardInfo {
  id: string;              // Interlace card UUID
  accountId?: string;
  cardholderId?: string;
  binId?: string;
  label?: string;          // user-set card label/tag ("label" in updateCard)
  status: CardStatus;
  last4: string;
  maskedNumber: string;    // derived client-side from last4 (Interlace list endpoint doesn't return full PAN)
  network: string;         // e.g. 'VISA' — derived from BIN metadata if/when card BIN info is joined in
  currency?: string;
  holderName: string;

  // UI-only fields not returned by Interlace — kept so CardsScreen doesn't
  // need restructuring. `design` has NO backend source right now; it's
  // assigned client-side (see mapCardDesign in service.ts).
  design: CardDesign;
  tierLabel: string;
  typeLabel: string;

  // Balance is NOT part of List Cards — it comes from a separate
  // `getCardSummary` call. Kept optional here; CardsScreen should prefer
  // useCardSummary(cardId) once a card is active, this is just a fallback.
  balanceUsd?: string;

  // Confirmed-real extra fields from a live GET /cards response, kept for
  // completeness (e.g. cardMode tells you virtual vs physical directly,
  // no need to guess from `design`).
  cardMode?: CardMode;
  bin?: string;              // 6-digit BIN prefix (NOT the bin's `id`/binId)
  cardReferenceId?: string;
  balanceId?: string;
  createTime?: string;
}

export interface CardListResponse {
  items: CardInfo[];
  total?: number;
  page?: number;
}

// GET /cards/:id/summary
export interface CardSummaryResponse {
  cardId: string;
  balance: string;
  currency?: string;
  availableToSpend?: string;
}

// GET /cards/:id/payment-details
// Backend already decrypts pan/cvv/expYear/expMonth (see card.service.js ->
// getCardPaymentDetails), so these are the plain values by the time they
// reach the frontend.
export interface CardRevealResponse {
  fullNumber: string;   // decrypted `pan`
  expiryMonth: string;  // decrypted `expMonth`
  expiryYear: string;   // decrypted `expYear`
  cvv: string;           // decrypted `cvv`
}

export interface CardActionResponse {
  status: CardStatus;
}

export interface UpdateCardPayload {
  cardId: string;
  label: string;
  email?: string;
}

export interface DeleteCardPayload {
  clientTransactionId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── ACCOUNT ───────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// Mirrors user.interlaceKycStatus in card.service.js exactly.
export type InterlaceKycStatus = 'not_started' | 'submitted' | 'approved' | 'rejected';

export interface InterlaceAccount {
  accountId: string;
  interlaceDisplayId: string;
}

// Derived, client-side "where is this user in the flow" state. This is
// what CardsScreen actually switches on — everything else (account,
// kyc status, cards) collapses into one of these.
export type CardModuleStage =
  | 'loading'
  | 'main_kyc_required'      // ✅ Main KYC guard (like P2P)
  | 'no_account'
  | 'account_create_error'
  | 'kyc_required'
  | 'kyc_pending'
  | 'kyc_rejected'
  | 'kyc_approved_no_card'
  | 'card_pending'
  | 'has_cards';
// ═══════════════════════════════════════════════════════════════════
// ── KYC ───────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export type IdType =
  | 'CN-RIC'
  | 'PASSPORT'
  | 'HK-HKID'
  | 'DLN'
  | 'Government-Issued ID Card'
  | 'EU Residency Permit'
  | 'UAE Residency Permit';

export interface KycAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string; // ISO-2, e.g. 'AE'
  postalCode: string;
}

// Exactly the `requiredFields` list validated in
// card.service.js#submitAccountKyc, so nothing here is guessed.
export interface SubmitAccountKycPayload {
  firstName: string;
  lastName: string;
  dateOfBirth: string;   // 'YYYY-MM-DD'
  gender: 'M' | 'F';
  occupation: string;
  annualSalary: string | number;
  accountPurpose: string;
  expectedMonthlyVolume: string | number;
  nationality: string;   // ISO-2
  nationalId: string;
  idType: IdType;
  issueDate: string;     // 'YYYY-MM-DD'
  expiryDate: string;    // 'YYYY-MM-DD'
  address: KycAddress;
  idFrontId: string;     // fileId from /upload-file
  idBackId?: string;     // fileId from /upload-file (optional per idType)
  selfie: string;        // fileId from /upload-file
  phoneNumber: string;
  phoneCountryCode: string;
  sourceType: string;
}

export interface KycVerificationResult {
  status?: string; // Interlace raw status: PASSED | REJECTED | FAILED | PENDING | ...
  reason?: string;
  [key: string]: any;
}

export interface UploadedFile {
  id: string;
  url?: string;
  name?: string;
}

export interface OccupationOption {
  id: string;
  label: string;
  value: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── BINS & CARDHOLDER ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

// Real shape, confirmed against a live GET /cards/bins response + Interlace's
// own field docs. IMPORTANT things an earlier draft got wrong:
//   - There's no `formFactor` field. Whether a card CAN be physical is
//     `supportPhysicalCard` (boolean) — virtual vs physical is a per-card
//     choice at issuance time (`cardMode`), not a bin attribute.
//   - `type` (0 = Budget Card, 1 = Prepaid Card) means each BIN is scoped to
//     ONE card type — you can't issue a budget card off a `type: 1` bin or
//     vice versa. See `binTypeToCardCreationType()` in constants.ts.
export type CardBinType = 0 | 1; // 0 = Budget Card, 1 = Prepaid Card

export interface CardBinLimits {
  day: string;       // '/' = no limit
  single: string;
  lifetime: string;
}

export interface CardBinVerification {
  avs: boolean;
  threeDs: boolean;
}

export interface CardBinExtend {
  isSupportGoogleWallet?: boolean;
  isSupportApplePay?: boolean;
}

export interface CardBin {
  binId: string;              // mapped from raw `id`
  bin: string;                 // first 6 digits of the card
  type: CardBinType;
  currencies: string[];
  network: string;             // VISA / MASTERCARD
  countryRegion: string;       // ISO 3166-1 alpha-2, e.g. 'US'
  verification: CardBinVerification;
  purchaseLimit: CardBinLimits;
  supportPhysicalCard: boolean;
  extend?: CardBinExtend;
}

export type CardholderStatus =
  | 'PENDING'
  | 'KYC_PENDING'
  | 'KYC_PASSED'
  | 'KYC_FAILED'
  | 'ACTIVE'
  | 'REJECTED'
  | string;

// Mirrors the REAL createCardholder body — confirmed against a live
// request/response (see CHANGES_postman_payload_fixes.md history):
//   { binId, accountId, cardholderTier: "CONSUMER", nameAbbreviation, referenceId }
// `cardholderTier` IS required in practice — "CONSUMER" is a confirmed-working
// value (CARDHOLDER_TIER_DEFAULT in constants.ts). `nameAbbreviation` is a
// free-text label (confirmed working with a plain string like "Test ", not
// strictly 2-letter initials).
export interface CreateCardholderPayload {
  binId: string;
  cardholderTier?: string;
  nameAbbreviation?: string;
  referenceId?: string;
  /** Sent explicitly from the user's profile (`interlaceAccountId`) — the
   *  backend also defaults it server-side if omitted, but the caller sends
   *  it explicitly here for parity with a confirmed-working request. */
  accountId?: string;
}

// Confirmed shape from a live createCardholder / listCardholders response.
// IMPORTANT: there is NO `binId` field on a cardholder — a cardholder can be
// linked to MULTIPLE bins, listed in `cardBinList`. Any "does this cardholder
// already cover this bin" check must test `cardBinList.includes(binId)`, not
// `binId === binId` (that field doesn't exist and that check always silently
// fails).
export interface CardholderInfo {
  id: string;
  accountId?: string;
  /** All BINs this cardholder is already provisioned for — NOT a single `binId`. */
  cardBinList?: string[];
  status: CardholderStatus;
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  referenceId?: string;
  dob?: string;
  nationality?: string;
  cardholderTier?: string;
  businessModel?: string;
  address?: KycAddress;
  createdAt?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── CARD ISSUANCE (POST /cards/prepaid — the REAL "create a card") ───
// ═══════════════════════════════════════════════════════════════════

export type CardMode = 'VIRTUAL_CARD' | 'PHYSICAL_CARD';

// Mirrors card.service.js#createPrepaidCard's required-field checks
// EXACTLY: binId, cardholderId, cardMode, useType are all required —
// the backend throws a 400 if any of them is missing.
export interface CreateCardPayload {
  binId: string;
  cardholderId: string;
  cardMode: CardMode;
  useType: string;               // required by backend
  label?: string;
  physicalCardDesignId?: string;
  amount?: number;
  referenceId?: string;          // optional — service.ts auto-generates one if omitted
  /** Sent explicitly from the user's profile — backend also defaults it. */
  accountId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── BUDGETS & BUDGET CARDS (POST /budget, POST /cards/budget-card) ────
// ═══════════════════════════════════════════════════════════════════
//
// A Budget is a named "pot" of spending limits — you create it once,
// then issue one or more cards against it (createBudgetCard) instead of
// a free-floating prepaid balance. Mirrors card.service.js#createBudget
// (only `name` is validated) and #createBudgetCard exactly.

export interface Budget {
  id: string;
  name: string;
  accountId?: string;
  balance?: string;
  currency?: string;
  createdAt?: string;
}

// Mirrors card.service.js#createBudget's requiredFields: just `name`.
export interface CreateBudgetPayload {
  name: string;
}

// Mirrors card.service.js#createBudgetCard's required-field checks
// EXACTLY: binId, cardholderId, cardMode, referenceId, budgetId are all
// required — NOTE unlike createPrepaidCard, useType is NOT required here.
export interface CreateBudgetCardPayload {
  binId: string;
  cardholderId: string;
  cardMode: CardMode;
  budgetId: string;               // required — the UUID of the Budget this card draws from
  referenceId?: string;          // required by backend — service.ts auto-generates one if omitted
  useType?: string;
  label?: string;
  physicalCardDesignId?: string;
  /** Sent explicitly from the user's profile — backend also defaults it. */
  accountId?: string;
}

// What the create-card wizard lets the user pick between. Batch
// creation (batchCreatePrepaidCards / batchCreateBudgetCards) is
// intentionally NOT exposed here — single-card creation only.
export type CardCreationType = 'PREPAID' | 'BUDGET';

// ═══════════════════════════════════════════════════════════════════
// ── CARD PIN (PUT /cards/:cardId/pin) ─────────────────────────────────
// ═══════════════════════════════════════════════════════════════════
//
// Mirrors card.service.js#updateCardPin's validation EXACTLY, so the
// client can reject a bad PIN before it ever hits the network:
//   - exactly 6 numeric digits
//   - no 3 consecutive identical digits (e.g. 111)
//   - no 3 consecutive ascending digits (e.g. 123, 456)
//   - no 3 consecutive descending digits (e.g. 321, 654)

export interface UpdateCardPinPayload {
  cardId: string;
  pin: string; // exactly 6 digits
  accountId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── CARD ACCESS TOKEN (GET /cards/:cardId/access-token) ───────────────
// ═══════════════════════════════════════════════════════════════════
//
// Interlace's "private-info/access-token" endpoint — issues a short-lived
// token for viewing full card details through Interlace's own secure
// surface, as an alternative to pulling raw PAN/CVV through
// getCardPaymentDetails. The exact response shape isn't documented in
// card.service.js (it just forwards `response.data`), so this type is
// deliberately loose — service.ts reads whichever of `url`/`token` shows
// up first. Confirm the real shape against a live response and tighten
// this once you have it.
export interface CardAccessTokenResponse {
  token?: string;
  url?: string;          // some issuers return a ready-to-open hosted URL
  expiresAt?: string;
  expiresIn?: number;
  [key: string]: any;
}

// ═══════════════════════════════════════════════════════════════════
// ── TRANSACTION SCENARIOS / SPEND CONTROLS ────────────────────────────
// (GET /cards/card-transaction-scenarios, POST /cards/:cardId/transaction-scenarios)
// ═══════════════════════════════════════════════════════════════════
//
// Mirrors card.service.js#setCardTransactionScenarios's required-field
// checks: `scenes` (array) and `type` are both required. Interlace calls
// this "consumption scenarios" on the wire (open-api/v3/.../consumption-scenarios).
// Neither the scene codes nor the `type` enum are documented in the
// backend beyond "must be present" — SCENE_OPTIONS / SCENARIO_TYPE_OPTIONS
// in constants.ts are reasonable placeholders (same pattern already used
// for useType/accountPurpose/sourceType elsewhere in this module).
export type ScenarioType = 'WHITELIST' | 'BLACKLIST' | string;

export interface CardTransactionScenario {
  code: string;
  label?: string;
  description?: string;
  [key: string]: any;
}

export interface SetTransactionScenariosPayload {
  cardId: string;
  scenes: string[];
  type: ScenarioType;
  accountId?: string;
}

// ═══════════════════════════════════════════════════════════════════
// ── NEGATIVE BALANCE CARDS (GET /cards/negative-balance) ──────────────
// ═══════════════════════════════════════════════════════════════════

export interface NegativeBalanceCard {
  cardId: string;
  label?: string;
  last4?: string;
  balance: string;
  currency?: string;
  status?: CardStatus;
  [key: string]: any;
}

export interface NegativeBalanceQuery {
  cardId?: string;
  budgetId?: string;
  cardholderId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// ═══════════════════════════════════════════════════════════════════
// ── BATCH DELETE (DELETE /cards/batch-delete) ─────────────────────────
// ═══════════════════════════════════════════════════════════════════

export interface BatchDeleteCardsPayload {
  cardIds: string[];
}

export interface CardTransaction {
  id: string;
  accountId?: string;
  cardId?: string;
  clientTransactionId?: string;
  type?: string;
  status?: string;
  amount?: string;
  currency?: string;
  merchantName?: string;
  description?: string;
  createTime?: string;
  [key: string]: any;
}

export interface CardTransactionsQuery {
  accountId?: string;
  id?: string;
  clientTransactionId?: string;
  cardId?: string;
  type?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  page?: number;
  limit?: number;
}

export interface CardTransactionsResponse {
  items: CardTransaction[];
  total: number;
}

export interface TransferPayload {
  accountId: string;
  amount: string;
  clientTransactionId?: string;
}