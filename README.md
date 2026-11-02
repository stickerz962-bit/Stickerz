# ANTI PRESSURE — فُكّي الضغط

Arabic-first, RTL storefront prototype for a personalized women's coloring book.

## Current project state

- The current `main` branch contains the customer-facing storefront prototype and an authenticated Firestore catalog administration interface.
- The admin page at `/admin.html` signs in through Firebase Authentication and requires the trusted custom claim `admin: true`. It does not allow self-registration or self-granted roles.
- The admin interface manages categories, artwork metadata, and cover metadata in Firestore. New artworks/covers start unpublished; publishing requires a preview reference and the artwork phrase.
- File upload is intentionally not implemented: Firebase Storage is not enabled, and original print assets must never be entered as public preview references.
- The customer artwork and cover visuals are placeholders. Do not treat them as final printable assets.
- Firebase web configuration is supplied through `VITE_FIREBASE_*` environment variables. The public storefront reads only active catalog documents; the admin writes catalog metadata under Firestore rules.

## Security and backend status

- `firestore.rules` is a deny-by-default baseline in `main`.
- Public reads are limited to published catalog documents and safe public settings. Catalog writes require a trusted Firebase Authentication custom claim (`admin: true`).
- Orders, payments, and order-event writes are denied from browser clients, including admin clients, until a trusted server-side workflow exists.
- See [the admin access guide](docs/security/admin-access.md), [the Firestore data model](docs/architecture/firestore-schema.md), and [the GitHub Firebase bootstrap guide](docs/security/github-firebase-bootstrap.md).
- The opt-in GitHub Actions workflow can deploy Firestore rules/indexes, create missing starter categories and public settings, and grant the admin claim to an existing Auth user using short-lived GitHub OIDC credentials.
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
- Do not enable Cloud Functions, Cloud Run, or any paid service.
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

See [the Firebase bootstrap setup guide](docs/security/github-firebase-bootstrap.md) before dispatching the live workflow.
