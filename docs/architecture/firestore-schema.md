# Firestore Data Model — ANTI PRESSURE (فُكّي الضغط)

Status: Architecture proposal for review. Nothing in this document creates collections, deploys rules, enables billing, or changes Firebase resources.

## Product scope and locked behavior

- Arabic-first, RTL storefront for a personalized, spiral-bound women's coloring book.
- A guest chooses exactly 30 unique published artworks from the library. The system determines page order; customers do not reorder pages.
- The customer chooses one published cover and enters a personalized name (Arabic or Latin, max 40 characters in the current UI).
- Customer flow: artwork selection → cover/name → preview → shipping details → payment choice → order confirmation.
- Payment methods: cash on delivery (COD) and InstaPay with manual review. InstaPay evidence is never automatically approved.
- Shipping is configured by area and shown before order confirmation.
- Current commercial decision: standard book price 240 EGP; introductory price 190 EGP for one hour from the first visit. Shipping is separate. The browser timer is prototype-only; the server must determine eligibility and lock the order price.
- No customer account is required. Optional customer accounts may be added later.
- Original artwork and cover files must not be public. Firestore stores metadata and asset references, not image binaries.
- Current Firebase Storage activation requires a paid-plan upgrade in the user's console. Do not enable Storage, Blaze billing, Cloud Functions, or any paid service without explicit approval.

## Design principles

1. Keep public catalog metadata separate from private operational and customer data.
2. Treat all browser-submitted values as untrusted. The browser must never be authoritative for price, discount eligibility, shipping fee, payment state, order status, or staff identity.
3. Do not store image binaries, base64 images, payment evidence files, print-ready PDFs, or secrets in Firestore.
4. Guest order lookup must use a high-entropy reference/token and a carefully limited server-validated response; never expose orders through guessable IDs.
5. Admin access must be granted by a trusted server-controlled mechanism (for example, custom claims or a separately provisioned staff allowlist), never by a client-editable user profile field.
6. Keep audit events append-oriented. Customers cannot write privileged events or impersonate staff.
7. Use deny-by-default rules and Firebase Emulator Suite tests before any rules deployment.
8. Do not create or deploy collections merely by documenting this proposal.

## Proposed collections

### Public catalog

#### `categories/{categoryId}`
Fields:
- `title`: string
- `slug`: string
- `description`: string (optional)
- `sortOrder`: integer
- `active`: boolean
- `createdAt`, `updatedAt`: server timestamps

Initial category set (IDs should be stable slugs):
1. `responsibilities` — فوضى المسؤوليات
2. `moods` — تقلبات المزاج
3. `people-relationships` — الناس والعلاقات
4. `coffee-food` — قهوة وأكل
5. `love-relationships` — حب وعلاقات
6. `work-money` — شغل وفلوس
7. `home-family` — البيت والعيلة
8. `self-care` — اهتمام بنفسي
9. `overthinking` — تفكير زيادة
10. `wisdom-humor` — حكمة وضحك

#### `artworks/{artworkId}`
Use stable IDs such as `AP-001` through `AP-100`.
Fields:
- `title`: string
- `categoryId`: string (references categories)
- `phrase`: string (short Egyptian Arabic phrase printed with the artwork, when applicable)
- `previewAssetRef`: string (reference to a controlled preview derivative)
- `originalAssetRef`: string (private storage/provider reference; never a public download URL)
- `active`: boolean
- `sortOrder`: integer
- `version`: integer
- `createdAt`, `updatedAt`: server timestamps

Only active artworks in active categories appear in the customer library. An order must snapshot the exact selected IDs and artwork versions so later catalog edits cannot change an existing order.

#### `covers/{coverId}`
Fields:
- `title`: string
- `subtitle`: string
- `previewAssetRef`: string
- `originalAssetRef`: string (private reference)
- `active`: boolean
- `sortOrder`: integer
- `version`: integer
- `namePlacement`: object describing allowed name area, alignment, font constraints, and maximum size
- `createdAt`, `updatedAt`: server timestamps

The five initial cover concepts are content, not fixed schema values. Admins can add, edit, sort, publish, or unpublish covers.

### Orders and payment

#### `orders/{orderId}`
Create orders only through a trusted server-side path after that path is implemented and tested.
Fields:
- `publicReference`: random, non-sequential customer-facing reference
- `lookupTokenHash`: hash of a high-entropy guest lookup token (never store the raw token)
- `customer`: object containing name, phone, and any minimum required contact fields
- `shipping`: object containing governorate, area, address details, delivery notes, and a server-calculated fee snapshot
- `book`: object containing exactly 30 unique artwork snapshots (ID, version, title/phrase snapshot and print order), cover snapshot (ID/version), and personalized name
- `pricing`: object containing server-calculated base price, discount, final book price, shipping fee, currency (EGP), offer identifier, and server-calculated offer eligibility/expiry decision
- `paymentMethod`: `cod` or `instapay`
- `paymentStatus`: controlled enum such as `unpaid`, `pending_review`, `paid`, `rejected`, `refunded`
- `fulfillmentStatus`: controlled enum such as `new`, `confirmed`, `pdf_generating`, `ready_for_printing`, `printing`, `quality_check`, `ready_for_shipping`, `shipped`, `delivered`, `cancelled`
- `createdAt`, `updatedAt`: server timestamps

