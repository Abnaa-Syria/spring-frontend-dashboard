import type { OrderStatus } from '../../lib/labels';

export interface OrderRow {
  id: number; number: string; status: OrderStatus; total: string; createdAt: string; paymentMethod: string;
  customer: { id: number; name: string; phone: string };
  address: { city: string; area: string | null };
  _count: { items: number };
}
export interface OrderDetail extends Omit<OrderRow, 'address' | '_count'> {
  subtotal: string; notes: string | null;
  address: {
    governorate: string; city: string; area: string | null; street: string | null; building: string | null;
    floor?: string | null; apartment?: string | null; details?: string | null;
  };
  items: { id: number; nameAr: string; unitPrice: string; quantity: number; lineTotal: string; product: { sku: string; type: string } }[];
  statusHistory: { id: number; toStatus: OrderStatus; createdAt: string; note: string | null; changedBy: { name: string } | null }[];
  invoice: { id: number; number: string } | null;
}

export const paymentLabel = (m: string) => (m === 'CASH' ? 'نقداً عند الاستلام' : m === 'CARD' ? 'بطاقة' : m === 'BANK_TRANSFER' ? 'تحويل' : m);
