# Fix: Step 3 (BIN) & Step 4 (Cardholder) were invisible

## What was wrong

`CreateCardScreen.tsx` went straight to "pick Prepaid or Budget" and did the
BIN pick + cardholder creation as an internal 3-field form + a hidden
`ensureCardholderId()` call buried inside `handleCreate`. Two problems:

1. **Step 3 (BIN) and Step 4 (cardholder) never appeared as their own
   steps** — they were folded into what looked like a single "create card"
   screen, so it looked like the flow jumped straight from KYC-approved to
   step 5.
2. **`POST /cardholders` fired on every submit**, even though a cardholder
   only needs to be created once. Selecting Prepaid vs Budget, or retrying
   after an error, could each re-trigger it.

## Also: the step numbering itself was wrong in the original plan

`card.service.js#createCardholder` requires `binId` in the request body —
so the BIN **must** be chosen before the cardholder is created, not after.
The step tree shared earlier had these swapped (Cardholder as step 3, BIN
as step 4). Corrected order, now matching the code:

```
Step 3 → Choose card form (BIN)     GET /cards/bins
Step 4 → Cardholder profile         POST /cardholders (+ KYC trigger)
Step 5 → Create the card            POST /cards/prepaid / /cards/budget-card
```

## What changed

- `CreateCardScreen.tsx` is now a 3-step wizard (`wizardStep: 'bin' |
  'cardholder' | 'issue'`) with a persistent step-progress bar showing
  3/4/5 so it's always visible which step you're on and that none were
  skipped.
- **Step 3 (bin)**: pick a BIN, tap Continue. Nothing else happens yet.
- **Step 4 (cardholder)**: on entry, checks for an existing cardholder on
  this BIN (`listCardholders`) and reuses it if found — otherwise shows a
  read-only summary of the KYC details it'll use and a single "Create
  cardholder profile" button. The cardholder is stored in local state once
  created and is **never re-created** for the rest of the session.
- **Step 5 (issue)**: unchanged UI (Prepaid vs Budget, use-type/budget,
  label, amount) but `handleCreate` now uses the `cardholder.id` already
  in state — `ensureCardholderId()` is gone entirely, so no cardholder API
  call happens here anymore, regardless of card type or resubmits.
- Back button on step 4/5 goes to the previous step instead of exiting the
  wizard, so users can revisit the BIN or cardholder choice without
  restarting.
