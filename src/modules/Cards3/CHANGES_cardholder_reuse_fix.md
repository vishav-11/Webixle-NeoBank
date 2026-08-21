# Fix: cardholder reuse detection was silently broken — the real bug

You sent a real curl + response for `createCardholder`. That response exposed
the actual bug: it worked (200, cardholder created with `status: "ACTIVE"`),
but the app still wouldn't move to step 5. Root cause:

## The bug

A cardholder object has **no `binId` field**. It has `cardBinList: string[]`
— an array, because one cardholder can be provisioned across multiple bins:

```json
{
  "id": "2085254063812153346",
  "status": "ACTIVE",
  "cardholderTier": "CONSUMER",
  "cardBinList": ["1987713856125325316", "1987713856125325314"],
  ...
}
```

Step 4's "do I already have a cardholder for this bin" check was:
```ts
const reusable = existingCardholders.find((c) => c.binId === selectedBinId);
```
`c.binId` doesn't exist on the real object, so this was always
`undefined === "1987713856125325314"` → always `false`. Every time — even
right after successfully creating one — the app treated it as "no cardholder
yet" and either got stuck or tried to create a duplicate.

## Also fixed alongside it

- **`cardholderTier` is required in practice**, not optional — your working
  curl sends `"cardholderTier": "CONSUMER"`. `service.ts#createCardholder`
  now always sends it (`CARDHOLDER_TIER_DEFAULT = "CONSUMER"` in
  `constants.ts`), instead of omitting it like before.
- **`mapCardholder` now captures the real response shape** — `cardBinList`,
  `firstName`, `lastName`, `userName`, `dob`, `nationality`,
  `cardholderTier`, `businessModel`, `address` — all of which the API
  actually returns and which the old mapper silently dropped.
- **Step 4's UI now shows the cardholder's own returned name/email**
  (`userName` / `firstName + lastName` / `email` from the API response),
  falling back to the local profile only if those are missing — instead of
  always showing the local profile guess regardless of what came back.
- Reuse check fixed to `c.cardBinList?.includes(selectedBinId)`.

## Why this matters beyond just this bug

`accountId` also comes back on the user's own profile
(`user.interlaceAccountId`) — worth noting for anyone extending this module:
every mutating call already gets `accountId` filled in **server-side** from
the authenticated user (`body.accountId || user.interlaceAccountId` in
`card.service.js`), so the frontend deliberately does NOT send it. That part
was already correct and doesn't need to change.
