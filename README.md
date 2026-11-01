# ANTI PRESSURE — فُكّي الضغط

Arabic-first, RTL customer experience for a personalized women's coloring book.

## Current customer preview

- Responsive Arabic homepage and 30-artwork selection journey.
- Five illustrative cover concepts and personalized name preview.
- Introductory offer display: 190 EGP for the first 60 minutes after the first visit on the same browser; then 240 EGP. Shipping is separate.
- The countdown start is persisted in browser localStorage so a refresh does not restart it.
- A small playful brand-character message has been added to the homepage.

## Important production limitations

This repository is currently a frontend preview. It is **not ready to accept real orders or payments**.

- The artwork and cover catalogue is still illustrative demo content. Admin-managed uploads that synchronize to every customer are not implemented.
- The existing admin app is an old local-browser prototype, not a secure ANTI PRESSURE admin panel. Do not use it for real content, customers, or business operations.
- Firebase Authentication, Firestore, and Storage are not connected. No secure artwork delivery or original-file protection is active.
- The offer countdown is a browser-side preview only. It is not authoritative and can be reset or manipulated by clearing browser storage or changing device time. A trusted server must issue and validate offer expiry and lock the order price before any real checkout.
- Customer checkout, order creation, InstaPay review, shipping calculation, production PDFs, and fulfillment are not enabled.
- Browser-visible artwork cannot be made impossible to screenshot or copy. Production protection must keep original high-resolution assets private and serve only controlled preview renditions.

## Required production implementation

1. Firebase Authentication with server-controlled admin authorization.
2. Firestore-backed artwork, cover, pricing, offer, and order records.
3. Private Storage for original high-resolution artwork and cover masters; generated preview derivatives for customer browsing.
4. Server-side offer start/expiry and order-price validation; never trust a client-submitted price.
5. Secure guest checkout, payment review, shipping settings, order management, and production PDF generation.
6. Emulator-based Firestore/Storage rules tests before publishing any Firebase rules.

No Firebase resources, security rules, billing, or production services are deployed by this preview branch.

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
