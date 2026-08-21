# Fix: real BIN fields, accountId threading, and the "existing card not detected" bug

Three more real-data corrections from your live responses.

## 1. `GET /cards/bins` — completely wrong assumed shape

Old code assumed a `formFactor: 'VIRTUAL'|'PHYSICAL'` field on each BIN and
a `recommended` flag. **Neither exists.** The real shape:

```json
{
  "id": "1987713856125325314",
  "bin": "45492418",
  "type": 1,                    // 0 = Budget Card, 1 = Prepaid Card
  "currencies": ["USD"],
  "network": "VISA",
  "countryRegion": "US",
  "verification": { "avs": true, "threeDs": true },
  "purchaseLimit": { "day": "/", "single": "/", "lifetime": "/" },
  "supportPhysicalCard": true,
  "extend": { "isSupportGoogleWallet": true, "isSupportApplePay": false }
}
```

**The important consequence**: `type` means each BIN is scoped to ONE card
type — a `type: 1` bin can only issue Prepaid cards, `type: 0` only Budget.
So picking a BIN in step 3 **also decides the card type** — it's not a
separate choice in step 5 anymore. Fixed:

- `types.ts` → `CardBin` rewritten to the real shape; `binTypeToCardCreationType()`
  added in `constants.ts`
- Step 3's `BinOption` card now shows network + currencies, country, a
  Budget/Prepaid badge, physical-card availability, 3DS/wallet support, and
  purchase limits (skipped when they're all `"/"` = unlimited)
- Step 5 no longer asks "Prepaid or Budget" — it's derived from the BIN and
  shown as a read-only header ("Set up your Prepaid card")
- `cardMode` (Virtual/Physical) is still a real per-card choice at
  issuance — moved into step 5 as its own selector, disabled if the
  selected BIN's `supportPhysicalCard` is false
- `mapBin()` / `MOCK_BINS` in `service.ts` / `constants.ts` updated to match
- The old `mapCard()` (used by `createCard`/`createBudgetCard`/`updateCardSettings`
  responses) had the same stale-field problem (`lastFour`, `pan`,
  `formFactor`) — it now just calls the already-fixed `mapRawCard()` so
  there's one source of truth for "what a card object looks like"

## 2. `accountId` now sent explicitly from the profile

You pointed out `interlaceAccountId` is right there on the user profile
(`user.interlaceAccountId`). Backend already defaults it server-side if
omitted, but it's now sent explicitly for parity with your confirmed-working
requests:

- `types.ts` → `accountId?: string` added to `CreateCardholderPayload`,
  `CreateCardPayload`, `CreateBudgetCardPayload`
- `CreateCardScreen.tsx` → reads `prof?.interlaceAccountId` once at the top
  and passes it into all three calls (create cardholder, create prepaid
  card, create budget card)

## 3. The real "card exists but app still shows Create Card" bug

You sent a real `GET /cards` response with one `ACTIVE` card in it — the
app still routed to the create-card screen. Root cause, found in
`service.ts#getCards`:

```ts
// BEFORE — hardcoded, assumes a fixed nesting depth
const envelope = res.data?.data;
const inner    = envelope?.data;
const rawList  = inner?.list ?? [];
```

Every OTHER function in `service.ts` uses a generic `unwrap(res)` helper
that walks `.data` until it stops finding one — robust to however many
layers the shared `api` client's interceptor already stripped. `getCards`
was the one function written with a hand-counted, fixed-depth chain
instead. If that count is off by even one layer, `rawList` silently
becomes `undefined → []`, `cards.length` is always `0`, and
`useCardModuleStage` permanently reports `kyc_approved_no_card` even with
a real, active card sitting in the response. Fixed to use the same
`unwrap()` everything else already relies on.

Also fixed alongside it: `mapRawCard()` was reading `raw.last4` /
`raw.holderName` / `raw.cardholderName` — the real fields are
`cardLastFour` and `userName`. Kept the old field names as fallbacks (in
case a different endpoint ever returns the old shape) but real data now
maps correctly.