Do not accept client-supplied totals, shipping fees, discount values, payment status, fulfillment status, or staff actions as authoritative. Enforce exactly 30 distinct currently published artwork IDs and one currently published cover at order creation. Preserve the price and catalog snapshots on the order.

#### `payments/{paymentId}`
Fields:
- `orderId`: string
- `method`: `cod` or `instapay`
- `amount`: server-calculated number
- `currency`: `EGP`
- `status`: `pending_review`, `approved`, `rejected`, or `refunded`
- `transferReference`: optional customer-entered reference
- `evidenceAssetRef`: optional private reference only if a compliant file-storage solution is later approved
- `reviewerUid`: staff UID when reviewed
- `reviewedAt`, `createdAt`, `updatedAt`: server timestamps

InstaPay remains manual review. The customer cannot approve their own payment. Do not upload evidence to Firestore or expose evidence publicly.

#### `orderEvents/{eventId}`
Append-oriented audit record:
- `orderId`: string
- `eventType`: string from a controlled list
- `fromStatus`, `toStatus`: optional status values
- `actorType`: `customer`, `admin`, or `system`
- `actorUid`: trusted UID when available; never trust a client-supplied staff identity
- `note`: optional bounded text
- `createdAt`: server timestamp

### Configuration and access control

#### `settings/public`
Only safe storefront configuration:
- `currency`: `EGP`
- `standardBookPrice`: 240
- `introductoryBookPrice`: 190
- `introductoryOfferDurationSeconds`: 3600
- `offerEnabled`: boolean
- `shippingDisplayMode`: string
- `updatedAt`: server timestamp

Public settings are display hints only. Trusted order creation must read authoritative settings and calculate the final amount itself. Never put secrets, payment credentials, staff data, or private provider URLs here.

#### `settings/shipping`
Operational shipping configuration, readable only by trusted server-side code or authorized staff:
- `areas`: structured area-to-fee configuration
- `active`: boolean
- `updatedAt`: server timestamp

A public, sanitized shipping quote may be exposed through a controlled endpoint when implemented.

#### `adminUsers/{uid}`
Optional staff profile/role metadata, readable only by authorized staff and trusted server-side code. This document alone must not grant privileges unless its provisioning and rules are server-controlled. Prefer custom claims or a server-managed allowlist.

#### `offerSessions/{sessionId}` (optional, only if needed)
Server-managed first-visit offer session:
- `sessionTokenHash`: hash of a high-entropy opaque token
- `startedAt`, `expiresAt`: server timestamps
- `createdAt`: server timestamp

Do not use browser time or localStorage as proof of offer eligibility. Avoid collecting unnecessary device identifiers. Define retention and abuse controls before implementation.

## Image and file hosting decision

Firebase Storage is not enabled because the user has explicitly chosen to remain on the current free plan and the console requests an upgrade. Therefore:
- Do not enable Storage or change the Firebase billing plan.
- Do not put original images or base64 blobs in Firestore.
- Keep the current demo placeholders clearly labeled as demos until a hosting option is selected.
- Evaluate repository-hosted optimized preview assets or a suitable external provider only after checking free-tier limits, terms, privacy, file size, and operational reliability.
- Public preview assets can be copied from a browser; no web implementation can guarantee they are impossible to screenshot or save.
- Original print assets must remain private and must not be linked directly from customer-facing pages.

## Security and validation requirements

- Firestore rules: deny by default; public read only for explicitly approved catalog fields/documents; no public writes.
- Customers must not be able to list all orders, payments, users, or events.
- Admin reads/writes require trusted staff authorization.
- Prefer trusted server-side order creation and state transitions. Do not deploy client-only order writes as a substitute.
- Validate phone/contact formats, field lengths, allowed enum values, maximum payload sizes, exactly 30 distinct artwork IDs, published status, cover availability, price, offer expiry, and shipping fee on trusted code.
- Rate-limit order creation and guest lookup when a trusted backend is introduced.
- Never store raw lookup tokens, credentials, private API keys, or service-account material in the repository or Firestore.
- Test rules and trusted workflows in emulators before deployment.

## Implementation sequence

1. Approve this data model and confirm the commercial values and guest checkout flow.
2. Add Firebase Web SDK configuration using public web-app configuration only; keep secrets out of source control.
3. Create a typed catalog repository and replace hardcoded customer catalog data with a loading/empty/error state. Keep demo data behind an explicit demo mode until real content exists.
4. Build an ANTI PRESSURE admin experience for categories, artworks, covers, and order operations. Do not reuse the legacy Stickerz product admin as-is.
5. Select and approve an image-hosting approach compatible with the user's free-tier requirement.
6. Write Firestore rules and tests; deploy only after explicit review and approval.
7. Implement a trusted backend for order creation, pricing/offer validation, payment review, and status transitions only after reviewing free-tier availability and cost. Do not enable paid services without explicit approval.
8. Add print-PDF generation and private production asset delivery after a secure, cost-reviewed file-hosting/backend decision.

## Explicitly out of scope for this proposal

- Creating Firestore collections or sample production data.
- Deploying Firestore or Storage rules.
- Enabling Firebase Storage, Cloud Functions, Cloud Run, Blaze billing, or any paid service.
- Accepting real customer orders or payments.
- Claiming that demo artworks/covers are final approved artwork.
