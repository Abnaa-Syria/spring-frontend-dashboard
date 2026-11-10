import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Button, Card, Col, DatePicker, Empty, InputNumber, Progress, Row, Skeleton, Space, Statistic, Table, Tabs, Tag, Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, type Page } from '../../lib/api';
import { useTabParam } from '../../lib/useOpenParam';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtMoney } from '../../lib/format';
import { PAYMENT_METHOD, SERVICE_KIND, SERVICE_STATUS, type PaymentMethod, type ServiceKind, type ServiceStatus } from '../../lib/labels';

interface Summary {
  sales: {
    visits: { total: number; count: number };
    orders: { total: number; count: number };
    total: number;
    payments: { method: PaymentMethod; status: string; amount: number }[];
  };
  services: { byStatus: Partial<Record<ServiceStatus, number>>; byKind: Partial<Record<ServiceKind, number>>; completed: number; avgRating: number | null; ratings: number };
  technicians: { technicianId: number; name: string; code: string; completed: number; revenue: number; avgRating: number | null; cashInHand: number }[];
  topProducts: { id: number; nameAr: string; sku: string; quantity: number; revenue: number }[];
  leads: { byStatus: Record<string, number>; conversionRate: number | null; topReferrers: { id: number; name: string; type: string; leads: number }[] };
  lowStock: { id: number; nameAr: string; sku: string; warehouse: string; quantity: number }[];
}

const PRESETS: { label: string; range: () => [Dayjs, Dayjs] }[] = [
  { label: 'اليوم', range: () => [dayjs().startOf('day'), dayjs().endOf('day')] },
  { label: 'هذا الأسبوع', range: () => [dayjs().startOf('week'), dayjs().endOf('day')] },
  { label: 'هذا الشهر', range: () => [dayjs().startOf('month'), dayjs().endOf('day')] },
  { label: 'الشهر الماضي', range: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

export function ReportsPage() {
  const [tab, setTab] = useTabParam('summary');
  return (
    <>
    <PageHeader title="التقارير" subtitle="أداء المبيعات والخدمة والفنيين، والصيانات المستحقة" />
    <Card>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'summary', label: 'ملخص الأداء', children: <SummaryTab /> },
        { key: 'due', label: 'الصيانات المستحقة', children: <DueTab /> },
      ]} />
    </Card>
    </>
  );
}

