import { describe, expect, it, vi } from 'vitest';

vi.mock('../firebase/client', () => ({ firebaseConfigured: false, firestore: null }));

describe('catalog repository launch behavior', () => {
  it('never falls back to mock artwork when Firebase is unavailable', async () => {
    vi.stubEnv('VITE_CATALOG_MODE', 'demo');
    vi.resetModules();

    const { loadCatalog } = await import('./repository');
    const result = await loadCatalog();

    expect(result.source).toBe('firestore');
    expect(result.data).toEqual({ categories: [], artworks: [], covers: [] });
    expect(result.warning).toContain('تعذر الاتصال');

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
