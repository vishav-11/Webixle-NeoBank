# Card management work — PIN, secure view, spend controls, negative balance, batch delete

Scope: `has_cards` stage ke baad ka poora management surface — jo pehle
sirf freeze/unfreeze/rename/delete tak limited tha, ab backend ke baaki
saare per-card/account-level routes bhi cover karta hai:

| Feature | Route | Where |
|---|---|---|
| Set / change PIN | `PUT /cards/:cardId/pin` | `SetPinModal.tsx` |
| Secure card view | `GET /cards/:cardId/access-token` | `CardDetailsModal.tsx` |
| Spend controls | `GET /cards/card-transaction-scenarios`, `POST /cards/:cardId/transaction-scenarios` | `SpendControlsModal.tsx` |
| Negative balance list | `GET /cards/negative-balance` | `ManageCardsScreen.tsx` |
| Batch delete | `DELETE /cards/batch-delete` | `ManageCardsScreen.tsx` |

## Files changed

| File | What |
|---|---|
| `types.ts` | `UpdateCardPinPayload`, `CardAccessTokenResponse`, `CardTransactionScenario`, `SetTransactionScenariosPayload`, `NegativeBalanceCard`, `NegativeBalanceQuery`, `BatchDeleteCardsPayload` add kiye |
| `constants.ts` | `pin`/`accessToken`/`transactionScenarios`/`setTransactionScenarios` endpoints, `validateCardPin()` (backend rules ka exact client-side mirror), `SCENARIO_TYPE_OPTIONS`, `SCENE_OPTIONS`, matching mock data add kiye |
| `service.ts` | `updateCardPin`, `getCardAccessToken`, `listCardTransactionScenarios`, `setCardTransactionScenarios`, `listNegativeBalanceCards`, `batchDeleteCards` add kiye |
| `hooks.ts` | `useUpdateCardPin`, `useCardAccessToken`, `useCardTransactionScenarios`, `useSetCardTransactionScenarios`, `useNegativeBalanceCards`, `useBatchDeleteCards` add kiye |
| `components/SetPinModal.tsx` | **NEW** — 6-box PIN entry + confirm, client-side validation before hitting network |
| `components/CardDetailsModal.tsx` | **NEW** — access-token based secure view (opens hosted URL if returned, else shows the token) |
| `components/SpendControlsModal.tsx` | **NEW** — allow-only/block-these mode + category chips |
| `screens/ManageCardsScreen.tsx` | **NEW** — negative-balance banner + multi-select batch delete |
| `components/CardSettingsSheet.tsx` | 4 new rows: "View card details (secure)" (fixed — previously did nothing), "Set / change PIN", "Spend controls", "Manage all cards" |
| `CardsScreen.tsx` | `LiveCardsView` now owns 3 more modals + a `managingCards` screen-level toggle (same pattern as `addingCard`) |
| `index.tsx` | new hooks/types/components exported |

## Important notes / things to confirm against your Interlace agreement

1. **PIN rules are hardcoded to match `card.service.js#updateCardPin` exactly**
   (6 digits, no triple-repeat, no 3-in-a-row ascending/descending) via
   `validateCardPin()` in `constants.ts`. If the backend rule ever changes,
   update that one function — nothing else needs to change.
2. **`getCardAccessToken`'s response shape is a guess.** The backend just
   forwards `response.data` from Interlace's
   `GET /cards/:cardId/private-info/access-token` without documenting the
   shape. `CardDetailsModal` handles both a `url` (opens in the device
   browser via `Linking`, no new dependency) and a bare `token` (shown as
   selectable text). Once you've seen a real response, tighten
   `CardAccessTokenResponse` and swap the `url` branch for a proper
   in-app WebView if you want it embedded instead of external-browser.
3. **`SCENE_OPTIONS` / `SCENARIO_TYPE_OPTIONS` are placeholders**, same
   situation as `USE_TYPE_OPTIONS` before them — `card.service.js` only
   checks that `scenes` is a non-empty array and `type` is present, it
   doesn't expose the accepted values. `SpendControlsModal` prefers the
   live catalog from `listCardTransactionScenarios()` when it returns
   data, and falls back to the local list otherwise.
4. **Negative balance list is account-wide**, not scoped to the active
   carousel card — shown at the top of `ManageCardsScreen` since that's
   the natural "all my cards" surface, not tucked into per-card settings.
5. **Batch delete has its own confirm step** (same two-tap pattern as the
   single-card delete in `CardSettingsSheet`) and invalidates both the
   card list and the module-stage query on success, so a user who deletes
   every card correctly falls back to `kyc_approved_no_card` instead of
   showing an empty carousel.