function SummaryTab() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>(PRESETS[2].range());
  const { data: d, isFetching } = useQuery({
    queryKey: ['reports', range[0].toISOString(), range[1].toISOString()],
    queryFn: async () =>
      (await api.get<Summary>('/reports/summary', {
        params: { from: range[0].startOf('day').toISOString(), to: range[1].add(1, 'day').startOf('day').toISOString() },
      })).data,
    placeholderData: keepPreviousData,
  });

  const cash = d?.sales.payments.filter((p) => p.method === 'CASH').reduce((s, p) => s + p.amount, 0) ?? 0;
  const pendingTransfers = d?.sales.payments.filter((p) => p.status === 'PENDING_VERIFICATION').reduce((s, p) => s + p.amount, 0) ?? 0;

  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <DatePicker.RangePicker value={range} onChange={(v) => v?.[0] && v[1] && setRange([v[0], v[1]])} allowClear={false} />
        {PRESETS.map((p) => <Button key={p.label} size="small" onClick={() => setRange(p.range())}>{p.label}</Button>)}
      </Space>
      {!d ? <Skeleton active /> : (
        <div style={{ opacity: isFetching ? 0.6 : 1 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} lg={6}><Card size="small"><Statistic title="إجمالي المبيعات" value={fmtMoney(d.sales.total)} /></Card></Col>
            <Col xs={12} lg={6}><Card size="small"><Statistic title={`فواتير الزيارات (${d.sales.visits.count})`} value={fmtMoney(d.sales.visits.total)} /></Card></Col>
            <Col xs={12} lg={6}><Card size="small"><Statistic title={`طلبات المتجر (${d.sales.orders.count})`} value={fmtMoney(d.sales.orders.total)} /></Card></Col>
            <Col xs={12} lg={6}><Card size="small"><Statistic title="تحويلات بانتظار التحقق" value={fmtMoney(pendingTransfers)} styles={{ content: { color: pendingTransfers ? 'var(--c-warning)' : undefined } }} /></Card></Col>
            <Col xs={12} lg={6}><Card size="small"><Statistic title="زيارات مكتملة" value={d.services.completed} /></Card></Col>
            <Col xs={12} lg={6}>
              <Card size="small">
                <Statistic title={`متوسط تقييم العملاء (${d.services.ratings})`} value={d.services.avgRating ? d.services.avgRating.toFixed(1) : '—'} suffix={d.services.avgRating ? '/ 5' : ''} />
              </Card>
            </Col>
            <Col xs={12} lg={6}><Card size="small"><Statistic title="تحصيل نقدي" value={fmtMoney(cash)} /></Card></Col>
            <Col xs={12} lg={6}>
              <Card size="small">
                <Statistic title="نسبة تحويل الترشيحات" value={d.leads.conversionRate == null ? '—' : Math.round(d.leads.conversionRate * 100)} suffix={d.leads.conversionRate == null ? '' : '%'} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="طلبات الخدمة حسب الحالة">
                {Object.keys(d.services.byStatus).length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                  (Object.entries(d.services.byStatus) as [ServiceStatus, number][]).map(([s, n]) => {
                    const all = Object.values(d.services.byStatus).reduce((a, b) => a + (b ?? 0), 0);
                    return (
                      <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 100 }}>{SERVICE_STATUS[s].label}</span>
                        <Progress percent={Math.round((n / all) * 100)} format={() => n} style={{ flex: 1, margin: 0 }} />
                      </div>
                    );
                  })
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="طلبات الخدمة حسب النوع">
                {Object.keys(d.services.byKind).length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                  (Object.entries(d.services.byKind) as [ServiceKind, number][]).map(([k, n]) => {
                    const all = Object.values(d.services.byKind).reduce((a, b) => a + (b ?? 0), 0);
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 120 }}>{SERVICE_KIND[k].label}</span>
                        <Progress percent={Math.round((n / all) * 100)} format={() => n} style={{ flex: 1, margin: 0 }} />
                      </div>
                    );
                  })
                )}
              </Card>
            </Col>
          </Row>

          <Card size="small" title="أداء الفنيين" style={{ marginTop: 16 }}>
            <Table
              rowKey="technicianId" size="small" pagination={false} dataSource={d.technicians} scroll={{ x: 600 }}
              locale={{ emptyText: 'لا توجد زيارات مكتملة في الفترة' }}
              columns={[
                { title: 'الفني', render: (_, t) => <>{t.name} <Typography.Text type="secondary">({t.code})</Typography.Text></> },
                { title: 'زيارات مكتملة', dataIndex: 'completed' },
                { title: 'قيمة الفواتير', dataIndex: 'revenue', render: fmtMoney },
                { title: 'متوسط التقييم', dataIndex: 'avgRating', render: (v: number | null) => (v ? `${v.toFixed(1)} ★` : '—') },
                { title: 'نقدية في العهدة الآن', dataIndex: 'cashInHand', render: (v: number) => <Typography.Text type={v > 0 ? 'warning' : undefined}>{fmtMoney(v)}</Typography.Text> },
              ]}
            />
          </Card>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="الأكثر مبيعاً">
                <Table
                  rowKey="id" size="small" pagination={false} dataSource={d.topProducts}
                  columns={[
                    { title: 'المنتج', render: (_, p) => p.nameAr },
                    { title: 'الكمية', dataIndex: 'quantity' },
                    { title: 'الإيراد', dataIndex: 'revenue', render: fmtMoney },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="أكثر من رشّح عملاء">
                <Table
                  rowKey="id" size="small" pagination={false} dataSource={d.leads.topReferrers}
                  columns={[
                    { title: 'الاسم', render: (_, r) => <>{r.name} <Tag>{r.type === 'TECHNICIAN' ? 'فني' : r.type === 'SALES_REP' ? 'مندوب' : 'موظف'}</Tag></> },
                    { title: 'الترشيحات', dataIndex: 'leads' },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card size="small" title="التحصيل حسب طريقة الدفع">
                <Table
                  rowKey={(p) => `${p.method}-${p.status}`} size="small" pagination={false} dataSource={d.sales.payments}
                  columns={[
                    { title: 'الطريقة', render: (_, p) => PAYMENT_METHOD[p.method].label },
                    { title: 'الحالة', render: (_, p) => ({ CONFIRMED: 'مؤكد', PENDING_VERIFICATION: 'بانتظار التحقق', REJECTED: 'مرفوض' } as Record<string, string>)[p.status] },
                    { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card size="small" title="منتجات قاربت على النفاد (المخازن الرئيسية)">
                <Table
                  rowKey={(p) => `${p.id}-${p.warehouse}`} size="small" pagination={false} dataSource={d.lowStock}
                  locale={{ emptyText: 'كل الأرصدة كافية' }}
                  columns={[
                    { title: 'المنتج', render: (_, p) => `${p.nameAr} (${p.sku})` },
                    { title: 'المخزن', dataIndex: 'warehouse' },
                    { title: 'الرصيد', dataIndex: 'quantity', render: (q: number) => <Tag color={q === 0 ? 'red' : 'orange'}>{q}</Tag> },
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </>
  );
}

interface DueRow {
  id: number;
  modelName: string;
  serialNumber: string | null;
  nextMaintenanceAt: string;
  customer: { id: number; name: string; phone: string; userId: number | null };
  address: { city: string; area: string | null } | null;
  serviceRequests: { id: number; number: string; status: ServiceStatus }[];
}

/** Call list for the office: devices due for maintenance soon (or overdue). */
function DueTab() {
  const { can } = useAuth();
  const [days, setDays] = useState(14);
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const { data, isFetching } = useQuery({
    queryKey: ['maintenance-due', days, page],
    queryFn: async () => (await api.get<Page<DueRow>>('/maintenance/due', { params: { days, page } })).data,
    placeholderData: keepPreviousData,
  });
  const today = dayjs().startOf('day');

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        مستحقة خلال
        <InputNumber min={0} max={365} value={days} onChange={(v) => { setDays(v ?? 14); setPage(1); }} />
        يوم (والمتأخرة)
      </Space>
      <Table<DueRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          {
            title: 'موعد الصيانة',
            render: (_, r) => {
              const diff = dayjs(r.nextMaintenanceAt).startOf('day').diff(today, 'day');
              return <>{fmtDate(r.nextMaintenanceAt)} <Tag color={diff < 0 ? 'red' : diff <= 3 ? 'orange' : 'blue'}>{diff < 0 ? `متأخر ${-diff} يوم` : diff === 0 ? 'اليوم' : `بعد ${diff} يوم`}</Tag></>;
            },
          },
          { title: 'العميل', render: (_, r) => <>{r.customer.name}<br /><Typography.Text type="secondary" dir="ltr">{r.customer.phone}</Typography.Text></> },
          { title: 'الجهاز', render: (_, r) => <>{r.modelName}{r.serialNumber && <Typography.Text type="secondary"> ({r.serialNumber})</Typography.Text>}</> },
          { title: 'المنطقة', render: (_, r) => (r.address ? [r.address.area, r.address.city].filter(Boolean).join('، ') : '—') },
          { title: 'التطبيق', render: (_, r) => (r.customer.userId ? <Tag color="green">يصله تذكير</Tag> : <Tag>اتصال هاتفي</Tag>) },
          {
            title: '',
            render: (_, r) => r.serviceRequests[0]
              ? <Tag color="geekblue">{r.serviceRequests[0].number}</Tag>
              : can('service.write') && <Button size="small" type="primary" onClick={() => navigate(`/service-requests/new?customerId=${r.customer.id}`)}>حجز زيارة</Button>,
          },
        ]}
      />
    </>
  );
}
