import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Badge, Button, Card, Input, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { FileButton } from '../../components/FileLink';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { downloadCsv, fetchAll } from '../../lib/export';
import { fmtDateTime, fmtMoney } from '../../lib/format';
import { useTabParam } from '../../lib/useOpenParam';
import {
  HANDOVER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS, type HandoverStatus, type PaymentStatus,
} from '../../lib/labels';
import { useCashRows, type CashRow, type HandoverRow, type InvoiceRow, type PaymentRow } from './types';

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
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; status?: string }>({});
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
        rowClassName="clickable"
        onRow={(r) => ({ onClick: () => navigate(`/invoices/${r.id}`) })}
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
    </>
  );
}

/** Reject button that asks for a reason inline (a confirmation, not a separate page). */
function RejectWithReason({ title, loading, onReject }: { title: string; loading: boolean; onReject: (reason: string) => Promise<unknown> }) {
  const [reason, setReason] = useState('');
  return (
    <Popconfirm
      title={title}
      description={<Input.TextArea style={{ width: 260 }} placeholder="السبب" value={reason} onChange={(e) => setReason(e.target.value)} />}
      okText="رفض" cancelText="رجوع"
      okButtonProps={{ danger: true, disabled: reason.trim().length < 3, loading }}
      onConfirm={async () => { await onReject(reason.trim()); setReason(''); }}
    >
      <Button size="small" danger>رفض</Button>
    </Popconfirm>
  );
}

function TransfersTab() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | undefined>('PENDING_VERIFICATION');
  const [page, setPage] = useState(1);
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
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['invoices'] });
      qc.invalidateQueries({ queryKey: ['invoice'] });
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
          {
            title: 'الفاتورة',
            render: (_, p) => <Typography.Link onClick={() => navigate(`/invoices/${p.invoice.id}`)}>{p.invoice.number}</Typography.Link>,
          },
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
                <RejectWithReason
                  title={`رفض التحويل — ${p.invoice.number}`}
                  loading={verify.isPending}
                  onReject={(reason) => verify.mutateAsync({ id: p.id, approve: false, reason })}
                />
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}

function CashTab() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { data, isFetching } = useCashRows();
  return (
    <Table<CashRow>
      rowKey="technicianId"
      loading={isFetching}
      dataSource={data}
      pagination={false}
      rowClassName="clickable"
      onRow={(c) => ({ onClick: () => navigate(`/invoices/cash/${c.technicianId}`) })}
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
            <Space onClick={(e) => e.stopPropagation()}>
              <Button size="small" onClick={() => navigate(`/invoices/cash/${c.technicianId}`)}>كشف الحركة</Button>
              {can('custody.approve') && Number(c.cashInHand) > 0 && (
                <Button size="small" type="primary" onClick={() => navigate(`/invoices/cash/${c.technicianId}/handover`)}>استلام نقدية</Button>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
}

function HandoversTab() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [status, setStatus] = useState<HandoverStatus | undefined>('SUBMITTED');
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['handovers', status, page],
    queryFn: async () => (await api.get<Page<HandoverRow>>('/custody/handovers', { params: { status, page } })).data,
    placeholderData: keepPreviousData,
  });
  const review = useMutation({
    mutationFn: (v: { id: number; approve: boolean; note?: string }) => api.post(`/custody/handovers/${v.id}/review`, v),
    onSuccess: (_, v) => {
      message.success(v.approve ? 'تم تأكيد استلام النقدية' : 'تم رفض التوريد');
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
                <RejectWithReason
                  title="رفض التوريد"
                  loading={review.isPending}
                  onReject={(note) => review.mutateAsync({ id: h.id, approve: false, note })}
                />
              </Space>
            ),
          },
        ]}
      />
    </>
  );
}
