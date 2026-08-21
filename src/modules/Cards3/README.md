# CardModule — full lifecycle (account → KYC → card issuance → live card)

Drop this whole folder into your project (e.g. `src/modules/Cards/`) and use:

```tsx
import CardsScreen from '@/modules/Cards';
```

## What changed vs. the previous pass

The old module assumed a card already existed and only rendered the
carousel, silently falling back to `MOCK_CARDS` whenever the API failed —
so "no card yet" and "no Interlace account" looked identical to "here are
your cards". This pass wires the **entire** flow your backend actually
enforces (see `card.service.js`):

```
no_account  →  kyc_required  →  kyc_pending  →  kyc_approved_no_card
                     ↑                │
                     └── kyc_rejected ┘
                                       ↓
                                 card_pending  →  has_cards
```

`useCardModuleStage()` (in `hooks.ts`) is the single source of truth for
where the user is — it calls `getCards()`, reads the *specific* error
message the backend throws ("Interlace account not found", "Interlace KYC
is not approved."), and cross-checks `getKycVerificationResult()` /
`listCardholders()` to disambiguate pending vs. rejected vs. no-card-yet.
`CardsScreen.tsx` just switches on `stage` and renders the matching screen.
Once a real card exists, the original carousel/actions/info UI renders,
now with a status pill, a real freeze confirmation popup
(`FreezeConfirmModal`), and a settings sheet (`CardSettingsSheet`).

## Flow → screen mapping

| Stage | Screen | Backend calls |
|---|---|---|
| `no_account` | `NoAccountScreen` | `POST /account/create` |
| `kyc_required` | `KycFormScreen` | `GET /occupations`, `POST /upload-file`, `POST /account/submit-kyc` |
| `kyc_pending` | `KycPendingScreen` | polls `GET /kyc-verification-result` |
| `kyc_rejected` | `KycPendingScreen` (rejected variant) | → back to `KycFormScreen` |
| `kyc_approved_no_card` | `CreateCardScreen` | `GET /cards/recommended-bin`, `GET /cards/bins`, `POST /cardholders`, `POST /cardholders/kyc/trigger` |
| `card_pending` | `CardPendingScreen` | stage query keeps polling |
| `has_cards` | `CardsScreen` (carousel) | `GET /cards`, `GET /cards/:id/summary`, `GET /cards/:id/payment-details`, freeze/unfreeze, update, delete |

## Things to double-check against your actual server.js before shipping

1. **Mount path** (`constants.ts` → `CARD_API_PREFIX` / every endpoint's
   `/interlaceCard/...` segment). `cardRoutes.js` and `occupation.routes.js`
   are exported as two separate routers from `interlaceCard/index.js`;
   this file assumes both are mounted under the same base with an
   `/interlaceCard` prefix per resource. If your `app.js` mounts them on
   different paths, update the `CARD_ENDPOINTS` map (one place).
2. **"Create card" = `createCardholder`.** There's no explicit
   `POST /cards` route in `cardRoutes.js` — the `// card issuance` comment
   sits directly above `createCardholder` in `interlace.api.js`, so this
   module treats bin selection + `createCardholder` as the card-issuance
   step, then optimistically calls `triggerCardholderKycVerification`. If
   Interlace actually needs a *separate* explicit "issue card" call once
   the cardholder is approved, add it in `service.ts` /
   `CreateCardScreen.tsx` — the surrounding state machine won't need to
   change.
3. **KYC required fields** in `KycFormScreen.tsx` mirror
   `card.service.js#submitAccountKyc`'s `requiredFields` list exactly
   (firstName, lastName, dateOfBirth, gender, occupation, annualSalary,
   accountPurpose, expectedMonthlyVolume, nationality, nationalId, idType,
   issueDate, expiryDate, address, idFrontId, selfie, phoneNumber,
   phoneCountryCode, sourceType). `occupation`, `accountPurpose` and
   `sourceType` don't have a confirmed backend enum beyond the occupation
   dropdown — the placeholder options in `constants.ts`
   (`ACCOUNT_PURPOSE_OPTIONS`, `SOURCE_TYPE_OPTIONS`) are reasonable
   guesses; swap them for whatever your Interlace agreement actually
   accepts.
4. **`useProfile`** is imported from `@/hooks/queires` (the exact path/typo
   in your `hooks/queires/index.ts`) in `KycFormScreen.tsx` and
   `CreateCardScreen.tsx` — update the import if your alias differs.
   Profile field names used for prefill (`firstName`, `lastName`, `dob`,
   `nationality`, `mobileCode`, `mobileNo`, `address.*`) are best-effort
   guesses based on the fields MetaVault/Webixle already use elsewhere;
   adjust the destructuring at the top of `KycFormScreen` if your
   `UserProfile` type uses different keys.
5. **File uploads** use `expo-image-picker`'s camera capture (front/back
   ID + selfie) and POST to `/upload-file` as multipart `files[]`, matching
   `multer.array("files")` server-side. Swap for a gallery picker or a
   dedicated document-scanner flow if you already have one elsewhere in
   the app.
6. **Mock data removed from the "live" path.** `getCards()` no longer
   falls back to `MOCK_CARDS` on success-with-zero-items (that's now a
   real stage, `kyc_approved_no_card`) — mocks are only used for card
   `summary`/`reveal`/`bins`/`occupations` when those specific secondary
   calls fail, so the primary account/KYC/card state is always real.
