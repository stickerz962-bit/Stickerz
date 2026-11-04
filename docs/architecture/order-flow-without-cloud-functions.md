# Customer order flow without Cloud Functions

## Decision
The first no-Cloud-Functions version uses a **manual WhatsApp order request**. It does not write customer orders, payments, or commission entries directly to Firestore from the browser.

This is a safe operational fallback for a static GitHub Pages storefront. It is not an automated checkout/fulfillment system.

## Customer journey
1. Customer selects exactly 30 artworks, a cover, and a cover name.
2. Customer reviews the selections and enters delivery details (name, Egyptian mobile, governorate, area/address, optional notes).
3. Storefront summarizes product price, shipping as “confirmed by support”, and payment methods (COD or InstaPay with manual verification).
4. Storefront generates a readable order-request reference in the browser and opens WhatsApp with a prefilled message containing the customer/contact/address, chosen cover/name, selected artwork IDs and names, and referral code.
5. Customer presses Send in WhatsApp. The order is **not considered placed** until staff reply and confirm it.
6. Staff manually create a record in a controlled order register/admin process, verify price, stock/designs, delivery cost, payment, and partner attribution.
7. Staff update status manually: New → Confirmed → PDF preparation → Printing → QC → Ready to ship → Shipped → Delivered / Cancelled.
8. Partner commission is calculated manually only after verified Delivered status, once per order (15 EGP); cancelled/non-delivered orders get zero. Keep a ledger/reference to prevent duplicates.

## Security and integrity
- Do not permit public Firestore writes to `orders`, `payments`, `orderEvents`, or partner commission ledger.
- Do not accept client-side “paid”, “delivered”, or commission-earned claims as authoritative.
- Do not expose Firebase Admin credentials, service account keys, or admin claims in frontend or repo.
- Referral query parameters are untrusted; staff must verify partner attribution before confirming commission.
- The order-request code generated in browser is a customer reference only, not a secure unique ID or authoritative record.
- Avoid putting unnecessary sensitive data into query strings, analytics, or public documents.
- WhatsApp message contains personal delivery information; warn customer it will be sent to the business through WhatsApp.

## Limitations
- No automatic Firestore order record, status updates, payment reconciliation, PDF generation, or commission settlement.
- Customer needs WhatsApp installed/available and must manually send the message.
- WhatsApp prefilled text can be edited; staff must verify all details.
- Shipping price is not guaranteed until confirmed by staff.
- A manual register (restricted access) is required and should be backed up.

## Future upgrade path
When the business is ready to fund and operate a trusted backend, replace the WhatsApp handoff with a server-validated order endpoint. Keep the current locked Firestore rules until the backend and security tests are reviewed. Do not enable direct anonymous order writes as a shortcut.
