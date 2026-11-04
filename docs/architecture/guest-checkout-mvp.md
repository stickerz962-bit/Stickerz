# Guest checkout MVP — no Cloud Functions

Status: implemented on `feat/customer-order-flow-foundation`, pending CI/security validation and review. Not deployed to Firebase.

## Customer flow
1. Select exactly 30 artwork IDs and choose cover/name.
2. Review book and continue to checkout.
3. Enter name, Egyptian mobile, governorate, area, address, optional delivery note and COD/InstaPay preference.
4. Submit order directly to Firestore `orders`.
5. Display order document ID and explain that staff will review and confirm shipping/total.

The storefront records an order as `fulfillmentStatus: new`. It does not treat InstaPay as paid and does not calculate shipping.

## Admin
The admin app adds an Orders tab (admin claim `admin:true`) that lists orders, customer/contact/address, book configuration, price snapshot, payment method/status and partner code. Admin can update fulfillment status.

## Firestore rules
- Guest create only: strict top-level field allowlist, customer/address limits, exactly 30 artwork entries, book price limited to 190 or 240 EGP, shipping/total left null pending quote, payment status limited to unpaid/pending_review, fulfillment status must be new, and timestamps must be server timestamps.
- Guest cannot read, update, delete or change payment/fulfillment status.
- Admin can read/update/delete orders.
- Payment and order-event collections remain protected.

## Limitations / review requirements
This is a static-client direct-write workflow, not a trusted backend:
- Firestore rules cannot reliably validate the one-hour offer session based on browser localStorage. The 190 EGP price is a customer-submitted snapshot and must be checked by staff before order confirmation.
- Shipping fee and total are intentionally null until staff confirms the delivery quote.
- The order payload and partner code are untrusted. Staff must verify selected artworks, promotion eligibility and partner attribution.
- Client-created guest orders can be spammed; no server-side throttling or anti-abuse verification is available.
- Do not award the fixed 15 EGP partner commission until a verified delivery and an idempotent admin-ledger process exist.
- Rules are versioned in this branch only; they have not been deployed.
- Do not merge or launch production orders until Firestore emulator tests and production Firebase configuration are reviewed.
