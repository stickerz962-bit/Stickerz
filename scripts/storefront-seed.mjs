export const starterCategories = [
  ['responsibilities', 'فوضى المسؤوليات'],
  ['moods', 'تقلبات المزاج'],
  ['people-relationships', 'الناس والعلاقات'],
  ['coffee-food', 'قهوة وأكل'],
  ['love-relationships', 'حب وعلاقات'],
  ['work-money', 'شغل وفلوس'],
  ['home-family', 'البيت والعيلة'],
  ['self-care', 'اهتمام بنفسي'],
  ['overthinking', 'تفكير زيادة'],
  ['wisdom-humor', 'حكمة وضحك'],
];

export const publicSettings = {
  brandName: 'ANTI PRESSURE',
  brandNameAr: 'فُكّي الضغط',
  currency: 'EGP',
  standardBookPrice: 240,
  introductoryBookPrice: 190,
  introductoryOfferDurationSeconds: 3600,
  offerEnabled: true,
  bookArtworkCount: 30,
  shippingDisplayMode: 'quote_before_confirmation',
  paymentMethods: ['cod', 'instapay'],
};

function assertCompatibleSettings(existing) {
  for (const [key, expected] of Object.entries(publicSettings)) {
    const actual = existing?.[key];
    const same = Array.isArray(expected)
      ? Array.isArray(actual) && expected.length === actual.length && expected.every((value, index) => actual[index] === value)
      : actual === expected;
    if (!same) {
      throw new Error(`Existing settings/public has a conflicting value for "${key}". Nothing was overwritten; review it manually before rerunning.`);
    }
  }
}

/**
 * Creates missing starter category/settings documents only.
 * Existing documents are never overwritten. The db argument is a Firebase Admin Firestore instance.
 */
export async function seedStorefront({ db, serverTimestamp }) {
  if (!db || typeof serverTimestamp !== 'function') throw new TypeError('A Firestore Admin instance and serverTimestamp function are required.');

  const categoryRefs = starterCategories.map(([id]) => db.collection('categories').doc(id));
  const settingsRef = db.collection('settings').doc('public');
  const snapshots = await db.getAll(...categoryRefs, settingsRef);
  const categorySnapshots = snapshots.slice(0, categoryRefs.length);
  const settingsSnapshot = snapshots.at(-1);

  if (settingsSnapshot.exists) assertCompatibleSettings(settingsSnapshot.data());

  const batch = db.batch();
  let createdCategories = 0;
  for (let index = 0; index < starterCategories.length; index += 1) {
    const [id, title] = starterCategories[index];
    const snapshot = categorySnapshots[index];
    if (snapshot.exists) {
      const existing = snapshot.data();
      if (existing?.title !== title || existing?.slug !== id) {
        throw new Error(`Existing category "${id}" conflicts with the starter definition. Nothing was overwritten.`);
      }
      continue;
    }
    const timestamp = serverTimestamp();
    batch.create(categoryRefs[index], {
      title,
      slug: id,
      description: '',
      sortOrder: index + 1,
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    createdCategories += 1;
  }

  let createdPublicSettings = false;
  if (!settingsSnapshot.exists) {
    const timestamp = serverTimestamp();
    batch.create(settingsRef, { ...publicSettings, updatedAt: timestamp });
    createdPublicSettings = true;
  }

  if (createdCategories || createdPublicSettings) await batch.commit();
  return { createdCategories, createdPublicSettings, preservedCategories: starterCategories.length - createdCategories };
}

/** Grants admin:true to an existing Auth account while preserving its other custom claims. */
export async function grantAdminClaim({ auth, email }) {
  if (!auth || typeof email !== 'string' || !email.trim()) throw new TypeError('Firebase Auth and an admin email are required.');
  const user = await auth.getUserByEmail(email.trim());
  const claims = { ...(user.customClaims ?? {}), admin: true };
  await auth.setCustomUserClaims(user.uid, claims);
  return { uid: user.uid, email: user.email ?? email.trim(), claims };
}
