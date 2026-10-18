# Stickerz

Arabic-first, RTL storefront preview for personalized children's stickers and gifts.

## Current preview features

- Responsive Arabic RTL storefront.
- Browser-based product admin at `/#admin`: create, edit, hide/show, and delete products; set EGP prices; upload a small product image; add a description and category.
- Product catalog, search, category filtering, and price display.
- Product entries are saved in the current browser's localStorage only, so they do not sync between devices or browsers.

## Important limitations

The admin screen is a prototype, **not a secure production admin**. There is no sign-in, shared database, or access control yet. Do not use it for real business operations or sensitive information. Product data and uploaded images remain on the same browser/device and can be lost when browser storage is cleared.

Firebase Authentication, Firestore, and Storage are not connected. Checkout, orders, payment review, customer accounts, template editing, and print workflows are not enabled. Do not deploy Firebase resources or accept real customer data until access control, privacy requirements, and emulator-based rules tests have been implemented and reviewed.

## Run locally

Requirements: Node.js 20 or newer and npm.

```sh
npm install
npm run dev
```

## Validate

```sh
npm test
npm run build
```

The Firestore data-model proposal is in `docs/architecture/firestore-schema.md`.
