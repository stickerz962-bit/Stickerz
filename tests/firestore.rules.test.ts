import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const projectId = 'demo-anti-pressure';
let testEnv: RulesTestEnvironment;

const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

async function seed() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'categories', 'published'), { title: 'Published', active: true, slug: 'published', sortOrder: 1 });
    await setDoc(doc(db, 'categories', 'draft'), { title: 'Draft', active: false, slug: 'draft', sortOrder: 2 });
    await setDoc(doc(db, 'artworks', 'AP-001'), { title: 'Artwork 1', active: true, categoryId: 'published', sortOrder: 1 });
    await setDoc(doc(db, 'artworks', 'AP-002'), { title: 'Artwork 2', active: true, categoryId: 'draft', sortOrder: 2 });
    await setDoc(doc(db, 'artworks', 'AP-003'), { title: 'Artwork 3', active: false, categoryId: 'published', sortOrder: 3 });
    await setDoc(doc(db, 'covers', 'cover-live'), { title: 'Cover live', active: true, sortOrder: 1 });
    await setDoc(doc(db, 'covers', 'cover-draft'), { title: 'Cover draft', active: false, sortOrder: 2 });
    await setDoc(doc(db, 'settings', 'public'), { shopName: 'ANTI PRESSURE', shippingFee: 50 });
    await setDoc(doc(db, 'settings', 'private'), { secret: 'never-public' });
    await setDoc(doc(db, 'orders', 'order-1'), { status: 'new' });
    await setDoc(doc(db, 'payments', 'payment-1'), { status: 'pending' });
    await setDoc(doc(db, 'orderEvents', 'event-1'), { event: 'created' });
    await setDoc(doc(db, 'unlistedCollection', 'secret'), { value: 'secret' });
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
  });
});

beforeEach(async () => {
  await seed();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore security rules — public catalog reads', () => {
  it('allows anonymous reads of published categories and covers only', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'published')));
    await assertFails(getDoc(doc(db, 'categories', 'draft')));
    await assertSucceeds(getDoc(doc(db, 'covers', 'cover-live')));
    await assertFails(getDoc(doc(db, 'covers', 'cover-draft')));
  });

  it('allows anonymous reads of published artwork only when its category is active', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'artworks', 'AP-001')));
    await assertFails(getDoc(doc(db, 'artworks', 'AP-002')));
    await assertFails(getDoc(doc(db, 'artworks', 'AP-003')));
    await assertFails(getDoc(doc(db, 'artworks', 'missing-artwork')));
  });

  it('allows anonymous query of published category/artwork/cover documents', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDocs(query(collection(db, 'categories'), where('active', '==', true))));
    await assertSucceeds(getDocs(query(collection(db, 'artworks'), where('active', '==', true), where('categoryId', '==', 'published'))));
    await assertSucceeds(getDocs(query(collection(db, 'covers'), where('active', '==', true))));
  });

  it('allows only the explicitly public settings document', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'settings', 'public')));
    await assertFails(getDoc(doc(db, 'settings', 'private')));
  });
});

describe('Firestore security rules — authenticated non-admin', () => {
  it('cannot read unpublished catalog records or write catalog', async () => {
    const db = testEnv.authenticatedContext('customer-1').firestore();
    await assertFails(getDoc(doc(db, 'categories', 'draft')));
    await assertFails(setDoc(doc(db, 'categories', 'new'), { active: true }));
    await assertFails(updateDoc(doc(db, 'categories', 'published'), { title: 'Hacked' }));
    await assertFails(deleteDoc(doc(db, 'covers', 'cover-live')));
    await assertFails(setDoc(doc(db, 'artworks', 'AP-999'), { active: true, categoryId: 'published' }));
  });
});

describe('Firestore security rules — trusted admin claim', () => {
  it('allows admin catalog CRUD and access to drafts', async () => {
    const db = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'categories', 'draft')));
    await assertSucceeds(setDoc(doc(db, 'categories', 'admin-created'), { active: false }));
    await assertSucceeds(updateDoc(doc(db, 'categories', 'published'), { title: 'Updated by admin' }));
    await assertSucceeds(deleteDoc(doc(db, 'covers', 'cover-draft')));
    await assertSucceeds(setDoc(doc(db, 'artworks', 'AP-ADMIN'), { active: false, categoryId: 'draft' }));
  });

  it('allows admin reads of protected records but still denies client writes', async () => {
    const db = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'orders', 'order-1')));
    await assertSucceeds(getDoc(doc(db, 'payments', 'payment-1')));
    await assertSucceeds(getDoc(doc(db, 'orderEvents', 'event-1')));
    await assertFails(setDoc(doc(db, 'orders', 'admin-created'), { status: 'paid' }));
    await assertFails(updateDoc(doc(db, 'payments', 'payment-1'), { status: 'paid' }));
    await assertFails(deleteDoc(doc(db, 'orderEvents', 'event-1')));
  });
});

