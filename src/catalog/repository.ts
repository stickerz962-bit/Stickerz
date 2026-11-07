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
  if (!isText(value.title) || !isText(value.categoryId) ||
      !isNumber(value.sortOrder) || !isNumber(value.version) || typeof value.active !== 'boolean') return null;
  return { id, title: value.title, categoryId: value.categoryId, previewAssetRef: isText(value.previewAssetRef) ? value.previewAssetRef : '',
    sortOrder: value.sortOrder, version: value.version, active: value.active,
    ...(isText(value.phrase) ? { phrase: value.phrase } : {}) };
}

function parseCover(id: string, value: Record<string, unknown>): CatalogCover | null {
  if (!isText(value.title) || !isNumber(value.sortOrder) ||
      !isNumber(value.version) || typeof value.active !== 'boolean') return null;
  return { id, title: value.title, previewAssetRef: isText(value.previewAssetRef) ? value.previewAssetRef : '', sortOrder: value.sortOrder,
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
 * The live storefront must never substitute mock artwork or covers for the approved catalog.
 * Only published records with real preview assets are returned to customers.
 */
export async function loadCatalog(): Promise<CatalogResult> {
  if (!firebaseConfigured || !firestore) {
    return { data: emptyCatalog, source: 'firestore', warning: 'تعذر الاتصال بمكتبة الرسومات المعتمدة. حاولي مرة أخرى لاحقًا.' };
  }

  try {
    const [categories, artworks, covers] = await Promise.all([
      readActive('categories', parseCategory),
      readActive('artworks', parseArtwork),
      readActive('covers', parseCover),
    ]);
    return {
      data: {
        categories,
        // Only show artwork whose record is published, has a real preview,
        // and belongs to a currently published category.
        artworks: artworks.filter(item => isText(item.previewAssetRef) && categories.some(category => category.id === item.categoryId)),
        covers: covers.filter(item => isText(item.previewAssetRef)),
      },
      source: 'firestore',
      ...(artworks.length === 0 ? { warning: 'لا توجد رسومات منشورة في المكتبة حتى الآن.' } : {}),
    };
  } catch {
    return { data: emptyCatalog, source: 'firestore', warning: 'تعذر تحميل مكتبة الرسومات المعتمدة.' };
  }
}
