# Firebase setup for Stickerz

This repository contains the client SDK configuration and deny-by-default database/storage rules as a foundation. It does **not** mean Firebase services are enabled or that the storefront/admin have been migrated yet.

## Required one-time setup in Firebase Console
1. Open project `stickerz-922b9` and register a Web app. Copy its web app configuration into an untracked `.env.local` based on `.env.example`.
2. Enable Authentication > Sign-in method > Email/Password.
3. Create the Cloud Firestore database in production mode.
4. Create the default Storage bucket if product image uploads are needed.
5. Create the first administrator using Firebase Authentication. Do not make every signed-in user an admin.
6. Set the custom claim `admin: true` for the administrator using a trusted Admin SDK environment (for example a one-time local script run with a service-account credential stored outside this repository). Never place a service-account key in the frontend or GitHub repository.
7. Deploy rules using Firebase CLI after reviewing the target project: `firebase deploy --only firestore:rules,storage`.
8. Add the six `VITE_FIREBASE_*` values as GitHub Actions repository secrets/variables and expose them to the build step before deploying Pages.

## Intended data model
- `products/{productId}`: name, price, category, description, imageUrl, active, updatedAt.
- `orders/{orderId}`: items, customerName, customerPhone, customerAddress, notes, status, createdAt.

## Security notes
- Firestore product writes and image uploads require the Firebase Auth custom claim `admin: true`.
- Public product reads are limited to active products. Admins can read inactive products.
- Orders may be created by visitors only with the allowlisted fields and a pending status; only admins can read/manage them.
- Rules do not create an admin account or set custom claims. Never open database writes to all users.
- The current UI still uses localStorage until a subsequent integration change is implemented and tested. Do not use this foundation to store real customer orders yet.
