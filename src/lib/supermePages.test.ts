import { describe, expect, it } from 'vitest';
import { BUILT_IN_PAGES, SUPERME_SECTIONS, mapLegacyArtwork } from './supermePages';

describe('SuperMe page library', () => {
  it('starts with ten sections and sixty selectable notebook templates', () => {
    expect(SUPERME_SECTIONS).toHaveLength(10);
    expect(BUILT_IN_PAGES).toHaveLength(60);
    expect(new Set(BUILT_IN_PAGES.map(page => page.id)).size).toBe(60);
  });

  it('includes the key guided examples from the product brief', () => {
    expect(BUILT_IN_PAGES.find(page => page.id === 'SM-FAITH-01')?.items).toEqual([
      'الفجر', 'الظهر', 'العصر', 'المغرب', 'العشاء',
    ]);
    expect(BUILT_IN_PAGES.find(page => page.id === 'SM-FAITH-02')?.items).toContain('الناس');
    expect(BUILT_IN_PAGES.find(page => page.id === 'SM-LEARN-01')?.qrUrl).toContain('youtube.com');
    expect(BUILT_IN_PAGES.find(page => page.id === 'SM-PROJECTS-01')?.kind).toBe('project');
  });

  it('maps existing coloring artwork without changing its original ID or asset reference', () => {
    const page = mapLegacyArtwork({
      id: 'AP-001', title: 'رسمة قديمة', category: 'فوضى المسؤوليات',
      previewAssetRef: 'asset:artwork:AP-001',
    });
    expect(page.id).toBe('legacy-AP-001');
    expect(page.legacyArtworkId).toBe('AP-001');
    expect(page.previewAssetRef).toBe('asset:artwork:AP-001');
    expect(page.sectionId).toBe('art');
  });
});
