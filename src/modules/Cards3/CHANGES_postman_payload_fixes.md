# Fix: request bodies corrected against the real Postman collection

You shared the actual Postman collection with real request bodies. Cross-checked
every payload this module sends against it (and against `card.service.js`'s
validation, where a field is optional client-side because the backend
defaults it from the logged-in user). Found and fixed 3 real bugs:

## 1. `createCardholder` — was sending completely wrong fields

**Before** (wrong — this is what `updateCardholder` takes, not `create`):
```json
{ "binId": "...", "email": "...", "phoneCountryCode": "...", "phoneNumber": "...", "firstName": "...", "lastName": "..." }
```

**Real body** (from Postman):
```json
{ "binId": "...", "accountId": "...", "cardholderTier": "...", "nameAbbreviation": "...", "referenceId": "..." }
```

Cardholder identity comes from the account-level KYC already on file —
`createCardholder` doesn't take name/email/phone at all. Fixed:
- `types.ts` → `CreateCardholderPayload` now matches: `{ binId, cardholderTier?, nameAbbreviation?, referenceId? }`
- `service.ts` → auto-generates `referenceId` (same idempotency pattern as card creation) if not supplied
- `screens/CreateCardScreen.tsx` → Step 4 now sends `{ binId, nameAbbreviation }` (initials computed from the user's name), not email/phone/name

`cardholderTier` is left out entirely for now — Postman shows it as an empty
string with no documented enum, so we omit it rather than guess a wrong value.

## 2. `batchDeleteCards` — wrong wire shape

**Before**: `{ cardIds: ["id1", "id2"] }`

**Real body**: `{ cards: [{ cardId: "id1", clientTransactionId: "..." }, ...] }`
(`card.service.js#batchDeleteCards` explicitly requires a `cards` array, 400s on
anything else)

Fixed in `service.ts` — `ManageCardsScreen.tsx` and the `useBatchDeleteCards`
hook are unchanged (still take a simple `cardIds: string[]`); the mapping to
the real `cards[]` shape (with a generated `clientTransactionId` per card)
now happens inside `service.ts`.

## 3. `freezeCard` / `unfreezeCard` / `deleteCard` — missing `clientTransactionId`

Backend accepts these without it (defaults are lenient), but Interlace uses
`clientTransactionId` for idempotency/tracking on their side — every other
mutating call in this module already generates one (`createCard`,
`createBudgetCard`, etc.) except these three. Now consistent — all three
auto-generate a `clientTransactionId` via the same `generateReferenceId()`
helper.

## Confirmed correct (no change needed)

- `submitAccountKyc` payload already matches the Postman body field-for-field
  (flat `firstName`/`lastName`, `dateOfBirth`, single `address` object, file
  IDs for `idFrontId`/`idBackId`/`selfie`, etc.)
- `ID_TYPES` in `constants.ts` already matches all 7 allowed values exactly
  (`PASSPORT`, `CN-RIC`, `HK-HKID`, `DLN`, `Government-Issued ID Card`,
  `EU Residency Permit`, `UAE Residency Permit`)
- `sourceType` is already hardcoded to `'api'` in `KycFormScreen.tsx`,
  matching the Postman example exactly (it's not a user-facing dropdown)
- `updateCard` (rename) already sends `cardId` in the body, not the URL —
  matches `router.put("/cards/update", ...)`
- `createPrepaidCard` / `createBudgetCard` field names, and the
  auto-generated `referenceId` for both, already matched

## Still a placeholder (flagging, not fixing blind)

- `ACCOUNT_PURPOSE_OPTIONS` in `constants.ts` uses enum-style values
  (`PERSONAL_SPENDING`, `SALARY`, ...) but the Postman example shows a plain
  lowercase string (`"living expense"`). The backend doesn't validate this
  field, so both would technically go through — but if Interlace expects
  exact free text rather than an enum, the dropdown values may not match
  what their system recognizes. Left as-is rather than guessing a new
  wrong shape; confirm the accepted values with Interlace/product and it's
  a one-line change in `constants.ts`.
