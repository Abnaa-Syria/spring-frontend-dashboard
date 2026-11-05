import type { ProductType } from '../../lib/labels';

export interface Category {
  id: number;
  parentId: number | null;
  nameAr: string;
  nameEn: string | null;
  sortOrder: number;
  isActive: boolean;
  _count?: { products: number };
}

export interface ProductRow {
  id: number;
  sku: string;
  type: ProductType;
  nameAr: string;
  nameEn: string | null;
  descriptionAr: string | null;
  price: string;
  compareAtPrice: string | null;
  warrantyMonths: number | null;
  replacementIntervalDays: number | null;
  isActive: boolean;
  isSoldOnline: boolean;
  categoryId: number | null;
  category: { id: number; nameAr: string } | null;
  images: { id: number; url: string }[];
}
