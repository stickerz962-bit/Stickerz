import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { firebaseConfigured, firestore } from '../firebase/client';
import type { CatalogArtwork, CatalogCategory, CatalogCover, CatalogData, CatalogSource } from './types';

export type CatalogResult = {
  data: CatalogData;
  source: CatalogSource;
  warning?: string;
};

const emptyCatalog: CatalogData = { categories: [], artworks: [], covers: [] };

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseCategory(id: string, value: Record<string, unknown>): CatalogCategory | null {
  if (!isText(value.title) || !isText(value.slug) || !isNumber(value.sortOrder) || typeof value.active !== 'boolean') return null;
  return { id, title: value.title, slug: value.slug, sortOrder: value.sortOrder, active: value.active,
    ...(isText(value.description) ? { description: value.description } : {}) };
}

function parseArtwork(id: string, value: Record<string, unknown>): CatalogArtwork | null {
  if (!isText(value.title) || !isText(value.categoryId) || !isText(value.previewAssetRef) ||
      !isNumber(value.sortOrder) || !isNumber(value.version) || typeof value.active !== 'boolean') return null;
  return { id, title: value.title, categoryId: value.categoryId, previewAssetRef: value.previewAssetRef,
    sortOrder: value.sortOrder, version: value.version, active: value.active,
    ...(isText(value.phrase) ? { phrase: value.phrase } : {}) };
}

function parseCover(id: string, value: Record<string, unknown>): CatalogCover | null {
  if (!isText(value.title) || !isText(value.previewAssetRef) || !isNumber(value.sortOrder) ||
      !isNumber(value.version) || typeof value.active !== 'boolean') return null;
  return { id, title: value.title, previewAssetRef: value.previewAssetRef, sortOrder: value.sortOrder,
    version: value.version, active: value.active,
    ...(isText(value.subtitle) ? { subtitle: value.subtitle } : {}) };
}

async function readActive<T>(
  collectionName: string,
  parse: (id: string, value: Record<string, unknown>) => T | null,
): Promise<T[]> {
  if (!firestore) return [];
  const snapshot = await getDocs(query(collection(firestore, collectionName), where('active', '==', true), orderBy('sortOrder', 'asc')));
  return snapshot.docs.flatMap(document => {
    const parsed = parse(document.id, document.data());
    return parsed ? [parsed] : [];
  });
}

/**
 * Explicit demo mode preserves the existing prototype while real catalog content is being prepared.
 * Firestore mode never silently substitutes demo content: an empty or failed live catalog stays empty.
 */
export async function loadCatalog(demoData: CatalogData): Promise<CatalogResult> {
  if (import.meta.env.VITE_CATALOG_MODE === 'demo') {
    return { data: demoData, source: 'demo' };
  }
  if (!firebaseConfigured || !firestore) {
    return { data: demoData, source: 'demo', warning: 'Firebase settings are missing; showing demo catalog.' };
  }

  try {
    const [categories, artworks, covers] = await Promise.all([
      readActive('categories', parseCategory),
      readActive('artworks', parseArtwork),
      readActive('covers', parseCover),
    ]);
    // Keep the prototype usable while the real artwork library is still empty. Never mix demo art into a partially populated live catalog.\n    if (artworks.length === 0) {\n      return { data: demoData, source: 'demo', warning: 'المكتبة الأصلية لسه بتتجهز؛ بنعرض الرسومات التجريبية مؤقتًا.' };\n    }\n    return { data: { categories, artworks, covers: covers.length ? covers : demoData.covers }, source: 'firestore', ...(covers.length ? {} : { warning: 'الأغلفة الأصلية لسه بتتجهز؛ بنعرض نماذج الأغلفة مؤقتًا.' }) };
  } catch {
    return { data: emptyCatalog, source: 'firestore', warning: 'The live catalog could not be loaded.' };
  }
}
