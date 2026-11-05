import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Badge, Button, Card, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm, Select, Skeleton, Space,
  Table, Tabs, Tag, Typography,
} from 'antd';
import { DownloadOutlined, PrinterOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { EnumTag } from '../../components/EnumTag';
import { FileButton } from '../../components/FileLink';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { downloadCsv, fetchAll } from '../../lib/export';
import { fmtDateTime, fmtMoney, fmtSigned } from '../../lib/format';
import { printInvoice } from '../../lib/printInvoice';
import { useOpenParam, useTabParam } from '../../lib/useOpenParam';
import {
  HANDOVER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, type HandoverStatus, type PaymentMethod, type PaymentStatus,
} from '../../lib/labels';

interface TechBrief { id: number; code: string; user: { name: string } }
interface InvoiceRow {
  id: number; number: string; status: 'ISSUED' | 'VOID'; total: string; issuedAt: string;
  customer: { id: number; name: string; phone: string };
  technician: TechBrief | null;
  serviceRequest: { id: number; number: string } | null;
  payments: { method: PaymentMethod; status: PaymentStatus; amount: string }[];
}
interface InvoiceDetail extends InvoiceRow {
  subtotal: string; discount: string; voidReason: string | null; voidedAt: string | null;
  items: { id: number; description: string; unitPrice: string; quantity: number; lineTotal: string; product: { sku: string } | null }[];
  payments: (InvoiceRow['payments'][number] & {
    id: number; reference: string | null; rejectReason: string | null; verifiedBy: { name: string } | null;
    verifiedAt: string | null; receipt: { id: number } | null;
  })[];
  issuedBy: { name: string }; voidedBy: { name: string } | null;
}
interface PaymentRow {
  id: number; method: PaymentMethod; status: PaymentStatus; amount: string; reference: string | null; createdAt: string;
  rejectReason: string | null; receiptFileId: number | null;
  invoice: { id: number; number: string; customer: { name: string; phone: string } };
  technician: TechBrief | null; verifiedBy: { name: string } | null;
}
interface CashRow { technicianId: number; code: string; name: string; isActive: boolean; cashInHand: string; pendingHandovers: string }
interface HandoverRow {
  id: number; amount: string; status: HandoverStatus; note: string | null; createdAt: string; reviewedAt: string | null;
  technician: TechBrief; reviewedBy: { name: string } | null;
}

export function BillingPage() {
  const { can } = useAuth();
  const pending = useQuery({
    queryKey: ['payments', 'pending-count'],
    queryFn: async () => (await api.get<Page<PaymentRow>>('/payments', { params: { status: 'PENDING_VERIFICATION', pageSize: 1 } })).data.total,
    enabled: can('payment.read'),
  });
  const handovers = useQuery({
    queryKey: ['handovers', 'pending-count'],
    queryFn: async () => (await api.get<Page<HandoverRow>>('/custody/handovers', { params: { status: 'SUBMITTED', pageSize: 1 } })).data.total,
    enabled: can('custody.read'),
  });

  const [tab, setTab] = useTabParam('invoices');

  return (
    <>
    <PageHeader title="الفواتير والتحصيل" subtitle="الفواتير الصادرة، مراجعة التحويلات، وعهدة الفنيين النقدية" />
    <Card>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'invoices', label: 'الفواتير', children: <InvoicesTab /> },
        ...(can('payment.read') ? [{
          key: 'transfers',
          label: <Space size={6}>التحويلات بانتظار التحقق<Badge count={pending.data} size="small" /></Space>,
          children: <TransfersTab />,
        }] : []),
        ...(can('custody.read') ? [
          { key: 'cash', label: 'العهدة النقدية للفنيين', children: <CashTab /> },
          {
            key: 'handovers',
            label: <Space size={6}>توريدات النقدية<Badge count={handovers.data} size="small" /></Space>,
            children: <HandoversTab />,
          },
        ] : []),
      ]} />
    </Card>
    </>
  );
}

