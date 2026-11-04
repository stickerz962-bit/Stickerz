# Customer order flow without Cloud Functions

## Decision
The MVP uses a constrained **guest Firestore order request** from the storefront. It does not require WhatsApp to submit an order and does not use Cloud Functions. The customer order is created directly in `orders`; it remains a request awaiting staff review and confirmation.

This is a limited static-client workflow, not a trusted server-side checkout or payment system.

## Customer journey
1. Customer selects exactly 30 artworks, a cover, and a cover name.
2. Customer reviews the book and enters name, Egyptian mobile, governorate, area/address, optional delivery notes, and COD or InstaPay preference.
3. Storefront creates a Firestore order with `fulfillmentStatus: new`, an untrusted price snapshot, no shipping fee/total, and payment status `unpaid` (COD) or `pending_review` (InstaPay).
4. Customer receives the Firestore order ID and a message that staff will review the request and contact them to confirm shipping and final price.
5. Admin reviews the order in the admin dashboard, verifies the customer details, 30 selected designs, cover/personalization, promotion eligibility, shipping cost, payment, and partner attribution.
6. Admin manually advances fulfillment status through confirmation, PDF preparation, printing, quality check, shipping, and delivery/cancellation.
7. Partner commission is a one-time 15 EGP only after verified delivery. Cancelled or undelivered orders earn zero. Do not automate commission credit without a trusted, idempotent ledger.

## Security and integrity
- Guest clients may create only a constrained new order. They cannot read, update, delete, mark paid, or change fulfillment status.
- Admin-only access is required to read and update orders.
- Do not expose Firebase Admin credentials, service account keys, or admin claims in frontend or repository.
- The browser-submitted price and promotion flag are untrusted. Firestore rules cannot verify whether the one-hour 190 EGP offer was still active; staff must check it before confirmation.
- Shipping fee and total are intentionally null until staff confirms the delivery quote.
- InstaPay selection is not proof of payment. Staff must verify payment independently.
- Referral query parameters are untrusted; staff must verify partner attribution before any commission.
- Guest order creation can be spammed; without a trusted backend there is no server-side rate limiting or anti-abuse verification.
- Avoid placing customer personal data in URLs or analytics.

## Limitations
- No Cloud Functions, server-side price validation, offer-session validation, shipping calculation, payment reconciliation, PDF generation, or automatic commission settlement.
- The admin dashboard currently provides manual order review/status management; staff must handle production PDFs and customer follow-up separately.
- Rules and indexes must be deployed before guest order creation and admin order access work in production.
- The admin account must exist in Firebase Authentication and receive the `admin: true` custom claim through the approved bootstrap workflow.
- Review the current Firebase project configuration and deployment prerequisites before production launch.

## Future upgrade path
When the business is ready to operate a trusted backend, move order creation, pricing/offer validation, anti-abuse controls, payment verification, PDF generation, and commission ledger writes to server-controlled endpoints. Until then, treat every guest order as an unconfirmed request and manually verify all customer-submitted values.
