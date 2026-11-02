import { describe, expect, it, vi } from 'vitest';
import { grantAdminClaim, publicSettings, seedStorefront, starterCategories } from '../scripts/storefront-seed.mjs';

function makeDb(existing = {}) {
  const writes = [];
  const collection = name => ({
    doc: id => ({ id, collection: name }),
  });
  const db = {
    collection,
    getAll: vi.fn(async (...requested) => requested.map(ref => {
      const key = `${ref.collection}/${ref.id}`;
      return { exists: Object.hasOwn(existing, key), data: () => existing[key] };
    })),
    batch: () => ({
      create: (ref, data) => writes.push({ operation: 'create', id: `${ref.collection}/${ref.id}`, data }),
      commit: vi.fn(async () => undefined),
    }),
  };
  return { db, writes };
}

describe('GitHub Firebase bootstrap seed', () => {
  it('creates exactly ten categories and the locked public settings when absent', async () => {
    const { db, writes } = makeDb();
    const result = await seedStorefront({ db, serverTimestamp: () => 'SERVER_TIMESTAMP' });
    expect(result).toEqual({ createdCategories: 10, createdPublicSettings: true, preservedCategories: 0 });
    expect(writes).toHaveLength(11);
    expect(writes.filter(write => write.id.startsWith('categories/'))).toHaveLength(10);
    const settings = writes.find(write => write.id === 'settings/public')?.data;
    expect(settings).toMatchObject(publicSettings);
    expect(starterCategories.map(([id]) => id)).toContain('responsibilities');
  });

  it('is idempotent and preserves all existing documents', async () => {
    const existing = { 'settings/public': { ...publicSettings, updatedAt: 'existing-time' } };
    for (const [id, title] of starterCategories) existing[`categories/${id}`] = { title, slug: id, active: false, customField: 'keep' };
    const { db, writes } = makeDb(existing);
    const result = await seedStorefront({ db, serverTimestamp: () => 'SERVER_TIMESTAMP' });
    expect(result).toEqual({ createdCategories: 0, createdPublicSettings: false, preservedCategories: 10 });
    expect(writes).toHaveLength(0);
  });

  it('fails closed on conflicting existing public settings without overwriting', async () => {
    const existing = { 'settings/public': { ...publicSettings, standardBookPrice: 999 } };
    const { db, writes } = makeDb(existing);
    await expect(seedStorefront({ db, serverTimestamp: () => 'SERVER_TIMESTAMP' })).rejects.toThrow('standardBookPrice');
    expect(writes).toHaveLength(0);
  });

  it('preserves unrelated custom claims while granting admin:true', async () => {
    const auth = {
      getUserByEmail: vi.fn(async () => ({ uid: 'admin-uid', email: 'admin@example.com', customClaims: { support: true } })),
      setCustomUserClaims: vi.fn(async () => undefined),
    };
    const result = await grantAdminClaim({ auth, email: 'admin@example.com' });
    expect(result.claims).toEqual({ support: true, admin: true });
    expect(auth.setCustomUserClaims).toHaveBeenCalledWith('admin-uid', { support: true, admin: true });
  });
});
