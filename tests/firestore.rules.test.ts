import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const projectId = 'demo-anti-pressure';
let testEnv: RulesTestEnvironment;

const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

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
    await setDoc(doc(db, 'settings', 'public'), { shopName: 'ANTI PRESSURE' });
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
    await assertSucceeds(getDocs(collection(db, 'categories')));
    await assertSucceeds(getDocs(collection(db, 'artworks')));
    await assertSucceeds(getDocs(collection(db, 'covers')));
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
