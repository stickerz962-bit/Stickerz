# Firestore Data Model v1 — ANTI PRESSURE

Status: versioned implementation contract. This file documents the exact collection paths, document IDs, fields, types, ownership, and lifecycle. It does not create production documents or deploy Firebase resources.

Project: `stickerz-922b`  
Currency: EGP  
Standard book price: 240 EGP  
Introductory price: 190 EGP for 3,600 seconds from first eligible visit  
Book contents: exactly 30 distinct artworks and one personalized cover  
Checkout: guest; COD or InstaPay with manual review  
Shipping: separate from book price

## 1. Collection map

| Path | Document ID | Purpose | Access |
|---|---|---|---|
| `categories/{categoryId}` | stable slug | Public artwork categories | Public reads active; admin writes |
| `artworks/{artworkId}` | `AP-001` … `AP-100` | Artwork metadata and asset references | Public reads active in active category; admin writes |
| `covers/{coverId}` | `AP-COVER-01` … `AP-COVER-05` | Cover metadata and asset references | Public reads active; admin writes |
| `settings/public` | fixed ID `public` | Safe storefront prices and display settings | Public read; admin write |
| `settings/shipping` | fixed ID `shipping` | Private shipping fee table | Admin only; trusted server |
| `orders/{orderId}` | random Firestore ID | Customer order and immutable snapshots | Admin read; trusted server write |
| `payments/{paymentId}` | random Firestore ID | Payment attempts/review | Admin read; trusted server write |
| `orderEvents/{eventId}` | random Firestore ID | Append-only audit trail | Admin read; trusted server write |
| `adminUsers/{uid}` | Firebase Auth UID | Admin display/profile metadata only | Admin reads; trusted provisioning only |
| `offerSessions/{sessionId}` | random opaque ID | Optional server-validated offer session | Trusted server only |

No collection is to be populated with fake artwork or sample customer orders. Seed only the ten real category documents when an authorized admin chooses the seed action.

## 2. Shared conventions

- All document IDs are stable and case-sensitive.
- All timestamps are Firestore Timestamp values. Use server timestamps for writes.
- Monetary values are integer EGP piastres only if fractional amounts are ever needed; current whole-pound prices may be stored as integer EGP. Never use floating-point money.
- `active` means published and customer-visible; new catalog documents start with `active: false`.
- `sortOrder` is a non-negative integer. Ties are resolved by document ID in application code.
- `version` is a positive integer incremented on every approved catalog revision.
- Asset references are opaque provider/storage object references, not credentials and not original public URLs. Never store image bytes/base64 in Firestore.
- Unknown fields are ignored by clients; trusted server validation must reject unsupported fields in customer submissions.

## 3. Public catalog documents

### `categories/{categoryId}`

Required fields:

| Field | Type | Example |
|---|---|---|
| `title` | string, 1–60 chars | `فوضى المسؤوليات` |
| `slug` | string, unique stable slug | `responsibilities` |
| `description` | string, optional, max 240 | short category intro |
| `sortOrder` | integer >= 0 | `1` |
| `active` | boolean | `true` |
| `createdAt` | Timestamp | server timestamp |
| `updatedAt` | Timestamp | server timestamp |

Initial IDs and titles:
- `responsibilities`: فوضى المسؤوليات
- `moods`: تقلبات المزاج
- `people-relationships`: الناس والعلاقات
- `coffee-food`: قهوة وأكل
- `love-relationships`: حب وعلاقات
- `work-money`: شغل وفلوس
- `home-family`: البيت والعيلة
- `self-care`: اهتمام بنفسي
- `overthinking`: تفكير زيادة
- `wisdom-humor`: حكمة وضحك

### `artworks/{artworkId}`

IDs are exactly `AP-001` through `AP-100`.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `title` | string (1–80) | yes | Customer-facing title |
| `categoryId` | string | yes | Existing category document ID |
| `phrase` | string (0–180) | yes | Egyptian Arabic phrase printed with page |
| `previewAssetRef` | string | before publish | Approved low-resolution preview reference |
| `originalAssetRef` | string | no | Private original reference; never returned publicly |
| `printAssetRef` | string | no | Private print-ready source reference |
| `active` | boolean | yes | Default false |
| `sortOrder` | integer >= 0 | yes | Library ordering |
| `version` | integer >= 1 | yes | Starts at 1 |
| `createdAt` | Timestamp | yes | Immutable creation time |
| `updatedAt` | Timestamp | yes | Updated on every edit |
| `publishedAt` | Timestamp or null | no | Set by trusted/admin publish operation |

