# Partner / referral system — foundation

## Locked business rules
- Partner registration page title: **انضم كشريك**.
- Partner must provide a WhatsApp number.
- Admin partner list will provide a WhatsApp contact action using the partner's saved number.
- Fixed commission: **15 EGP per delivered order**, once per order.
- Cancelled, rejected, or not-delivered orders do not earn commission.
- Partner signup, attribution, delivered status, and payout must be verified by a trusted backend before money is credited.

## Current UI status
- `partner.html` is a visual/interaction prototype for onboarding.
- It validates name, Egyptian WhatsApp number, and social account input client-side.
- It does not persist submitted personal data, create partner accounts, generate real referral links, or promise commission.
- No Firebase rules or services were changed.

## Free image hosting direction
Use GitHub Pages-hosted optimized preview images in the repository (WebP/JPEG), and keep original print-ready artwork private/offline. Do not put high-resolution print originals or customer PDFs in a public repository. GitHub Pages is for public previews only; it is not a private asset store.

## Required before live referral commissions
1. Trusted server-side partner approval and referral code assignment.
2. Trusted order attribution snapshot; prevent partner self-editing order attribution.
3. Trusted transition to delivered state.
4. Idempotent commission ledger: unique order key, 15 EGP amount, delivery event reference.
5. Admin-only payout marking and immutable payout audit.
6. Admin partner directory with sanitized WhatsApp URL and explicit country-code handling.
7. Security rules and backend tests, reviewed before enabling real orders or commission payouts.

## Commission amount and operational boundary
- The single application constant is `PARTNER_COMMISSION_EGP = 15`; partner signup, partner dashboard, and admin approval use this value.
- Newly approved partner profiles store `commissionRate: 15` for display/configuration compatibility. The value is a fixed EGP reward per delivered order, not a percentage.
- Referral URLs currently carry `?ref=AP-...` but the storefront has no checkout/order-creation flow yet. The builder currently ends at a local preview; no order is created and no referral attribution is saved to an order.
- No commission is credited, shown as a balance, or payable until trusted order creation, immutable referral attribution, admin-controlled delivery confirmation, and an idempotent ledger are implemented and security-tested.

## Current release restriction
No Firebase Storage, Cloud Functions, Cloud Run, Firebase Billing, or paid provider is enabled by this work. Real orders and real commission balances remain unavailable until backend security is approved and implemented.
