import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

let env: RulesTestEnvironment;
const rules = readFileSync(resolve(process.cwd(), 'firestore.rules'), 'utf8');

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-superme-pages', firestore: { rules } });
});
beforeEach(async () => {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'supermePages', 'published-page'), {
      title: 'Published page', sectionId: 'plans', sectionTitle: 'خططي',
      kind: 'tracker', description: 'A public template', items: ['Goal'],
      prompt: 'Write here', active: true, sortOrder: 1,
    });
    await setDoc(doc(db, 'supermePages', 'draft-page'), {
      title: 'Draft page', sectionId: 'plans', sectionTitle: 'خططي',
      kind: 'tracker', description: 'An unpublished template', items: ['Goal'],
      prompt: 'Write here', active: false, sortOrder: 2,
    });
  });
});
afterEach(async () => { await env.clearFirestore(); });
afterAll(async () => { await env.cleanup(); });

describe('Firestore security — SuperMe page library', () => {
  it('allows public reads only for explicitly published templates and the exact storefront query', async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(db, 'supermePages', 'published-page')));
    await assertFails(getDoc(doc(db, 'supermePages', 'draft-page')));
    const result = await getDocs(query(collection(db, 'supermePages'), where('active', '==', true)));
    expect(result.docs.map(item => item.id)).toEqual(['published-page']);
    await assertFails(getDocs(collection(db, 'supermePages')));
  });

  it('denies catalog mutations to signed-in non-admin users', async () => {
    const db = env.authenticatedContext('customer-1').firestore();
    await assertFails(getDoc(doc(db, 'supermePages', 'draft-page')));
    await assertFails(setDoc(doc(db, 'supermePages', 'customer-page'), { title: 'Injected', active: true }));
    await assertFails(updateDoc(doc(db, 'supermePages', 'published-page'), { title: 'Changed' }));
    await assertFails(deleteDoc(doc(db, 'supermePages', 'published-page')));
  });

  it('allows trusted admins to create, edit, hide, and delete templates', async () => {
    const db = env.authenticatedContext('admin-1', { admin: true }).firestore();
    await assertSucceeds(getDoc(doc(db, 'supermePages', 'draft-page')));
    await assertSucceeds(setDoc(doc(db, 'supermePages', 'admin-page'), { title: 'Admin page', active: false }));
    await assertSucceeds(updateDoc(doc(db, 'supermePages', 'published-page'), { active: false }));
    await assertSucceeds(deleteDoc(doc(db, 'supermePages', 'draft-page')));
  });
});
