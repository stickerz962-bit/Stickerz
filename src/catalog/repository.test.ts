import { describe, expect, it } from 'vitest';
import { loadCatalog } from './repository';
import type { CatalogData } from './types';

const demo: CatalogData = {
  categories: [{ id: 'demo', title: 'تصنيف تجريبي', slug: 'demo', sortOrder: 0, active: true }],
  artworks: [{ id: 'AP-DEMO', title: 'رسمة تجريبية', categoryId: 'demo', previewAssetRef: '', sortOrder: 0, version: 1, active: true }],
  covers: [{ id: 'cover-demo', title: 'غلاف تجريبي', previewAssetRef: '', sortOrder: 0, version: 1, active: true }],
};

describe('catalog repository safe fallback', () => {
  it('returns the supplied demo catalog when Firebase is not configured', async () => {
    const result = await loadCatalog(demo);
    expect(result.source).toBe('demo');
    expect(result.data).toEqual(demo);
  });
});
