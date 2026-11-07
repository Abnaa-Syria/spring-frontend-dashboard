import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { HandoverStatus, PaymentMethod, PaymentStatus } from '../../lib/labels';

export interface TechBrief { id: number; code: string; user: { name: string } }
export interface InvoiceRow {
  id: number; number: string; status: 'ISSUED' | 'VOID'; total: string; issuedAt: string;
  customer: { id: number; name: string; phone: string };
  technician: TechBrief | null;
  serviceRequest: { id: number; number: string } | null;
  payments: { method: PaymentMethod; status: PaymentStatus; amount: string }[];
}
export interface InvoiceDetail extends InvoiceRow {
  subtotal: string; discount: string; voidReason: string | null; voidedAt: string | null;
  orderId: number | null;
  items: { id: number; description: string; unitPrice: string; quantity: number; lineTotal: string; product: { sku: string } | null }[];
  payments: (InvoiceRow['payments'][number] & {
    id: number; reference: string | null; rejectReason: string | null; verifiedBy: { name: string } | null;
    verifiedAt: string | null; receipt: { id: number } | null;
  })[];
  issuedBy: { name: string }; voidedBy: { name: string } | null;
}
export interface PaymentRow {
  id: number; method: PaymentMethod; status: PaymentStatus; amount: string; reference: string | null; createdAt: string;
  rejectReason: string | null; receiptFileId: number | null;
  invoice: { id: number; number: string; customer: { name: string; phone: string } };
  technician: TechBrief | null; verifiedBy: { name: string } | null;
}
export interface CashRow { technicianId: number; code: string; name: string; isActive: boolean; cashInHand: string; pendingHandovers: string }
export interface HandoverRow {
  id: number; amount: string; status: HandoverStatus; note: string | null; createdAt: string; reviewedAt: string | null;
  technician: TechBrief; reviewedBy: { name: string } | null;
}

export const CASH_TYPE: Record<string, { label: string; sign: 1 | -1 }> = {
  COLLECTION: { label: 'تحصيل من عميل', sign: 1 },
  HANDOVER: { label: 'توريد للخزينة', sign: -1 },
  ADJUSTMENT_IN: { label: 'تسوية بالزيادة', sign: 1 },
  ADJUSTMENT_OUT: { label: 'تسوية بالنقص / إلغاء', sign: -1 },
};

/** Cash custody summary for every technician (shared cache with the cash tab). */
export const useCashRows = () => useQuery({
  queryKey: ['cash'],
  queryFn: async () => (await api.get<CashRow[]>('/custody/cash')).data,
});
