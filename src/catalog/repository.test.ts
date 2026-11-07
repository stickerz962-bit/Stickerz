import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  firebaseConfigured: false,
  firestore: null as unknown,
  getDocs: vi.fn(),
}));

vi.mock('../firebase/client', () => ({
  get firebaseConfigured() { return state.firebaseConfigured; },
  get firestore() { return state.firestore; },
}));

vi.mock('firebase/firestore', () => ({
  collection: (_db: unknown, name: string) => ({ name }),
  where: (...args: unknown[]) => ({ where: args }),
  orderBy: (...args: unknown[]) => ({ orderBy: args }),
  query: (ref: { name: string }, ...constraints: unknown[]) => ({ ...ref, constraints }),
  getDocs: state.getDocs,
}));

describe('catalog repository launch behavior', () => {
  beforeEach(() => {
    state.firebaseConfigured = false;
    state.firestore = null;
    state.getDocs.mockReset();
    vi.resetModules();
  });

  it('never falls back to mock artwork when Firebase is unavailable', async () => {
    vi.stubEnv('VITE_CATALOG_MODE', 'demo');
    const { loadCatalog } = await import('./repository');
    const result = await loadCatalog();

    expect(result.source).toBe('firestore');
    expect(result.data).toEqual({ categories: [], artworks: [], covers: [] });
    expect(result.warning).toContain('تعذر الاتصال');

    vi.unstubAllEnvs();
  });

  it('returns only published artwork belonging to a published category', async () => {
    state.firebaseConfigured = true;
    state.firestore = {};
    state.getDocs.mockImplementation(async (ref: { name: string; constraints?: Array<{ where?: unknown[] }> }) => {
      const rows: Record<string, Array<{ id: string; value: Record<string, unknown> }>> = {
        categories: [
          { id: 'published', value: { title: 'Published', slug: 'published', sortOrder: 1, active: true } },
          { id: 'hidden', value: { title: 'Hidden', slug: 'hidden', sortOrder: 2, active: false } },
        ],
        artworks: [
          { id: 'AP-001', value: { title: 'Visible art', categoryId: 'published', previewAssetRef: 'data:image/png;base64,AA==', sortOrder: 1, version: 1, active: true } },
          { id: 'AP-002', value: { title: 'Hidden category art', categoryId: 'hidden', previewAssetRef: 'data:image/png;base64,AA==', sortOrder: 2, version: 1, active: true } },
          { id: 'AP-003', value: { title: 'Draft art', categoryId: 'published', previewAssetRef: 'data:image/png;base64,AA==', sortOrder: 3, version: 1, active: false } },
        ],
        covers: [
          { id: 'cover-1', value: { title: 'Cover', previewAssetRef: 'data:image/png;base64,AA==', sortOrder: 1, version: 1, active: true } },
        ],
      };
      // Mirror Firestore query behavior: where('active', '==', true) excludes drafts
      // before the repository receives the snapshot.
      const matchingRows = (rows[ref.name] || []).filter(row =>
        (ref.constraints || []).every(constraint => {
          const clause = constraint.where;
          if (!clause || clause.length !== 3) return true;
          const [field, operator, expected] = clause;
          return operator !== '==' || row.value[String(field)] === expected;
        }),
      );
      return { docs: matchingRows.map(row => ({ id: row.id, data: () => row.value })) };
    });

    const { loadCatalog } = await import('./repository');
    const result = await loadCatalog();

    expect(result.data.artworks.map(item => item.id)).toEqual(['AP-001']);
    expect(result.data.covers.map(item => item.id)).toEqual(['cover-1']);
  });
});