function InvoicesTab() {
  const { message } = App.useApp();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; status?: string }>({});
  const [openId, setOpenId] = useOpenParam();
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll<InvoiceRow>('/invoices', filters);
      downloadCsv('invoices', [
        { title: 'رقم الفاتورة', value: (r) => r.number },
        { title: 'التاريخ', value: (r) => fmtDateTime(r.issuedAt) },
        { title: 'العميل', value: (r) => r.customer.name },
        { title: 'الموبايل', value: (r) => r.customer.phone },
        { title: 'الزيارة', value: (r) => r.serviceRequest?.number },
        { title: 'الفني', value: (r) => r.technician?.user.name },
        { title: 'الإجمالي', value: (r) => Number(r.total) },
        { title: 'الدفع', value: (r) => r.payments.map((p) => `${PAYMENT_METHOD[p.method].label} (${PAYMENT_STATUS[p.status].label})`).join(' + ') },
        { title: 'الحالة', value: (r) => (r.status === 'VOID' ? 'ملغاة' : 'صادرة') },
      ], rows);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };
  const { data, isFetching } = useQuery({
    queryKey: ['invoices', filters, page],
    queryFn: async () =>
      (await api.get<Page<InvoiceRow> & { totalAmount: string }>('/invoices', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search placeholder="رقم الفاتورة، اسم أو موبايل العميل" allowClear style={{ width: 280 }}
            onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
          <Select allowClear placeholder="الحالة" style={{ width: 140 }}
            options={[{ value: 'ISSUED', label: 'صادرة' }, { value: 'VOID', label: 'ملغاة' }]}
            onChange={(v) => { setFilters((f) => ({ ...f, status: v })); setPage(1); }} />
        </Space>
        <Space wrap>
          <Typography.Text>إجمالي الفواتير الصادرة: <Typography.Text strong>{fmtMoney(data?.totalAmount)}</Typography.Text></Typography.Text>
          <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>تصدير Excel</Button>
        </Space>
      </Space>
      <Table<InvoiceRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'رقم الفاتورة', dataIndex: 'number' },
          { title: 'التاريخ', dataIndex: 'issuedAt', render: fmtDateTime },
          { title: 'العميل', render: (_, r) => r.customer.name },
          { title: 'الزيارة', render: (_, r) => r.serviceRequest?.number ?? '—' },
          { title: 'الفني', render: (_, r) => r.technician?.user.name ?? '—' },
          { title: 'الإجمالي', dataIndex: 'total', render: fmtMoney },
          {
            title: 'الدفع',
            render: (_, r) => r.payments.map((p, i) => (
              <Space key={i} size={4}>{PAYMENT_METHOD[p.method].label}<EnumTag map={PAYMENT_STATUS} value={p.status} /></Space>
            )),
          },
          { title: 'الحالة', render: (_, r) => (r.status === 'VOID' ? <Tag color="red">ملغاة</Tag> : <Tag color="green">صادرة</Tag>) },
        ]}
      />
      <InvoiceDrawer id={openId} onClose={() => setOpenId(null)} />
    </>
  );
}

function InvoiceDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const { data: inv, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => (await api.get<InvoiceDetail>(`/invoices/${id}`)).data,
    enabled: id != null,
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

  return (
    <Drawer open={id != null} onClose={onClose} size={640}
      title={inv ? <Space>{inv.number}{inv.status === 'VOID' ? <Tag color="red">ملغاة</Tag> : <Tag color="green">صادرة</Tag>}</Space> : 'الفاتورة'}
      extra={inv && (
        <Space>
        <Button icon={<PrinterOutlined />} onClick={async () => {
          if (!(await printInvoice(inv, (m) => PAYMENT_METHOD[m as PaymentMethod]?.label ?? m))) {
            message.warning('اسمح بفتح النوافذ المنبثقة للطباعة');
          }
        }}>طباعة</Button>
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
        </Space>
      )}
    >
      {isLoading || !inv ? <Skeleton active /> : (
        <>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="العميل">{inv.customer.name} — <span dir="ltr">{inv.customer.phone}</span></Descriptions.Item>
            <Descriptions.Item label="الزيارة">{inv.serviceRequest?.number ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="الفني">{inv.technician?.user.name ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="تاريخ الإصدار">{fmtDateTime(inv.issuedAt)} — {inv.issuedBy.name}</Descriptions.Item>
            {inv.status === 'VOID' && (
              <Descriptions.Item label="الإلغاء">{fmtDateTime(inv.voidedAt)} — {inv.voidedBy?.name}: {inv.voidReason}</Descriptions.Item>
            )}
          </Descriptions>
          <Table
            rowKey="id" size="small" pagination={false} style={{ marginTop: 16 }} dataSource={inv.items}
            columns={[
              { title: 'البند', dataIndex: 'description' },
              { title: 'السعر', dataIndex: 'unitPrice', render: fmtMoney },
              { title: 'الكمية', dataIndex: 'quantity' },
              { title: 'الإجمالي', dataIndex: 'lineTotal', render: fmtMoney },
            ]}
            summary={() => (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={3}><Typography.Text strong>الإجمالي</Typography.Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><Typography.Text strong>{fmtMoney(inv.total)}</Typography.Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
          <Typography.Title level={5} style={{ marginTop: 24 }}>المدفوعات</Typography.Title>
          <Table
            rowKey="id" size="small" pagination={false} dataSource={inv.payments}
            columns={[
              { title: 'الطريقة', render: (_, p) => PAYMENT_METHOD[p.method].label },
              { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
              {
                title: 'المرجع',
                render: (_, p) => (
                  <Space>{p.reference ?? (p.receipt ? null : '—')}{p.receipt && <FileButton fileId={p.receipt.id} />}</Space>
                ),
              },
              { title: 'الحالة', render: (_, p) => <EnumTag map={PAYMENT_STATUS} value={p.status} /> },
              { title: 'المراجعة', render: (_, p) => (p.verifiedBy ? `${p.verifiedBy.name} — ${fmtDateTime(p.verifiedAt)}` : p.rejectReason ?? '—') },
            ]}
          />
        </>
      )}
    </Drawer>
  );
}

function TransfersTab() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | undefined>('PENDING_VERIFICATION');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<PaymentRow | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['payments', status, page],
    queryFn: async () =>
      (await api.get<Page<PaymentRow>>('/payments', { params: { status, page } })).data,
    placeholderData: keepPreviousData,
  });
  const verify = useMutation({
    mutationFn: (v: { id: number; approve: boolean; reason?: string }) => api.post(`/payments/${v.id}/verify`, v),
    onSuccess: (_, v) => {
      message.success(v.approve ? 'تم تأكيد استلام المبلغ' : 'تم رفض التحويل');
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <>
      <Select value={status} allowClear placeholder="كل المدفوعات" style={{ width: 200, marginBottom: 16 }}
        options={Object.entries(PAYMENT_STATUS).map(([value, v]) => ({ value, label: v.label }))}
        onChange={(v) => { setStatus(v); setPage(1); }} />
      <Table<PaymentRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
          { title: 'الفاتورة', render: (_, p) => p.invoice.number },
          { title: 'العميل', render: (_, p) => p.invoice.customer.name },
          { title: 'الفني', render: (_, p) => p.technician?.user.name ?? '—' },
          { title: 'الطريقة', render: (_, p) => PAYMENT_METHOD[p.method].label },
          {
            title: 'المرجع / الإيصال',
            render: (_, p) => (
              <Space>
                {p.reference && <span dir="ltr">{p.reference}</span>}
                {p.receiptFileId && <FileButton fileId={p.receiptFileId} />}
                {!p.reference && !p.receiptFileId && '—'}
              </Space>
            ),
          },
          { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
          { title: 'الحالة', render: (_, p) => <EnumTag map={PAYMENT_STATUS} value={p.status} /> },
          {
            title: '',
            render: (_, p) => p.status === 'PENDING_VERIFICATION' && can('payment.verify') && (
              <Space>
                <Popconfirm title="تأكيد وصول المبلغ للحساب؟" okText="تأكيد" cancelText="رجوع"
                  onConfirm={() => verify.mutateAsync({ id: p.id, approve: true })}>
                  <Button size="small" type="primary">تأكيد</Button>
                </Popconfirm>
                <Button size="small" danger onClick={() => setRejecting(p)}>رفض</Button>
              </Space>
            ),
          },
        ]}
      />
      <ReasonModal
        open={!!rejecting}
        title={`رفض التحويل — ${rejecting?.invoice.number ?? ''}`}
        loading={verify.isPending}
        onCancel={() => setRejecting(null)}
        onSubmit={(reason) => verify.mutate({ id: rejecting!.id, approve: false, reason })}
      />
    </>
  );
}

function CashTab() {
  const { can } = useAuth();
  const [recording, setRecording] = useState<CashRow | null>(null);
  const [ledgerOf, setLedgerOf] = useState<CashRow | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['cash'],
    queryFn: async () => (await api.get<CashRow[]>('/custody/cash')).data,
  });
  return (
    <>
      <Table<CashRow>
        rowKey="technicianId"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        columns={[
          { title: 'الفني', render: (_, c) => <>{c.name} <Typography.Text type="secondary">({c.code})</Typography.Text></> },
          {
            title: 'النقدية في العهدة',
            dataIndex: 'cashInHand',
            render: (v: string) => <Typography.Text strong type={Number(v) > 0 ? 'warning' : undefined}>{fmtMoney(v)}</Typography.Text>,
          },
          { title: 'توريدات بانتظار المراجعة', dataIndex: 'pendingHandovers', render: fmtMoney },
          {
            title: '',
            render: (_, c) => (
              <Space>
                <Button size="small" onClick={() => setLedgerOf(c)}>كشف الحركة</Button>
                {can('custody.approve') && Number(c.cashInHand) > 0 && (
                  <Button size="small" type="primary" onClick={() => setRecording(c)}>استلام نقدية</Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <RecordHandoverModal tech={recording} onClose={() => setRecording(null)} />
      <CashLedgerModal tech={ledgerOf} onClose={() => setLedgerOf(null)} />
    </>
  );
}

const CASH_TYPE: Record<string, { label: string; sign: 1 | -1 }> = {
  COLLECTION: { label: 'تحصيل من عميل', sign: 1 },
  HANDOVER: { label: 'توريد للخزينة', sign: -1 },
  ADJUSTMENT_IN: { label: 'تسوية بالزيادة', sign: 1 },
  ADJUSTMENT_OUT: { label: 'تسوية بالنقص / إلغاء', sign: -1 },
};

function CashLedgerModal({ tech, onClose }: { tech: CashRow | null; onClose: () => void }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['cash', 'entries', tech?.technicianId, page],
    queryFn: async () => (await api.get<Page<{
      id: number; type: string; amount: string; note: string | null; createdAt: string;
      payment: { invoice: { number: string } } | null; createdBy: { name: string };
    }> & { balance: string }>(`/custody/cash/${tech!.technicianId}/entries`, { params: { page } })).data,
    enabled: !!tech,
  });
  return (
    <Modal open={!!tech} onCancel={onClose} footer={null} width={820} destroyOnHidden
      title={`كشف العهدة النقدية — ${tech?.name ?? ''}`}>
      <Typography.Paragraph>الرصيد الحالي: <Typography.Text strong>{fmtMoney(data?.balance)}</Typography.Text></Typography.Paragraph>
      <Table
        rowKey="id" size="small" loading={isFetching} dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
          { title: 'الحركة', render: (_, e) => CASH_TYPE[e.type]?.label ?? e.type },
          {
            title: 'المبلغ',
            render: (_, e) => {
              const sign = CASH_TYPE[e.type]?.sign ?? 1;
              return (
                <Typography.Text type={sign > 0 ? 'success' : 'danger'}>
                  <bdi dir="ltr">{fmtSigned(sign * Number(e.amount))}</bdi>
                </Typography.Text>
              );
            },
          },
          { title: 'المرجع', render: (_, e) => e.payment?.invoice.number ?? e.note ?? '—' },
          { title: 'بواسطة', render: (_, e) => e.createdBy.name },
        ]}
      />
    </Modal>
  );
}

function RecordHandoverModal({ tech, onClose }: { tech: CashRow | null; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (v: { amount: number; note?: string }) => api.post('/custody/handovers', { ...v, technicianId: tech!.technicianId }),
    onSuccess: () => {
      message.success('تم تسجيل استلام النقدية');
      qc.invalidateQueries({ queryKey: ['cash'] });
      qc.invalidateQueries({ queryKey: ['handovers'] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  return (
    <Modal open={!!tech} title={`استلام نقدية من ${tech?.name ?? ''}`} onCancel={onClose} onOk={() => form.submit()}
      okText="تسجيل" cancelText="إلغاء" confirmLoading={save.isPending} destroyOnHidden>
      <Typography.Paragraph type="secondary">في العهدة: {fmtMoney(tech?.cashInHand)}</Typography.Paragraph>
      <Form form={form} layout="vertical" preserve={false} onFinish={save.mutate}
        initialValues={{ amount: tech ? Number(tech.cashInHand) - Number(tech.pendingHandovers) : undefined }}>
        <Form.Item name="amount" label="المبلغ المستلم" rules={[{ required: true, message: 'مطلوب' }]}>
          <InputNumber min={0.01} max={tech ? Number(tech.cashInHand) : undefined} precision={2} style={{ width: '100%' }} suffix="ج.م" />
        </Form.Item>
        <Form.Item name="note" label="ملاحظة"><Input /></Form.Item>
      </Form>
    </Modal>
  );
}

function HandoversTab() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [status, setStatus] = useState<HandoverStatus | undefined>('SUBMITTED');
  const [page, setPage] = useState(1);
  const [rejecting, setRejecting] = useState<HandoverRow | null>(null);
  const { data, isFetching } = useQuery({
    queryKey: ['handovers', status, page],
    queryFn: async () => (await api.get<Page<HandoverRow>>('/custody/handovers', { params: { status, page } })).data,
    placeholderData: keepPreviousData,
  });
  const review = useMutation({
    mutationFn: (v: { id: number; approve: boolean; note?: string }) => api.post(`/custody/handovers/${v.id}/review`, v),
    onSuccess: (_, v) => {
      message.success(v.approve ? 'تم تأكيد استلام النقدية' : 'تم رفض التوريد');
      setRejecting(null);
      qc.invalidateQueries({ queryKey: ['handovers'] });
      qc.invalidateQueries({ queryKey: ['cash'] });
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  return (
    <>
      <Select value={status} allowClear placeholder="كل التوريدات" style={{ width: 200, marginBottom: 16 }}
        options={Object.entries(HANDOVER_STATUS).map(([value, v]) => ({ value, label: v.label }))}
        onChange={(v) => { setStatus(v); setPage(1); }} />
      <Table<HandoverRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
          { title: 'الفني', render: (_, h) => h.technician.user.name },
          { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
          { title: 'ملاحظة', dataIndex: 'note', render: (v) => v ?? '—' },
          { title: 'الحالة', render: (_, h) => <EnumTag map={HANDOVER_STATUS} value={h.status} /> },
          { title: 'المراجعة', render: (_, h) => (h.reviewedBy ? `${h.reviewedBy.name} — ${fmtDateTime(h.reviewedAt)}` : '—') },
          {
            title: '',
            render: (_, h) => h.status === 'SUBMITTED' && can('custody.approve') && (
              <Space>
                <Popconfirm title="تأكيد استلام المبلغ نقداً؟" okText="تأكيد" cancelText="رجوع"
                  onConfirm={() => review.mutateAsync({ id: h.id, approve: true })}>
                  <Button size="small" type="primary">تأكيد الاستلام</Button>
                </Popconfirm>
                <Button size="small" danger onClick={() => setRejecting(h)}>رفض</Button>
              </Space>
            ),
          },
        ]}
      />
      <ReasonModal
        open={!!rejecting}
        title="رفض التوريد"
        loading={review.isPending}
        onCancel={() => setRejecting(null)}
        onSubmit={(note) => review.mutate({ id: rejecting!.id, approve: false, note })}
      />
    </>
  );
}

function ReasonModal({ open, title, loading, onCancel, onSubmit }: {
  open: boolean; title: string; loading: boolean; onCancel: () => void; onSubmit: (reason: string) => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  return (
    <Modal open={open} title={title} onCancel={onCancel} onOk={() => form.submit()} okText="رفض"
      okButtonProps={{ danger: true }} cancelText="رجوع" confirmLoading={loading} destroyOnHidden>
      <Form form={form} layout="vertical" preserve={false} onFinish={(v) => onSubmit(v.reason.trim())}>
        <Form.Item name="reason" label="السبب" rules={[{ required: true, min: 3, message: 'اذكر السبب' }]}><Input.TextArea /></Form.Item>
      </Form>
    </Modal>
  );
}
