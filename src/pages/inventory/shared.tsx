import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api, type Page } from '../../lib/api';
import { fmtDateTime, fmtSigned } from '../../lib/format';
import { MOVEMENT_TYPE, type MovementType, type ProductType } from '../../lib/labels';

export interface Warehouse {
  id: number;
  name: string;
  type: 'MAIN' | 'TECHNICIAN';
  isActive: boolean;
  technician: { id: number; code: string; user: { name: string; isActive: boolean } } | null;
  totalUnits: number;
  productCount: number;
}
export interface Balance {
  warehouseId: number;
  productId: number;
  quantity: number;
  updatedAt: string;
  product: { id: number; sku: string; nameAr: string; type: ProductType };
  warehouse: { id: number; name: string; type: string };
}
export interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  signedQuantity?: number;
  note: string | null;
  createdAt: string;
  product: { nameAr: string; sku: string };
  fromWarehouse: { name: string } | null;
  toWarehouse: { name: string } | null;
  createdBy: { name: string };
  invoiceItem: { invoice: { number: string } } | null;
}

export const MOVEMENT_TITLES = {
  receipt: 'استلام بضاعة من مورد',
  transfer: 'صرف / تحويل عهدة',
  adjust: 'تسجيل تالف أو فاقد أو زيادة',
  count: 'جرد وتسوية',
} as const;
export type MovementKind = keyof typeof MOVEMENT_TITLES;
export const isMovementKind = (k?: string): k is MovementKind => !!k && k in MOVEMENT_TITLES;

export const useWarehouses = () => useQuery({
  queryKey: ['warehouses'],
  queryFn: async () => (await api.get<Warehouse[]>('/inventory/warehouses')).data,
});

export const warehouseLabel = (w: Warehouse) => (w.type === 'MAIN' ? `مخزن: ${w.name}` : `عهدة: ${w.technician?.user.name ?? w.name}`);

export const warehouseOptions = (ws?: Warehouse[], filter?: (w: Warehouse) => boolean) =>
  (ws ?? []).filter((w) => w.isActive && (!filter || filter(w))).map((w) => ({ value: w.id, label: warehouseLabel(w) }));

/** Movement ledger, optionally for one warehouse (then quantities are signed for that warehouse). */
export function MovementsTable({ warehouseId }: { warehouseId?: number }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['movements', warehouseId, page],
    queryFn: async () => (await api.get<Page<Movement>>('/inventory/movements', { params: { warehouseId, page } })).data,
    placeholderData: keepPreviousData,
  });
  return (
    <Table<Movement>
      rowKey="id"
      size="small"
      loading={isFetching}
      dataSource={data?.items}
      scroll={{ x: 900 }}
      pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
      columns={[
        { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime, width: 170 },
        { title: 'الحركة', dataIndex: 'type', render: (t: MovementType) => <Tag color={MOVEMENT_TYPE[t].color}>{MOVEMENT_TYPE[t].label}</Tag> },
        { title: 'المنتج', render: (_, m) => m.product.nameAr },
        {
          title: 'الكمية',
          render: (_, m) => m.signedQuantity === undefined ? m.quantity : (
            <Typography.Text type={m.signedQuantity > 0 ? 'success' : 'danger'}>
              <bdi dir="ltr">{fmtSigned(m.signedQuantity)}</bdi>
            </Typography.Text>
          ),
        },
        ...(warehouseId ? [] : [
          { title: 'من', render: (_: unknown, m: Movement) => m.fromWarehouse?.name ?? '—' },
          { title: 'إلى', render: (_: unknown, m: Movement) => m.toWarehouse?.name ?? '—' },
        ]),
        { title: 'المرجع / ملاحظة', render: (_, m) => m.invoiceItem?.invoice.number ?? m.note ?? '—' },
        { title: 'بواسطة', render: (_, m) => m.createdBy.name },
      ]}
    />
  );
}
