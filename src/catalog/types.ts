export type CatalogCategory = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  sortOrder: number;
  active: boolean;
};

export type CatalogArtwork = {
  id: string;
  title: string;
  categoryId: string;
  phrase?: string;
  previewAssetRef: string;
  sortOrder: number;
  version: number;
  active: boolean;
};

export type CatalogCover = {
  id: string;
  title: string;
  subtitle?: string;
  previewAssetRef: string;
  sortOrder: number;
  version: number;
  active: boolean;
};

export type CatalogData = {
  categories: CatalogCategory[];
  artworks: CatalogArtwork[];
  covers: CatalogCover[];
};

export type CatalogSource = 'demo' | 'firestore';
