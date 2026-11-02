# ANTI PRESSURE — فُكّي الضغط

Arabic-first, RTL storefront prototype for a personalized women's coloring book.

## Current project state

- The current `main` branch contains the customer-facing visual prototype and a local-only catalog admin preview.
- The admin page is not authenticated and stores edits in the current browser only. It is not a production control panel.
- The customer artwork and cover visuals are placeholders. Do not treat them as final printable assets.
- Firebase client initialization and a read-only Firestore catalog repository exist in the source, but live production operations are not enabled.

## Security and backend status

- `firestore.rules` in the security-foundation branch is a proposed deny-by-default baseline. Automated Firebase Emulator Suite tests are included in the PR; deployment remains pending review and explicit approval.
- Public reads are limited to published catalog documents and safe public settings. Catalog writes require a trusted Firebase Authentication custom claim (`admin: true`).
- Orders, payments, and order-event writes are denied from browser clients, including admin clients, until a trusted server-side workflow exists.
- See [the admin access guide](docs/security/admin-access.md) and [the Firestore data model](docs/architecture/firestore-schema.md).
- Do not enter real customer data or accept orders through this prototype.

## Locked product behavior

- Guest checkout; no customer account required.
- Customer chooses exactly 30 unique artworks; page order is assigned automatically.
- Customer chooses one cover and personalizes it with a name.
- Cash on delivery and InstaPay with manual review are the planned payment methods.
- Standard price: 240 EGP; introductory price: 190 EGP for one hour from the first visit on the same browser. Shipping is separate.
- The offer end timestamp is persisted in localStorage so refreshes do not restart the hour. Clearing browser storage or using another browser/device can start a new client-side timer.
- This is a storefront display timer only. Before real checkout, a trusted server must enforce offer eligibility and calculate shipping and the final order amount; client-side storage is not authoritative.

## Hosting and billing guardrails

- Firebase Storage is not enabled. Do not activate it or upgrade the Firebase billing plan.
- Do not enable Cloud Functions, Cloud Run, or any paid service without explicit approval.
- Do not store image binaries, originals, payment evidence, or production PDFs in Firestore.
- Until an approved preview-hosting solution is available, keep final artwork unpublished and originals private.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

## Validate

```sh
npm test
npm run test:emulator
npm run build
```
