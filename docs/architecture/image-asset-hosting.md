# ANTI PRESSURE image asset hosting — free-tier decision

## Decision for the current phase

Use the existing public GitHub Pages deployment as the temporary host for **low-resolution customer preview derivatives only**, stored as versioned static files in the repository (for example, `public/catalog/previews/AP-001.webp`). Store only the relative preview path in Firestore's `previewAssetRef`.

This is suitable for a small launch catalog and requires no Firebase Storage activation, billing upgrade, API secret, or additional vendor account. The repository and preview files are public, so this is not a private-image solution.

## Original artwork and print files

- Keep print-resolution originals, layered source files, and final cover masters offline in the production owner's private backup for now.
- Never put originals, print PDFs, customer order files, or payment evidence in the public repository.
- A public browser preview can be saved or screenshotted; no frontend technique can guarantee copy prevention.
- Do not create an admin upload feature that writes private originals to GitHub or exposes repository credentials in the browser.

## Firestore references

- `previewAssetRef`: relative path to a public, optimized preview file only.
- `originalAssetRef`: leave unset until a private storage/controlled delivery solution is explicitly approved.
- Do not store binary data or base64 in Firestore.

## Later upgrade path

When private originals, admin uploads, protected print-PDF generation, or reliable high-volume image delivery are required, compare a private object-storage provider and its current free quotas, egress limits, access controls, and regional availability. Firebase Storage remains disabled until the user explicitly approves any required plan change. No free-tier allowance should be assumed permanent.

## Current limitations

The current Firebase catalog foundation reads metadata, but it does not yet upload or host image files. Actual artwork and cover images have not been supplied. The existing demo artwork remains illustrative.
