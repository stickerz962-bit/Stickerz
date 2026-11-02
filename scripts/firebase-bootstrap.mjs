import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { grantAdminClaim, seedStorefront } from './storefront-seed.mjs';

const projectId = process.env.PROJECT_ID;
const adminEmail = process.env.ADMIN_EMAIL;

if (projectId !== 'stickerz-922b9') {
  throw new Error('Refusing to bootstrap an unexpected Firebase project.');
}
if (!adminEmail) {
  throw new Error('ADMIN_EMAIL is required. Create the intended Firebase Auth user first.');
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId,
});
const db = getFirestore(app);
const auth = getAuth(app);

const seedResult = await seedStorefront({
  db,
  serverTimestamp: () => FieldValue.serverTimestamp(),
});
const adminResult = await grantAdminClaim({ auth, email: adminEmail });

console.log(JSON.stringify({
  projectId,
  seed: seedResult,
  admin: { uid: adminResult.uid, email: adminResult.email, adminClaimGranted: adminResult.claims.admin === true },
  note: 'Existing documents and unrelated custom claims were preserved.',
}, null, 2));
