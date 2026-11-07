import { PrinterOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Descriptions, Input, Popconfirm, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { FileButton } from '../../components/FileLink';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, fmtMoney } from '../../lib/format';
import { PAYMENT_METHOD, PAYMENT_STATUS, type PaymentMethod } from '../../lib/labels';
import { printInvoice } from '../../lib/printInvoice';
import type { InvoiceDetail } from './types';

export function InvoiceDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get<InvoiceDetail>(`/invoices/${id}`)).data,
  });
  const voidIt = useMutation({
    mutationFn: () => api.post(`/invoices/${id}/void`, { reason: reason.trim() }),
    onSuccess: () => {
      message.success('تم إلغاء الفاتورة وإرجاع المنتجات للعهدة');
      setReason('');
      ['invoice', 'invoices', 'payments', 'balances', 'movements', 'cash'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !inv) return <Card><Skeleton active /></Card>;

  const print = async () => {
    if (!(await printInvoice(inv, (m) => PAYMENT_METHOD[m as PaymentMethod]?.label ?? m))) {
      message.warning('اسمح بفتح النوافذ المنبثقة للطباعة');
    }
  };
  const statusTag = inv.status === 'VOID' ? <Tag color="red">ملغاة</Tag> : <Tag color="green">صادرة</Tag>;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'الفواتير والتحصيل', to: '/invoices' }, { title: inv.number }]}
        title={<Space>{`فاتورة ${inv.number}`}{statusTag}</Space>}
        subtitle={`${fmtDateTime(inv.issuedAt)} — ${inv.issuedBy.name}`}
        actions={<>
          <Button icon={<PrinterOutlined />} onClick={print}>طباعة</Button>
          {inv.status === 'ISSUED' && can('invoice.void') && (
            <Popconfirm
              title="إلغاء الفاتورة"
              description={
                <div style={{ maxWidth: 280 }}>
                  <Typography.Paragraph type="secondary">المنتجات هترجع لعهدة الفني، والنقدية المحصلة هتتخصم من عهدته.</Typography.Paragraph>
                  <Input.TextArea placeholder="سبب الإلغاء" value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>
              }
              okText="إلغاء الفاتورة" cancelText="رجوع"
              okButtonProps={{ danger: true, disabled: reason.trim().length < 3, loading: voidIt.isPending }}
              onConfirm={() => voidIt.mutateAsync()}
            >
              <Button danger>إلغاء الفاتورة</Button>
            </Popconfirm>
          )}
        </>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={9}>
          <Card title="بيانات الفاتورة" style={{ height: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="العميل">
                <Link to={`/customers/${inv.customer.id}`}>{inv.customer.name}</Link>
                <div><Typography.Text type="secondary"><bdi dir="ltr">{inv.customer.phone}</bdi></Typography.Text></div>
              </Descriptions.Item>
              <Descriptions.Item label="المصدر">
                {inv.serviceRequest
                  ? <Link to={`/service-requests/${inv.serviceRequest.id}`}>زيارة {inv.serviceRequest.number}</Link>
                  : inv.orderId ? <Link to={`/orders/${inv.orderId}`}>طلب متجر</Link> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="الفني">{inv.technician?.user.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="تاريخ الإصدار">{fmtDateTime(inv.issuedAt)}</Descriptions.Item>
              <Descriptions.Item label="أصدرها">{inv.issuedBy.name}</Descriptions.Item>
              <Descriptions.Item label="الحالة">{statusTag}</Descriptions.Item>
              {inv.status === 'VOID' && (
                <Descriptions.Item label="الإلغاء">
                  {fmtDateTime(inv.voidedAt)} — {inv.voidedBy?.name}
                  <div><Typography.Text type="secondary">{inv.voidReason}</Typography.Text></div>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} xl={15}>
          <Card title="البنود" style={{ marginBottom: 16 }}>
            <Table
              rowKey="id" pagination={false} dataSource={inv.items}
              columns={[
                { title: 'البند', render: (_, i) => <>{i.description}{i.product && <Typography.Text type="secondary"> ({i.product.sku})</Typography.Text>}</> },
                { title: 'السعر', dataIndex: 'unitPrice', render: fmtMoney },
                { title: 'الكمية', dataIndex: 'quantity' },
                { title: 'الإجمالي', dataIndex: 'lineTotal', render: fmtMoney },
              ]}
              summary={() => (
                <>
                  {Number(inv.discount) > 0 && (
                    <>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>الإجمالي قبل الخصم</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>{fmtMoney(inv.subtotal)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>الخصم</Table.Summary.Cell>
                        <Table.Summary.Cell index={1}>{fmtMoney(inv.discount)}</Table.Summary.Cell>
                      </Table.Summary.Row>
                    </>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={3}><Typography.Text strong>الإجمالي</Typography.Text></Table.Summary.Cell>
                    <Table.Summary.Cell index={1}><Typography.Text strong>{fmtMoney(inv.total)}</Typography.Text></Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              )}
            />
          </Card>
          <Card title="المدفوعات">
            <Table
              rowKey="id" pagination={false} dataSource={inv.payments} scroll={{ x: 640 }}
              columns={[
                { title: 'الطريقة', render: (_, p) => PAYMENT_METHOD[p.method].label },
                { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
                {
                  title: 'المرجع / الإيصال',
                  render: (_, p) => (
                    <Space>{p.reference && <bdi dir="ltr">{p.reference}</bdi>}{p.receipt && <FileButton fileId={p.receipt.id} />}{!p.reference && !p.receipt && '—'}</Space>
                  ),
                },
                { title: 'الحالة', render: (_, p) => <EnumTag map={PAYMENT_STATUS} value={p.status} /> },
                { title: 'المراجعة', render: (_, p) => (p.verifiedBy ? `${p.verifiedBy.name} — ${fmtDateTime(p.verifiedAt)}` : p.rejectReason ?? '—') },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </>
  );
}
