# Create Card work — createPrepaidCard + createBudgetCard

Scope: card creation ke aage ka kaam — KYC approved ho chuka hai, ab
`kyc_approved_no_card` stage pe do card types issue karna:

1. **Prepaid Card** → `POST /cards/prepaid` (createPrepaidCard)
2. **Budget Card**  → `POST /cards/budget-card` (createBudgetCard)

Batch endpoints (`prepaid/batch`, `batch-budget-cards`) jaan-boojh kar
expose NAHI kiye — sirf single-card creation, jaisa tumne bola.

## Files changed

| File | What |
|---|---|
| `types.ts` | `Budget`, `CreateBudgetPayload`, `CreateBudgetCardPayload`, `CardCreationType` add kiye |
| `constants.ts` | Budget endpoints (`/budget`, `/budgets`), `formFactorToCardMode()` helper, `USE_TYPE_OPTIONS`, `MOCK_BUDGETS` add kiye |
| `service.ts` | `listBudgets`, `createBudget`, `createBudgetCard` add kiye |
| `hooks.ts` | `useBudgets`, `useCreateBudget`, `useCreateBudgetCard` add kiye |
| `components/BudgetPickerModal.tsx` | **NEW** — existing budget select karo ya naya banao (inline) |
| `screens/CreateCardScreen.tsx` | **Poora rewrite** — proper 3-step wizard + live card preview |

## Important logic change

**Purani screen sirf `createCardholder` call kar rahi thi — actual card
kabhi issue hi nahi hoti thi** (README bhi yahi note karta hai — "card
issuance" = createCardholder, batch/routes me real create-card call
nahi thi). Ab flow poora hai:

```
ensureCardholderId(binId)
  → listCardholders() me se same-bin ka APPROVED cardholder dhundo
  → agar nahi mila: createCardholder() + triggerCardholderKyc() (best-effort)
  → cardholderId return karo
        ↓
cardMode = formFactorToCardMode(bin.formFactor)   // VIRTUAL_CARD | PHYSICAL_CARD
        ↓
PREPAID → createCard({ binId, cardholderId, cardMode, useType, label, amount })
BUDGET  → createBudgetCard({ binId, cardholderId, cardMode, budgetId, label })
```

## New screen (wizard) — kya dikhega user ko

1. **Live card preview** — top pe, bin form-factor (virtual/physical)
   ke hisaab se real card face image/gradient use karke, label ke
   saath.
2. **Step 1 — Card type**: "Prepaid Card" vs "Budget Card" — dono
   selectable info-cards, icon + one-line description ke saath.
3. **Step 2 — Card form**: existing BIN list (Virtual/Physical),
   "RECOMMENDED" badge same as pehle.
4. **Step 3 — Type-specific**:
   - **Prepaid**: "How will you use it?" (Everyday spending / One-time
     use — `useType`), optional starting balance input, optional label.
   - **Budget**: "Select a budget" row → opens `BudgetPickerModal`
     (list existing budgets OR create new inline with just a name —
     matches `card.service.js#createBudget`'s only required field).
5. CTA button text badalta hai selected type ke hisaab se ("Create
   Prepaid Card" / "Create Budget Card"), disabled jab tak required
   fields na bhare ho.

## Things to double-check against your Interlace agreement

1. **`useType` has NO documented enum** anywhere in the backend
   (`card.service.js` sirf `required` check karta hai, value validate
   nahi karta). `constants.ts` → `USE_TYPE_OPTIONS` me do reasonable
   guesses daale hain (`STANDARD`, `SINGLE_USE`) — same pattern jo
   already `ACCOUNT_PURPOSE_OPTIONS`/`SOURCE_TYPE_OPTIONS` ke liye use
   ho raha tha. Interlace se confirm karke swap kar dena.
2. **Cardholder reuse logic** (`ensureCardholderId`) ek naya cardholder
   sirf tabhi banata hai jab same `binId` ke liye koi `ACTIVE` ya
   `KYC_PASSED` cardholder na mile — agar tumhara business rule
   different hai (e.g. per-card-type alag cardholder), ye check
   `screens/CreateCardScreen.tsx` me easily adjust ho sakta hai.
3. **Budget picker** filhaal saare budgets dikhata hai (koi
   type-based filter nahi) — agar budgets sirf ek particular account
   ke liye scope karne hain, `listBudgets()` already `accountId` backend
   pe apne aap set kar deta hai (`user.interlaceAccountId`), kuch extra
   nahi karna padega.