Publishing requires a valid approved preview reference, non-empty title and phrase, and an active category. A preview URL is not a substitute for the private original or print source. The public storefront must never request or receive `originalAssetRef` or `printAssetRef`.

### `covers/{coverId}`

IDs: `AP-COVER-01` through `AP-COVER-05`.

| Field | Type | Required | Notes |
|---|---|---:|---|
| `title` | string (1–60) | yes | Cover concept |
| `subtitle` | string (0–120) | no | Supporting line |
| `previewAssetRef` | string | before publish | Approved public preview |
| `originalAssetRef` | string | no | Private original reference |
| `printAssetRef` | string | no | Private print-ready source |
| `namePlacement` | map | no | `x`, `y`, `width`, `height`, `alignment`, `fontMin`, `fontMax` |
| `active` | boolean | yes | Default false |
| `sortOrder` | integer >= 0 | yes | Display order |
| `version` | integer >= 1 | yes | Starts at 1 |
| `createdAt`, `updatedAt` | Timestamp | yes | Server timestamps |
| `publishedAt` | Timestamp or null | no | Publication time |

## 4. Storefront configuration

### `settings/public`

Only safe customer-visible values belong here:

| Field | Type | Initial value |
|---|---|---|
| `brandName` | string | `ANTI PRESSURE` |
| `brandNameAr` | string | `فُكّي الضغط` |
| `currency` | string | `EGP` |
| `standardBookPrice` | integer | `240` |
| `introductoryBookPrice` | integer | `190` |
| `introductoryOfferDurationSeconds` | integer | `3600` |
| `offerEnabled` | boolean | `true` |
| `bookArtworkCount` | integer | `30` |
| `shippingDisplayMode` | string | `quote_before_confirmation` |
| `paymentMethods` | array<string> | `[\"cod\", \"instapay\"]` |
| `updatedAt` | Timestamp | server timestamp |

This document is display configuration only. A trusted order service must independently read authoritative price/offer settings and calculate the final total. Never put private InstaPay account details, secrets, shipping rates, staff data, or original asset references here.

### `settings/shipping`

Private admin/server-only document:

| Field | Type | Notes |
|---|---|---|
| `active` | boolean | Whether shipping quotes can be issued |
| `currency` | string | `EGP` |
| `areas` | map | keyed by stable area ID |
| `areas.{areaId}.governorate` | string | Governorate |
| `areas.{areaId}.areaName` | string | Area/district |
| `areas.{areaId}.fee` | integer >= 0 | Shipping fee in EGP |
| `areas.{areaId}.active` | boolean | Available for new quotes |
| `updatedAt` | Timestamp | Server timestamp |

Do not invent shipping prices. Admin must enter verified carrier rates before enabling this document.

## 5. Orders

### `orders/{orderId}`

Create only through a trusted server endpoint after validation. Use a random Firestore ID; never sequential customer-facing IDs.

| Field | Type | Notes |
|---|---|---|
| `publicReference` | string | Random, non-sequential order reference |
| `lookupTokenHash` | string | Hash only; never store raw guest lookup token |
| `customer.name` | string (1–80) | Required |
| `customer.phone` | string (normalized) | Required |
| `customer.email` | string or null | Optional |
| `shipping.governorateId` | string | Selected configured area |
| `shipping.governorateName` | string | Immutable display snapshot |
| `shipping.areaId` | string | Selected configured area |
| `shipping.areaName` | string | Immutable display snapshot |
| `shipping.address` | string (1–300) | Required |
| `shipping.deliveryNotes` | string (0–300) | Optional |
| `shipping.fee` | integer >= 0 | Server-calculated snapshot |
| `book.artworks` | array of 30 maps | Unique IDs, each with `artworkId`, `version`, `titleSnapshot`, `phraseSnapshot`, `printOrder` |
| `book.cover` | map | `coverId`, `version`, `titleSnapshot` |
| `book.personalizedName` | string (1–40) | Customer-selected cover name |
| `pricing.currency` | string | `EGP` |
| `pricing.standardBookPrice` | integer | Snapshot |
| `pricing.discountAmount` | integer | Server-calculated |
| `pricing.bookPrice` | integer | Server-calculated final book price |
| `pricing.shippingFee` | integer | Same as shipping fee snapshot |
| `pricing.totalAmount` | integer | Server-calculated book + shipping |
| `pricing.offerId` | string or null | Offer applied |
| `pricing.offerExpiresAt` | Timestamp or null | Server decision snapshot |
| `paymentMethod` | `cod` or `instapay` | Customer selection |
| `paymentStatus` | enum | `unpaid`, `pending_review`, `paid`, `rejected`, `refunded` |
| `fulfillmentStatus` | enum | See lifecycle below |
| `createdAt`, `updatedAt` | Timestamp | Server timestamps |

