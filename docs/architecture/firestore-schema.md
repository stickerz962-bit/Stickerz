# Firestore Data Model — Stickerz

Status: Initial design proposal. These collections are not deployed or created by this document.

## Goals
- Arabic-first, RTL storefront for personalized children's stickers and gifts.
- Keep customer data, child photos, payment evidence, and print-ready assets private by default.
- Treat client-submitted data as untrusted; enforce authorization with Firestore/Storage rules and trusted server-side checks.
- Do not store secrets or credentials in Firestore documents committed to the repository.

## Proposed collections

### `users/{uid}`
Customer profile fields only, such as display name and contact details when needed. A profile document must never grant administrative privileges.

### `products/{productId}`
Public catalog metadata: title, description, categoryId, active status, display images, and price/currency. Validate prices and product availability on trusted server-side paths before order creation.

### `designTemplates/{templateId}`
Template metadata, version, allowed editable fields, preview asset reference, and active status. Template version must be captured when a customer saves a design or places an order.

### `designs/{designId}`
Owner UID, templateId, templateVersion, editable canvas JSON, preview reference, and timestamps. Enforce owner-only access and validate payload size/schema. Keep child images in private Storage paths.

### `orders/{orderId}`
Customer/guest reference, line-item snapshots, design references, delivery details, totals, currency, payment method, fulfillment status, and timestamps. Totals and status transitions must be validated by trusted code, not accepted from the browser as authoritative.

### `payments/{paymentId}`
Order reference, method, amount, currency, status, submitted transfer reference/evidence reference, reviewer UID, and audit timestamps. InstaPay v1 is a manual-review workflow unless an official supported API is verified. Customer-submitted evidence remains pending until an authorized reviewer approves it; the submitter cannot approve their own payment.

### `printJobs/{jobId}`
Order reference, validated print asset references, production status, assigned operator, and timestamps. Print-ready files must remain private and only be accessible to authorized staff.

### `orderEvents/{eventId}`
Append-oriented audit events for meaningful order/payment/production transitions. Do not allow customers to forge privileged actor identities or staff actions.

### `settings/public`
Non-sensitive storefront settings safe for public reads.

### `settings/operations`
Operational configuration restricted to authorized staff and trusted server-side access. Never expose secrets here.

## Security principles
1. Begin with deny-by-default Firestore and Storage rules.
2. Do not authorize admins based on a client-editable field in `users/{uid}`.
3. Validate ownership, role, allowed fields, state transitions, and numeric totals.
4. Restrict child photos, payment evidence, and print files to the minimum required audience.
5. Use separate staff authorization backed by trusted claims or a server-controlled role system.
6. Keep payment approval, order total calculation, and other privileged transitions on trusted server-side paths.
7. Test rules with the Firebase Emulator Suite before deploying any rules or resources.

## Before implementation
- Confirm actual product, pricing, fulfillment, and retention requirements with the project owner.
- Choose and document staff-role provisioning.
- Define guest checkout and order lookup without exposing other customers' records.
- Verify Firebase project configuration and test environments.
- Do not deploy collections, rules, Storage configuration, or Functions based on this proposal alone.
