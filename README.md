# Stickerz

Arabic-first storefront starter for personalized children's stickers and gifts.

## Current status

This repository contains the initial React + TypeScript storefront scaffold and a proposed Firestore data model. The storefront intentionally shows an empty catalog: no real products, prices, checkout, payment flow, or customer data have been configured yet.

## Requirements

- Node.js 20 or newer
- npm

## Run locally

    npm install
    npm run dev

## Validate

    npm test
    npm run build

## Included

- React + TypeScript + Vite
- Arabic language and right-to-left document direction
- Responsive storefront layout
- Working category selection, search field, and empty-cart notice
- Vitest and Testing Library tests
- Firestore data-model proposal at docs/architecture/firestore-schema.md

## Not connected yet

- Firebase Authentication, Firestore, or Storage
- Real product catalog, prices, images, and template editor
- Customer accounts, orders, checkout, payment review, or print workflows
- Production security rules or deployments

Do not deploy Firebase resources or accept real customer data until access control, privacy requirements, and emulator-based rules tests have been implemented and reviewed.
