import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, Card, Col, Descriptions, Drawer, Input, Popconfirm, Row, Select, Skeleton, Space, Statistic, Table, Tag,
  Timeline, Typography,
} from 'antd';
import { useState } from 'react';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtAddress, fmtDateTime, fmtMoney } from '../../lib/format';

type OrderStatus = 'NEW' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
const STATUS: Record<OrderStatus, { label: string; color: string }> = {
  NEW: { label: 'جديد', color: 'blue' },
  PREPARING: { label: 'قيد التجهيز', color: 'gold' },
  OUT_FOR_DELIVERY: { label: 'خرج للتوصيل', color: 'cyan' },
  DELIVERED: { label: 'تم التسليم', color: 'green' },
  CANCELLED: { label: 'ملغي', color: 'red' },
};
const NEXT: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  NEW: [{ to: 'PREPARING', label: 'بدء التجهيز' }],
  PREPARING: [{ to: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل (خصم من المخزن)' }],
  OUT_FOR_DELIVERY: [{ to: 'DELIVERED', label: 'تم التسليم وتحصيل المبلغ' }],
  DELIVERED: [],
  CANCELLED: [],
};

interface OrderRow {
  id: number; number: string; status: OrderStatus; total: string; createdAt: string; paymentMethod: string;
  customer: { id: number; name: string; phone: string };
  address: { city: string; area: string | null };
  _count: { items: number };
}
interface OrderDetail extends Omit<OrderRow, 'address' | '_count'> {
  subtotal: string; notes: string | null;
  address: { governorate: string; city: string; area: string | null; street: string | null; building: string | null };
  items: { id: number; nameAr: string; unitPrice: string; quantity: number; lineTotal: string; product: { sku: string; type: string } }[];
  statusHistory: { id: number; toStatus: OrderStatus; createdAt: string; note: string | null; changedBy: { name: string } | null }[];
  invoice: { id: number; number: string } | null;
}

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ status?: OrderStatus; search?: string }>({});
  const [openId, setOpenId] = useState<number | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['orders', filters, page],
    queryFn: async () =>
      (await api.get<Page<OrderRow> & { byStatus: Partial<Record<OrderStatus, number>> }>('/orders', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>طلبات الشراء</Typography.Title>}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {(Object.keys(STATUS) as OrderStatus[]).map((s) => (
          <Col key={s} xs={12} md={4}>
            <Statistic title={STATUS[s].label} value={data?.byStatus[s] ?? 0} />
          </Col>
        ))}
      </Row>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="رقم الطلب، اسم أو موبايل العميل" allowClear style={{ width: 280 }}
          onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
        <Select allowClear placeholder="الحالة" style={{ width: 160 }}
          options={(Object.keys(STATUS) as OrderStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))}
          onChange={(v) => { setFilters((f) => ({ ...f, status: v })); setPage(1); }} />
      </Space>
      <Table<OrderRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        onRow={(o) => ({ onClick: () => setOpenId(o.id), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'رقم الطلب', dataIndex: 'number' },
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
          { title: 'العميل', render: (_, o) => <>{o.customer.name}<br /><Typography.Text type="secondary" dir="ltr">{o.customer.phone}</Typography.Text></> },
          { title: 'المنطقة', render: (_, o) => [o.address.area, o.address.city].filter(Boolean).join('، ') },
          { title: 'الأصناف', render: (_, o) => o._count.items },
          { title: 'الإجمالي', dataIndex: 'total', render: fmtMoney },
          { title: 'الدفع', dataIndex: 'paymentMethod', render: (m: string) => (m === 'CASH' ? 'عند الاستلام' : m) },
          { title: 'الحالة', render: (_, o) => <Tag color={STATUS[o.status].color}>{STATUS[o.status].label}</Tag> },
        ]}
      />
      <OrderDrawer id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

function OrderDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [cancelNote, setCancelNote] = useState('');
  const { data: o, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<OrderDetail>(`/orders/${id}`)).data,
    enabled: id != null,
  });
  const move = useMutation({
    mutationFn: (v: { status: OrderStatus; note?: string }) => api.post(`/orders/${id}/status`, v),
    onSuccess: (_, v) => {
      message.success(`تم تحديث الطلب: ${STATUS[v.status].label}`);
      setCancelNote('');
      ['order', 'orders', 'balances', 'movements', 'invoices', 'service-requests'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const actions = o && can('order.write') ? NEXT[o.status] : [];
  const cancellable = o && can('order.write') && !['DELIVERED', 'CANCELLED'].includes(o.status);

  return (
    <Drawer open={id != null} onClose={onClose} size={640}
      title={o ? <Space>{o.number}<Tag color={STATUS[o.status].color}>{STATUS[o.status].label}</Tag></Space> : 'الطلب'}
      extra={cancellable && (
        <Popconfirm
          title="إلغاء الطلب"
          description={
            <div style={{ maxWidth: 260 }}>
              {o?.status === 'OUT_FOR_DELIVERY' && <Typography.Paragraph type="secondary">المنتجات هترجع للمخزن.</Typography.Paragraph>}
              <Input.TextArea placeholder="السبب" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
            </div>
          }
          okText="إلغاء الطلب" cancelText="رجوع"
          okButtonProps={{ danger: true, disabled: cancelNote.trim().length < 3, loading: move.isPending }}
          onConfirm={() => move.mutateAsync({ status: 'CANCELLED', note: cancelNote.trim() })}
        >
          <Button danger>إلغاء</Button>
        </Popconfirm>
      )}
    >
      {isLoading || !o ? <Skeleton active /> : (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="العميل">{o.customer.name} — <span dir="ltr">{o.customer.phone}</span></Descriptions.Item>
            <Descriptions.Item label="عنوان التوصيل">{fmtAddress(o.address)}</Descriptions.Item>
            <Descriptions.Item label="الدفع">{o.paymentMethod === 'CASH' ? 'عند الاستلام' : o.paymentMethod}</Descriptions.Item>
            {o.notes && <Descriptions.Item label="ملاحظات العميل">{o.notes}</Descriptions.Item>}
            {o.invoice && <Descriptions.Item label="الفاتورة">{o.invoice.number}</Descriptions.Item>}
          </Descriptions>
          <Table
            rowKey="id" size="small" pagination={false} style={{ marginTop: 16 }} dataSource={o.items}
            columns={[
              { title: 'المنتج', render: (_, i) => <>{i.nameAr} <Typography.Text type="secondary">({i.product.sku})</Typography.Text>{i.product.type === 'DEVICE' && <Tag style={{ marginInlineStart: 6 }}>يحتاج تركيب</Tag>}</> },
              { title: 'السعر', dataIndex: 'unitPrice', render: fmtMoney },
              { title: 'الكمية', dataIndex: 'quantity' },
              { title: 'الإجمالي', dataIndex: 'lineTotal', render: fmtMoney },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><Typography.Text strong>الإجمالي</Typography.Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><Typography.Text strong>{fmtMoney(o.total)}</Typography.Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
          {actions.length > 0 && (
            <Space style={{ marginTop: 16 }}>
              {actions.map((a) => (
                <Popconfirm key={a.to} title={`${a.label}؟`} okText="تأكيد" cancelText="رجوع" onConfirm={() => move.mutateAsync({ status: a.to })}>
                  <Button type="primary" loading={move.isPending}>{a.label}</Button>
                </Popconfirm>
              ))}
            </Space>
          )}
          {o.status === 'OUT_FOR_DELIVERY' && (
            <Typography.Paragraph type="secondary" style={{ marginTop: 8 }}>
              عند التسليم: تصدر الفاتورة تلقائياً، والأجهزة تتضاف لأجهزة العميل ويتفتح لها طلب تركيب.
            </Typography.Paragraph>
          )}
          <Typography.Title level={5} style={{ marginTop: 24 }}>سجل الطلب</Typography.Title>
          <Timeline
            items={o.statusHistory.map((h) => ({
              content: (
                <>
                  <Tag color={STATUS[h.toStatus].color}>{STATUS[h.toStatus].label}</Tag>
                  <Typography.Text type="secondary">{fmtDateTime(h.createdAt)} — {h.changedBy?.name ?? 'العميل'}</Typography.Text>
                  {h.note && <div>{h.note}</div>}
                </>
              ),
            }))}
          />
        </>
      )}
    </Drawer>
  );
}
