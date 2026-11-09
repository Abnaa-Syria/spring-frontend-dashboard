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

/** Store badges (the customer app shows icon + label). */
export type ProductFeature = 'WARRANTY' | 'INSTALLATION' | 'DELIVERY' | 'AFTER_SALES';
export const PRODUCT_FEATURES: { value: ProductFeature; label: string }[] = [
  { value: 'WARRANTY', label: 'ضمان (حسب مدة الضمان)' },
  { value: 'INSTALLATION', label: 'تركيب متوفر' },
  { value: 'DELIVERY', label: 'توصيل للمحافظات' },
  { value: 'AFTER_SALES', label: 'صيانة بعد البيع' },
];

/** One row of the store's "تفاصيل المنتج" table. */
export interface ProductSpec { label: string; value: string }

/** Common labels offered when adding specification rows. */
export const SPEC_LABELS = ['عدد مراحل التنقية', 'نوع الفلتر', 'سعة خزان المياه', 'معدل التدفق', 'الأبعاد', 'الضمان', 'بلد المنشأ', 'الوزن', 'الجهد الكهربائي'];

export interface ProductStock {
  main: number;
  custody: number;
  total: number;
  lowStockThreshold: number;
  warehouses: { id: number; name: string; type: 'MAIN' | 'TECHNICIAN'; technicianId: number | null; quantity: number }[];
}

export interface ProductRow {
  id: number;
  sku: string;
  type: ProductType;
  nameAr: string;
  nameEn: string | null;
  subtitleAr: string | null;
  descriptionAr: string | null;
  features: ProductFeature[] | null;
  specs: ProductSpec[] | null;
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