describe('Firestore security rules — private operations and default deny', () => {
  it('denies anonymous and non-admin reads/writes of orders, payments and order events', async () => {
    for (const context of [testEnv.unauthenticatedContext(), testEnv.authenticatedContext('customer-1')]) {
      const db = context.firestore();
      for (const path of ['orders/order-1', 'payments/payment-1', 'orderEvents/event-1']) {
        await assertFails(getDoc(doc(db, path)));
        await assertFails(setDoc(doc(db, path), { status: 'client-write' }));
      }
    }
  });

  it('denies every unlisted path by default', async () => {
    const db = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertFails(getDoc(doc(db, 'unlistedCollection', 'secret')));
    await assertFails(setDoc(doc(db, 'unlistedCollection', 'new'), { value: 1 }));
  });

  it('does not allow clients to grant themselves admin privileges', async () => {
    const db = testEnv.authenticatedContext('customer-1').firestore();
    await assertFails(setDoc(doc(db, 'adminUsers', 'customer-1'), { admin: true }));
    await assertFails(updateDoc(doc(db, 'adminUsers', 'customer-1'), { admin: true }));
  });
});


describe('Firestore security rules — partner application ownership', () => {
  it('allows an applicant to create/read only their own pending application', async () => {
    const applicant = testEnv.authenticatedContext('partner-uid-1').firestore();
    const application = {
      uid: 'partner-uid-1',
      name: 'Partner One',
      whatsapp: '201012345678',
      social: 'https://instagram.com/example',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await assertSucceeds(setDoc(doc(applicant, 'partnerApplications', 'partner-uid-1'), application));
    await assertSucceeds(getDoc(doc(applicant, 'partnerApplications', 'partner-uid-1')));
    await assertFails(getDoc(doc(applicant, 'partnerApplications', 'partner-uid-2')));
  });

  it('rejects another UID, invalid phone, non-pending status and applicant edits', async () => {
    const applicant = testEnv.authenticatedContext('partner-uid-1').firestore();
    const base = {
      uid: 'partner-uid-1',
      name: 'Partner One',
      whatsapp: '201012345678',
      social: 'Instagram',
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await assertFails(setDoc(doc(applicant, 'partnerApplications', 'partner-uid-2'), { ...base, uid: 'partner-uid-2' }));
    await assertFails(setDoc(doc(applicant, 'partnerApplications', 'partner-uid-1'), { ...base, whatsapp: 'bad-phone' }));
    await assertFails(setDoc(doc(applicant, 'partnerApplications', 'partner-uid-1'), { ...base, status: 'approved' }));
    await assertFails(updateDoc(doc(applicant, 'partnerApplications', 'partner-uid-1'), { status: 'approved' }));
  });

  it('allows only admin to read all applications and approve partner profile', async () => {
    const admin = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(admin, 'partnerApplications', 'partner-uid-1')));
    await assertSucceeds(setDoc(doc(admin, 'partners', 'partner-uid-1'), { status: 'approved' }));
    const other = testEnv.authenticatedContext('customer-1').firestore();
    await assertFails(getDoc(doc(other, 'partners', 'partner-uid-1')));
    await assertFails(setDoc(doc(other, 'partners', 'partner-uid-1'), { status: 'approved' }));
  });
});


describe('Firestore security rules — guest checkout orders', () => {
  function validGuestOrder() {
    return {
      publicReference: 'AP-TEST-0001',
      customer: { name: 'Test Customer', phone: '01012345678' },
      shipping: { governorateName: 'Cairo', areaName: 'Nasr City', address: 'Test street 123', deliveryNotes: '', fee: 50 },
      book: {
        artworks: Array.from({ length: 30 }, (_, index) => ({
          artworkId: 'AP-' + String(index + 1).padStart(3, '0'),
          titleSnapshot: 'Artwork ' + (index + 1),
          printOrder: index + 1,
        })),
        cover: { coverId: 'AP-COVER-01', titleSnapshot: 'Calm cover' },
        personalizedName: 'Test Name',
      },
      pricing: { currency: 'EGP', standardBookPrice: 240, bookPrice: 240, shippingFee: 50, totalAmount: 290, offerApplied: false },
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'new',
      partnerCode: null,
      trackingToken: 'b'.repeat(64),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  }

  it('allows anonymous customers to create a constrained new order, but not read or edit it', async () => {
    const customerDb = testEnv.unauthenticatedContext().firestore();
    const orderRef = doc(customerDb, 'orders', 'guest-order');
    await assertSucceeds(setDoc(orderRef, validGuestOrder()));
    await assertFails(getDoc(orderRef));
    await assertFails(updateDoc(orderRef, { fulfillmentStatus: 'delivered' }));
  });

  it('rejects guest orders with privileged fields or a non-new status', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const invalidStatus = validGuestOrder();
    invalidStatus.fulfillmentStatus = 'delivered';
    await assertFails(setDoc(doc(db, 'orders', 'invalid-status'), invalidStatus));
    const extraField = { ...validGuestOrder(), adminApproved: true };
    await assertFails(setDoc(doc(db, 'orders', 'extra-field'), extraField));
  });

  it('allows admin to read and update a valid guest order', async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(guestDb, 'orders', 'admin-review-order'), validGuestOrder()));
    const adminDb = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(adminDb, 'orders', 'admin-review-order')));
    await assertSucceeds(updateDoc(doc(adminDb, 'orders', 'admin-review-order'), { fulfillmentStatus: 'confirmed' }));
  });
});

