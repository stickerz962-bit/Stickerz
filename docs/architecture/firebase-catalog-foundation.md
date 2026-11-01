# Firebase catalog foundation

This change adds a client-side Firebase initialization guard and a typed, read-only catalog repository.

## Configuration
- Copy `.env.example` to `.env.local` for local development.
- Use only the Firebase Web App configuration values: API key, auth domain, project ID, and app ID.
- These are public client configuration values, not service-account credentials.
- Never add service-account JSON, private keys, or admin credentials to the frontend or repository.
- `VITE_CATALOG_MODE=demo` forces demo mode. If Firebase is not configured, the repository safely returns the supplied demo catalog.

## Runtime behavior
- Reads only active `categories`, `artworks`, and `covers`, ordered by `sortOrder`.
- Validates required document fields before returning typed records.
- Firestore empty collections remain empty; the repository does not silently mix demo data into a live catalog.
- Read errors return an empty live catalog with a warning; the caller decides how to present the error.
- This foundation is not yet wired into the customer UI. The existing homepage and builder remain unchanged and continue using their current demo data.

## Not performed
- No Firestore collections or documents created.
- No security rules deployed or changed.
- No Firebase Storage, Cloud Functions, Cloud Run, billing, or paid services enabled.
- No real orders or payments enabled.
