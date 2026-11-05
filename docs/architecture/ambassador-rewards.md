# Customer Ambassador Rewards — فُكّي الضغط

## Locked commercial rules

- A customer becomes an ambassador automatically when one of her orders reaches `delivered`.
- Reward: **15 EGP** for each distinct referred order successfully delivered.
- Minimum payout request: **50 EGP**.
- Partial payout is allowed; requested amount must be an integer, at least 50 EGP, and no greater than the available balance.
- Referral attribution has no time-based expiry. The first valid `?amb=CODE` referral captured in the browser remains attached until its associated order is delivered. The customer referral code is separate from the existing professional partner `?ref=CODE`.
- If a referred order is assigned to an approved professional partner, the partner attribution takes precedence; the same order never earns both rewards.
- Self-referrals are rejected by comparing normalized customer phone numbers.
- A full order refund reverses a previously credited 15 EGP commission exactly once. If the reward has already been paid out, the ambassador balance may become negative; later rewards offset that balance before new money becomes withdrawable.
- Payout review is manual by an admin. Rejection releases the reserved amount back to the available balance.

## Firestore ownership

| Collection | Owner / access |
|---|---|
| `ambassadors/{code}` | Cloud Functions write; admin read only |
| `ambassadorCommissions/{orderId}` | Cloud Functions write; admin read only |
| `ambassadorPayouts/{payoutId}` | Cloud Functions write; admin read only |
| `orders/{orderId}` | Existing guest order creation; admin read/update |

The customer dashboard never reads these collections directly. It calls authenticated HTTPS callable endpoints using a 256-bit bearer access token. Only the SHA-256 hash is stored in the order and ambassador profile. The public referral link contains only the referral code and reveals no balance, customer identity, or payout information.

## Backend flow

1. Guest checkout creates a random ambassador code and access token. The order stores the code plus the token hash in `ambassadorSetup`; the raw token remains in browser storage.
2. The order document trigger creates the ambassador profile when the order becomes delivered.
3. For a delivered referred order, the same trigger checks the referrer, rejects self-referral, checks approved partner attribution, and creates `ambassadorCommissions/{orderId}` in a Firestore transaction.
4. The deterministic commission document ID makes crediting idempotent. The trigger also reverses an existing credit when payment status becomes `refunded`.
5. The customer dashboard calls `getAmbassadorDashboard`; payout submission calls `requestAmbassadorPayout`.
6. Admin payout decisions call `reviewAmbassadorPayout`. Direct browser writes to balances, commissions, and payout documents are denied by Firestore rules.

## Important access limitation

The MVP stores the private dashboard bearer link in the same browser's local storage. The customer should bookmark or save the private dashboard URL after opening it; only the public referral link should be shared. If browser storage is cleared or the customer changes devices, there is no phone-OTP recovery flow yet. Do not expose the private dashboard URL in public posts. A verified-phone recovery flow can be added later without requiring a permanent customer account.

## Deployment gate

The Functions source and Firebase configuration are prepared in this branch, but **no Cloud Function has been deployed**. The existing project guardrail says not to enable Cloud Functions or upgrade billing without separate approval. Until the functions, rules, and indexes are deployed and verified, the ambassador rewards and payout workflow is not live and should not be advertised as operational.

Before live deployment:
- Confirm the Firebase billing plan and estimated Functions / Firestore costs.
- Confirm the GitHub OIDC service account has only the required deploy permissions.
- Deploy Firestore rules and indexes, then Functions to project `stickerz-922b9`.
- Run end-to-end tests for delivery, duplicate delivery events, partner precedence, self-referral, refund reversal, negative balances, concurrent payout requests, payout rejection, and payout completion.
- Verify the public order tracking projection still contains no PII.