describe('Firestore security rules — public order tracking projection', () => {
  const token = 'a'.repeat(64);
  it('allows anonymous get of a safe tracking record but not list or private order reads', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'orderTracking', token), {
      publicReference: 'AP-TRACK-01', fulfillmentStatus: 'new',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(db, 'orderTracking', token)));
    await assertFails(getDocs(collection(db, 'orderTracking')));
    await assertFails(getDoc(doc(db, 'orders', 'order-1')));
  });

  it('rejects tracking records containing personal data or invalid token paths', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(db, 'orderTracking', 'short-token'), {
      publicReference: 'AP-TRACK-02', fulfillmentStatus: 'new',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(db, 'orderTracking', token), {
      publicReference: 'AP-TRACK-03', fulfillmentStatus: 'new', phone: '01012345678',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(db, 'orderTracking', token), { fulfillmentStatus: 'delivered' }));
  });

  it('allows only admin to update the public tracking status', async () => {
    const admin = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, 'orderTracking', token), {
      publicReference: 'AP-TRACK-04', fulfillmentStatus: 'new',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(admin, 'orderTracking', token), { fulfillmentStatus: 'shipped' }));
  });
});



describe('Firestore security rules — ambassador financial data', () => {
  it('keeps ambassador profiles, commissions and payout details private from customers', async () => {
    for (const context of [testEnv.unauthenticatedContext(), testEnv.authenticatedContext('customer-1')]) {
      const db = context.firestore();
      await assertFails(getDoc(doc(db, 'ambassadors', 'AP' + 'A'.repeat(20))));
      await assertFails(getDoc(doc(db, 'ambassadorCommissions', 'order-1')));
      await assertFails(getDoc(doc(db, 'ambassadorPayouts', 'payout-1')));
      await assertFails(setDoc(doc(db, 'ambassadors', 'AP' + 'A'.repeat(20)), { availableBalance: 9999 }));
      await assertFails(setDoc(doc(db, 'ambassadorCommissions', 'order-1'), { amount: 9999 }));
      await assertFails(setDoc(doc(db, 'ambassadorPayouts', 'payout-1'), { amount: 50 }));
    }
  });

  it('allows admins to read financial records but never write them directly', async () => {
    const db = testEnv.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'ambassadors', 'AP' + 'A'.repeat(20))));
    await assertSucceeds(getDoc(doc(db, 'ambassadorCommissions', 'order-1')));
    await assertSucceeds(getDoc(doc(db, 'ambassadorPayouts', 'payout-1')));
    await assertFails(setDoc(doc(db, 'ambassadors', 'AP' + 'A'.repeat(20)), { availableBalance: 9999 }));
    await assertFails(updateDoc(doc(db, 'ambassadorPayouts', 'payout-1'), { status: 'paid' }));
  });
});

describe('Firestore security rules — ambassador checkout attribution', () => {
  function ambassadorGuestOrder() {
    return {
      publicReference: 'AP-TEST-0001',
      customer: { name: 'Test Customer', phone: '01012345678' },
      shipping: { governorateName: 'Cairo', areaName: 'Nasr City', address: 'Test street 123', deliveryNotes: '', fee: 50 },
      book: { artworks: Array.from({ length: 30 }, (_, index) => ({ artworkId: 'AP-' + String(index + 1).padStart(3, '0'), titleSnapshot: 'Artwork ' + (index + 1), printOrder: index + 1 })), cover: { coverId: 'AP-COVER-01', titleSnapshot: 'Calm cover' }, personalizedName: 'Test Name' },
      pricing: { currency: 'EGP', standardBookPrice: 240, bookPrice: 240, shippingFee: 50, totalAmount: 290, offerApplied: false },
      paymentMethod: 'cod', paymentStatus: 'unpaid', fulfillmentStatus: 'new', partnerCode: null,
      trackingToken: 'd'.repeat(64), createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
  }

  it('accepts only a well-formed ambassador code and hashed private access key', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    const valid = ambassadorGuestOrder();
    valid.ambassadorReferralCode = 'AP' + 'A'.repeat(20);
    valid.ambassadorSetup = { code: 'AP' + 'B'.repeat(20), accessTokenHash: 'c'.repeat(64) };
    await assertSucceeds(setDoc(doc(db, 'orders', 'ambassador-order'), valid));

    const invalidCode = ambassadorGuestOrder();
    invalidCode.ambassadorReferralCode = 'AP-not-a-code';
    await assertFails(setDoc(doc(db, 'orders', 'invalid-ambassador-code'), invalidCode));

    const invalidSetup = ambassadorGuestOrder();
    invalidSetup.ambassadorSetup = { code: 'AP' + 'B'.repeat(20), accessTokenHash: 'not-a-hash' };
    await assertFails(setDoc(doc(db, 'orders', 'invalid-ambassador-key'), invalidSetup));
  });
});
