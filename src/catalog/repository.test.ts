import { describe, expect, it, vi } from 'vitest';
import type { CatalogData } from './types';

const demo: CatalogData = {
  categories: [{ id: 'demo', title: 'تصنيف تجريبي', slug: 'demo', sortOrder: 0, active: true }],
  artworks: [{ id: 'AP-DEMO', title: 'رسمة تجريبية', categoryId: 'demo', previewAssetRef: '', sortOrder: 0, version: 1, active: true }],
  covers: [{ id: 'cover-demo', title: 'غلاف تجريبي', previewAssetRef: '', sortOrder: 0, version: 1, active: true }],
};

describe('catalog repository safe fallback', () => {
  it('returns the supplied demo catalog when demo mode is explicitly enabled', async () => {
    // CI may provide Firebase secrets, so make this test independent of runner configuration.
    vi.stubEnv('VITE_CATALOG_MODE', 'demo');
    vi.resetModules();

    const { loadCatalog } = await import('./repository');
    const result = await loadCatalog(demo);

    expect(result.source).toBe('demo');
    expect(result.data).toEqual(demo);

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