Fulfillment lifecycle values:
`new` → `confirmed` → `pdf_generating` → `ready_for_printing` → `printing` → `quality_check` → `ready_for_shipping` → `shipped` → `delivered`; terminal alternatives: `cancelled`.

A customer submission contains only selected IDs, cover ID, name, and contact/shipping choices. Ignore/reject all client-supplied prices, discounts, totals, payment status, fulfillment status, and staff identity. Require exactly 30 distinct currently published artwork IDs, active category membership, and one published cover. Snapshot versions and text at order creation so future catalog edits do not mutate old orders.

## 6. Payments and audit

### `payments/{paymentId}`

| Field | Type | Notes |
|---|---|---|
| `orderId` | string | Parent order ID |
| `method` | `cod` or `instapay` | Payment method |
| `amount` | integer | Server-derived EGP amount |
| `currency` | string | `EGP` |
| `status` | enum | `unpaid`, `pending_review`, `approved`, `rejected`, `refunded` |
| `transferReference` | string or null | Customer-provided reference, bounded |
| `evidenceAssetRef` | string or null | Private file reference only if storage is later approved |
| `reviewerUid` | string or null | Trusted staff UID |
| `reviewNote` | string or null | Bounded internal note |
| `reviewedAt` | Timestamp or null | Set by authorized review action |
| `createdAt`, `updatedAt` | Timestamp | Server timestamps |

InstaPay remains pending until a human admin reviews and approves/rejects it. Customer cannot set payment status. Do not upload payment screenshots to Firestore.

### `orderEvents/{eventId}`

Append-only event fields:
`orderId:string`, `eventType:string`, `fromStatus:string|null`, `toStatus:string|null`, `actorType:customer|admin|system`, `actorUid:string|null`, `note:string|null`, `metadata:map`, `createdAt:Timestamp`.

Only trusted server code creates events. Never accept actor identity or privileged state transitions from browser input.

## 7. Admin and offer-session metadata

### `adminUsers/{uid}`

Fields: `displayName:string`, `email:string`, `role:string`, `active:boolean`, `createdAt:Timestamp`, `updatedAt:Timestamp`, `lastLoginAt:Timestamp|null`. This is descriptive metadata only; it never grants privileges. Authorization remains the trusted Auth custom claim `admin:true`.

### `offerSessions/{sessionId}` (only when server-side offer enforcement is implemented)

Fields: `tokenHash:string`, `startedAt:Timestamp`, `expiresAt:Timestamp`, `consumedAt:Timestamp|null`, `createdAt:Timestamp`. The raw opaque token exists only with the guest/browser and is never stored. Avoid device fingerprinting.

## 8. Firestore indexes

The companion `firestore.indexes.json` defines composite indexes for active catalog ordering and common admin order/payment/event queues. Single-field indexes are handled by Firestore defaults.

## 9. Security invariants

- Default deny. Only active public catalog records and `settings/public` are anonymously readable.
- Admin catalog access requires trusted Firebase Auth custom claim `admin:true`.
- Customer browsers never write orders, payments, order events, shipping settings, admin metadata, or offer sessions.
- Admin browser may read protected operational records but must use trusted server endpoints for state changes.
- Private original/print references never leave trusted server/admin context.
- No Storage, Cloud Functions, Cloud Run, Blaze billing, or paid service is enabled by this schema.
- No real orders/payments until a trusted backend validates the entire order and pricing lifecycle.

## 10. Implementation status

This schema and index file are versioned in GitHub. They are not yet deployed to Firebase. Firestore collections are document-driven and appear when the first authorized document is written; do not create empty placeholder collections. The only approved initial seed action is the ten category records from the admin panel. Prices in `settings/public` should be seeded from the locked values above. Shipping fee rows must wait for verified carrier rates.
