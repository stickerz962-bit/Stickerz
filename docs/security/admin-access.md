# Admin access and Firebase security foundation

Status: implementation guide only. This repository change does not publish Firestore rules, create Firebase collections, provision an administrator, or change Firebase billing.

## Current boundary

- The existing `admin.html` remains a localStorage-only development preview. It is not protected by sign-in and must not be used for real customer, payment, or production data.
- Firebase client configuration may be present in the public web build. Those values identify the Firebase project; they are not an authorization mechanism.
- Firestore catalog access is designed around a trusted Firebase Authentication custom claim: `admin: true`.
- A user must never be able to grant themselves this claim from the browser or by editing a Firestore profile document.
- No client-side order, payment, audit-event, or fulfillment writes are enabled in this foundation.

## Required administrator provisioning (not yet performed)

A trusted project owner must provision the first admin claim using Firebase Admin SDK from a trusted local environment or another secured server environment. Do not put a service-account private key in the repository, browser code, GitHub Pages, chat, or GitHub Actions secrets for this static site.

Conceptual one-time operation:

```ts
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

initializeApp({ credential: applicationDefault() });
await getAuth().setCustomUserClaims('<AUTH_USER_UID>', { admin: true });
```

This snippet is explanatory only and is not run by the website. Before using it:
1. Create the intended admin account through Firebase Authentication.
2. Obtain that account's UID from the Firebase Console.
3. Run the operation locally on a trusted machine with Application Default Credentials configured securely, or use another trusted Admin SDK environment.
4. Never share or commit credential files. Remove temporary credentials from the machine when finished.
5. Sign out and sign in again (or force-refresh the ID token) so the custom claim is present.
6. Verify the account's ID token contains `admin: true` before exposing any live admin workflow.

Do not create a client-side "first admin" button, public email allowlist, or self-service role editor.

## Firestore rules in this branch

The accompanying `firestore.rules` file is a proposed security baseline:

- Public visitors can read only active categories, active artworks whose category is active, active covers, and `settings/public`.
- A verified admin custom claim can manage catalog documents and read protected operational records.
- Customer orders, payment records, and order events have no client writes, even from an admin browser.
- All unlisted paths are denied.
- Catalog documents should contain only fields safe for public display when active. Never place original file URLs, private notes, customer data, or secret values in public catalog documents.

Automated Firebase Emulator Suite tests are now included at `tests/firestore.rules.test.ts`. They cover anonymous and non-admin access, trusted admin catalog CRUD, inactive catalog documents/categories, protected order/payment/event paths, and default-deny behavior. Run them with `npm run test:emulator`. The suite must pass in CI and be reviewed before deployment; the rules are still not deployed and must not be published without explicit approval.

## Free-tier and file-hosting constraints

- Do not enable Firebase Storage or upgrade the Firebase plan as part of this work.
- Do not enable Cloud Functions, Cloud Run, or any paid service.
- Firestore stores catalog metadata and controlled preview references only; it is not an image/file host.
- Until a free and acceptable preview-hosting approach is approved, keep real artwork and cover assets unpublished. Never expose original print files or production PDFs through GitHub Pages.
- The introductory offer timer in the browser is display-only. It cannot validate the one-hour offer or determine an order total. A trusted order-creation service must calculate price, shipping, eligibility, and immutable order snapshots before real checkout can be enabled.

## Release gate

Do not connect the public storefront to a live catalog or accept real orders until:
1. Admin claim provisioning is completed and verified.
2. Firebase Emulator Suite rules tests pass in CI and are reviewed.
3. A suitable preview asset-hosting approach is approved.
4. A trusted server-side order and pricing workflow is designed, tested, and deployed.
5. Privacy, retention, spam prevention, and manual InstaPay review are addressed.
