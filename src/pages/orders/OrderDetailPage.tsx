import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Col, Descriptions, Input, Popconfirm, Row, Skeleton, Space, Table, Tag, Timeline, Typography } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtAddress, fmtDateTime, fmtMoney } from '../../lib/format';
import { ORDER_STATUS as STATUS, type OrderStatus } from '../../lib/labels';
import { paymentLabel, type OrderDetail } from './types';

const NEXT: Record<OrderStatus, { to: OrderStatus; label: string }[]> = {
  NEW: [{ to: 'PREPARING', label: 'بدء التجهيز' }],
  PREPARING: [{ to: 'OUT_FOR_DELIVERY', label: 'خرج للتوصيل (خصم من المخزن)' }],
  OUT_FOR_DELIVERY: [{ to: 'DELIVERED', label: 'تم التسليم وتحصيل المبلغ' }],
  DELIVERED: [],
  CANCELLED: [],
};

export function OrderDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [cancelNote, setCancelNote] = useState('');
  const { data: o, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => (await api.get<OrderDetail>(`/orders/${id}`)).data,
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

  if (isLoading || !o) return <Card><Skeleton active /></Card>;

  const actions = can('order.write') ? NEXT[o.status] : [];
  const cancellable = can('order.write') && !['DELIVERED', 'CANCELLED'].includes(o.status);
  const statusTag = <Tag color={STATUS[o.status].color}>{STATUS[o.status].label}</Tag>;
  const a = o.address;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'طلبات المتجر', to: '/orders' }, { title: o.number }]}
        title={<Space>{`طلب ${o.number}`}{statusTag}</Space>}
        subtitle={fmtDateTime(o.createdAt)}
        actions={<>
          {cancellable && (
            <Popconfirm
              title="إلغاء الطلب"
              description={
                <div style={{ maxWidth: 260 }}>
                  {o.status === 'OUT_FOR_DELIVERY' && <Typography.Paragraph type="secondary">المنتجات هترجع للمخزن.</Typography.Paragraph>}
                  <Input.TextArea placeholder="السبب" value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} />
                </div>
              }
              okText="إلغاء الطلب" cancelText="رجوع"
              okButtonProps={{ danger: true, disabled: cancelNote.trim().length < 3, loading: move.isPending }}
              onConfirm={() => move.mutateAsync({ status: 'CANCELLED', note: cancelNote.trim() })}
            >
              <Button danger>إلغاء الطلب</Button>
            </Popconfirm>
          )}
          {actions.map((x) => (
            <Popconfirm key={x.to} title={`${x.label}؟`} okText="تأكيد" cancelText="رجوع" onConfirm={() => move.mutateAsync({ status: x.to })}>
              <Button type="primary" loading={move.isPending}>{x.label}</Button>
            </Popconfirm>
          ))}
        </>}
      />

      {o.status === 'OUT_FOR_DELIVERY' && (
        <Alert type="info" showIcon style={{ marginBottom: 16 }}
          title="عند التسليم: تصدر الفاتورة تلقائياً، والأجهزة تتضاف لأجهزة العميل ويتفتح لها طلب تركيب." />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="بيانات الطلب" style={{ marginBottom: 16 }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="العميل">
                <Link to={`/customers/${o.customer.id}`}>{o.customer.name}</Link>
                <div><Typography.Text type="secondary"><bdi dir="ltr">{o.customer.phone}</bdi></Typography.Text></div>
              </Descriptions.Item>
              <Descriptions.Item label="عنوان التوصيل">
                {fmtAddress(a)}
                {(a.floor || a.apartment) && <div><Typography.Text type="secondary">{a.floor && `الدور ${a.floor}`}{a.floor && a.apartment && ' · '}{a.apartment && `شقة ${a.apartment}`}</Typography.Text></div>}
                {a.details && <div><Typography.Text type="secondary">{a.details}</Typography.Text></div>}
              </Descriptions.Item>
              <Descriptions.Item label="الدفع">{paymentLabel(o.paymentMethod)}</Descriptions.Item>
              <Descriptions.Item label="الحالة">{statusTag}</Descriptions.Item>
              {o.notes && <Descriptions.Item label="ملاحظات العميل">{o.notes}</Descriptions.Item>}
              <Descriptions.Item label="الفاتورة">
                {o.invoice ? <Link to={`/invoices/${o.invoice.id}`}>{o.invoice.number}</Link> : <Typography.Text type="secondary">تصدر عند التسليم</Typography.Text>}
              </Descriptions.Item>
            </Descriptions>
          </Card>
          <Card title="سجل الطلب">
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
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card title="الأصناف">
            <Table
              rowKey="id" pagination={false} dataSource={o.items} scroll={{ x: 560 }}
              columns={[
                {
                  title: 'المنتج',
                  render: (_, i) => (
                    <>
                      {i.nameAr} <Typography.Text type="secondary">({i.product.sku})</Typography.Text>
                      {i.product.type === 'DEVICE' && <Tag style={{ marginInlineStart: 6 }}>يحتاج تركيب</Tag>}
                    </>
                  ),
                },
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
          </Card>
        </Col>
      </Row>
    </>
  );
}
