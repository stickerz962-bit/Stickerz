# Firebase setup for Stickerz

The current development branch integrates Firebase-backed storefront product reads and administrator product management. It is **not production-ready until the one-time Firebase setup below is completed and verified**.

## Required one-time setup in Firebase Console

1. Open project `stickerz-922b9` and confirm the registered Web app configuration.
2. Enable Authentication > Sign-in method > Email/Password.
3. Create the Cloud Firestore database.
4. Create the default Storage bucket if product image uploads are needed.
5. Create the first administrator in Firebase Authentication. Do not make every signed-in user an admin.
6. Set the custom claim `admin: true` for that administrator using a trusted Admin SDK environment (for example, a one-time local script run with a service-account credential stored outside this repository). Never place a service-account key in the frontend, chat, or GitHub repository.
7. Review and deploy rules to the intended project: `firebase deploy --only firestore:rules,storage`.
8. Ensure the six `VITE_FIREBASE_*` GitHub Actions secrets are configured and available to the Pages build. Never paste secret values into source files.
9. Verify the deployed site is built from the intended branch and that Firebase is initialized successfully.

## Current integration

- The storefront subscribes to active documents in `products` from Firestore when Firebase is configured. If the cloud read fails, it displays an error rather than silently substituting local preview data.
- The admin page requires Email/Password sign-in and the Firebase custom claim `admin: true`. There is no public signup flow.
- Product create/edit, visibility changes, deletion, and image uploads use Firestore/Storage.
- If Firebase is not configured in a build, the storefront may show local preview data; this is not shared between devices and is not a production catalog.
- Existing products stored in browser `localStorage` are **not migrated automatically**. Export/record and import them deliberately after the cloud setup is verified.

## Intended data model

- `products/{productId}`: name, price, category, description, imageUrl, active, updatedAt.
- `orders/{orderId}`: items, customerName, customerPhone, customerAddress, notes, status, createdAt. Checkout/order submission is not implemented as a complete customer flow yet.

## Security notes

- Firestore product writes and image uploads require the Firebase Auth custom claim `admin: true`.
- Public product reads are limited to active products; admin product listing requires the admin claim.
- Current order rules allow visitors to create a pending order with an allowlist of fields, but the checkout flow is not complete and the rules still need stronger validation of item structure, quantities, and price handling before accepting real orders.
- Rules do not create an admin account or set custom claims. Never open database writes to all users.
- Do not accept real customer orders or announce production readiness until rules, admin access, the deployed build, and end-to-end tests have all been verified.
