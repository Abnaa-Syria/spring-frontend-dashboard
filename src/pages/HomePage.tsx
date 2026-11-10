import {
  AlertOutlined, CalendarOutlined, CheckCircleOutlined, ClockCircleOutlined, DollarOutlined, DropboxOutlined,
  LeftOutlined, RiseOutlined, ShoppingCartOutlined, StarOutlined, SwapOutlined, ToolOutlined,
  UserSwitchOutlined, WalletOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Col, Empty, Flex, Row, Segmented, Skeleton, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { EnumTag } from '../components/EnumTag';
import { PageHeader } from '../components/PageHeader';
import { StatCard, TONES, pctChange, type Tone } from '../components/StatCard';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useThemeMode } from '../lib/themeMode';
import { fmtMoney, fmtNumber } from '../lib/format';
import { PRIORITY, SERVICE_KIND, SERVICE_STATUS, type ServiceKind, type ServicePriority, type ServiceStatus } from '../lib/labels';

interface Overview {
  kpis: {
    revenueMonth: number | null; revenueLastMonthToDate: number | null;
    requestsToday: number; requestsYesterday: number; visitsToday: number; completedToday: number;
    newCustomersMonth: number; avgRating30d: number | null; ratings30d: number;
  };
  series: { date: string; created: number; completed: number; visits: number; orders: number }[];
  actions: {
    unassigned: number; emergencies: number; dueMaintenance7d: number;
    pendingTransfers: { count: number; amount: number } | null;
    submittedHandovers: { count: number; amount: number } | null;
    newOrders: number | null; newLeads: number | null; lowStock: number | null;
  };
  today: {
    id: number; number: string; kind: ServiceKind; status: ServiceStatus; priority: ServicePriority; scheduledAt: string;
    customer: { name: string }; address: { city: string; area: string | null };
    technician: { user: { name: string } } | null;
  }[];
  technicians: { id: number; name: string; state: 'OFF' | 'BUSY' | 'FREE'; visitsToday: number }[];
}


const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'صباح الخير' : 'مساء الخير';
};

export function HomePage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();
  const [chart, setChart] = useState<'requests' | 'revenue'>('requests');
  const { palette: pal } = useThemeMode();
  const C1 = pal.primary;
  const C2 = pal.accent;
  const AXIS = { fontSize: 12, fill: pal.subtle, fontFamily: 'Cairo' };
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => (await api.get<Overview>('/dashboard/overview')).data,
    enabled: can('service.read'),
    refetchInterval: 60_000,
  });

  if (!can('service.read')) {
    return (
      <>
        <PageHeader title={`${greeting()}، ${user?.name ?? ''}`} />
        <Card><Empty description="استخدم القائمة الجانبية للوصول إلى الأقسام المتاحة لك" /></Card>
      </>
    );
  }

  const k = data?.kpis;
  const series = (data?.series ?? []).map((s) => ({ ...s, label: dayjs(s.date).format('D/M') }));
  const showRevenue = k?.revenueMonth != null;

  return (
    <>
      <PageHeader
        title={`${greeting()}، ${user?.name ?? ''}`}
        subtitle={`ملخص التشغيل · ${dayjs().format('dddd D MMMM YYYY')}`}
      />

      <Row gutter={[16, 16]}>
        {showRevenue && (
          <Col xs={24} sm={12} xl={6}>
            <StatCard
              loading={isLoading} tone="green" icon={<DollarOutlined />} label="إيرادات الشهر"
              value={<bdi>{fmtMoney(k?.revenueMonth)}</bdi>}
              delta={pctChange(k?.revenueMonth, k?.revenueLastMonthToDate)} hint="مقارنة بنفس الفترة الشهر الماضي"
              onClick={() => navigate('/invoices')}
            />
          </Col>
        )}
        <Col xs={24} sm={12} xl={showRevenue ? 6 : 8}>
          <StatCard
            loading={isLoading} tone="blue" icon={<ToolOutlined />} label="طلبات جديدة اليوم"
            value={fmtNumber(k?.requestsToday ?? 0)}
            delta={pctChange(k?.requestsToday, k?.requestsYesterday)} hint={`أمس: ${fmtNumber(k?.requestsYesterday ?? 0)}`}
            onClick={() => navigate('/service-requests')}
          />
        </Col>
        <Col xs={24} sm={12} xl={showRevenue ? 6 : 8}>
          <StatCard
            loading={isLoading} tone="teal" icon={<CalendarOutlined />} label="زيارات اليوم"
            value={<>{fmtNumber(k?.completedToday ?? 0)}<span style={{ fontSize: 16, color: 'var(--c-subtle)', fontWeight: 600 }}> / {fmtNumber(k?.visitsToday ?? 0)}</span></>}
            hint="مكتملة من المجدولة"
          />
        </Col>
        <Col xs={24} sm={12} xl={showRevenue ? 6 : 8}>
          <StatCard
            loading={isLoading} tone="orange" icon={<StarOutlined />} label="تقييم العملاء (30 يوم)"
            value={k?.avgRating30d != null ? <>{k.avgRating30d.toFixed(1)}<span style={{ fontSize: 16, color: 'var(--c-subtle)', fontWeight: 600 }}> / 5</span></> : '—'}
            hint={`${fmtNumber(k?.ratings30d ?? 0)} تقييم · ${fmtNumber(k?.newCustomersMonth ?? 0)} عميل جديد هذا الشهر`}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card
            title="آخر 14 يوم"
            extra={showRevenue && (
              <Segmented
                size="small"
                value={chart}
                onChange={(v) => setChart(v as typeof chart)}
                options={[{ value: 'requests', label: 'الطلبات' }, { value: 'revenue', label: 'الإيرادات' }]}
              />
            )}
            style={{ height: '100%' }}
          >
            {isLoading ? <Skeleton active paragraph={{ rows: 7 }} /> : (
              <div style={{ height: 300, direction: 'ltr' }} role="img"
                aria-label={chart === 'requests' ? 'رسم بياني للطلبات الجديدة والمكتملة يومياً' : 'رسم بياني لإيرادات الزيارات والمتجر يومياً'}>
                <ResponsiveContainer>
                  {chart === 'requests' ? (
                    <LineChart data={series} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke={pal.grid} vertical={false} />
                      <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} reversed />
                      <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} orientation="right" />
                      <Tooltip content={<ChartTooltip />} cursor={{ stroke: pal.cursor }} />
                      <Legend content={<ChartLegend />} />
                      <Line type="monotone" dataKey="created" name="طلبات جديدة" stroke={C1} strokeWidth={2} dot={false} animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: pal.surface }} />
                      <Line type="monotone" dataKey="completed" name="مكتملة" stroke={C2} strokeWidth={2} dot={false} animationDuration={500} activeDot={{ r: 5, strokeWidth: 2, stroke: pal.surface }} />
                    </LineChart>
                  ) : (
                    <BarChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }} barCategoryGap="30%">
                      <CartesianGrid stroke={pal.grid} vertical={false} />
                      <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} reversed />
                      <YAxis tick={AXIS} axisLine={false} tickLine={false} orientation="right" tickFormatter={(v: number) => fmtNumber(v)} />
                      <Tooltip content={<ChartTooltip money />} cursor={{ fill: pal.hover }} />
                      <Legend content={<ChartLegend />} />
                      <Bar dataKey="visits" name="زيارات" stackId="r" fill={C1} stroke={pal.surface} strokeWidth={1} animationDuration={500} />
                      <Bar dataKey="orders" name="المتجر" stackId="r" fill={C2} stroke={pal.surface} strokeWidth={1} radius={[4, 4, 0, 0]} animationDuration={500} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <ActionCenter data={data?.actions} loading={isLoading} />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card title="زيارات اليوم" extra={<Typography.Link onClick={() => navigate('/service-requests')}>كل الطلبات</Typography.Link>} style={{ height: '100%' }}>
            {isLoading ? <Skeleton active /> : !data?.today.length ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد زيارات مجدولة اليوم" />
            ) : (
              <Flex vertical>
                {data.today.map((r) => (
                  <div key={r.id} className="action-row" role="link" tabIndex={0}
                    onClick={() => navigate(`/service-requests/${r.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/service-requests/${r.id}`)}>
                    <div style={{ width: 64, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16 }}>{dayjs(r.scheduledAt).format('h:mm')}</div>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{dayjs(r.scheduledAt).format('A')}</Typography.Text>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Flex gap={6} align="center" wrap>
                        <Typography.Text strong>{r.customer.name}</Typography.Text>
                        {r.priority !== 'NORMAL' && <EnumTag map={PRIORITY} value={r.priority} />}
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                        {SERVICE_KIND[r.kind].label} · {[r.address.area, r.address.city].filter(Boolean).join('، ')} · {r.number}
                      </Typography.Text>
                    </div>
                    <div style={{ textAlign: 'end', flexShrink: 0 }}>
                      <EnumTag map={SERVICE_STATUS} value={r.status} />
                      <div style={{ fontSize: 12, color: r.technician ? 'var(--c-muted)' : 'var(--c-danger)', marginTop: 2 }}>
                        {r.technician?.user.name ?? 'بدون فني'}
                      </div>
                    </div>
                  </div>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <TechniciansCard data={data?.technicians} loading={isLoading} />
        </Col>
      </Row>
    </>
  );
}

function ChartTooltip({ active, payload, label, money }: {
  active?: boolean; label?: string; money?: boolean;
  payload?: { name: string; value: number; color: string }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--c-elevated)', color: 'var(--c-text)', border: '1px solid var(--c-border)', borderRadius: 10, padding: '8px 12px', boxShadow: 'var(--c-popup-shadow)', direction: 'rtl', fontFamily: 'Cairo' }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p) => (
        <Flex key={p.name} gap={8} align="center" style={{ fontSize: 13 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />
          <span style={{ color: 'var(--c-muted)' }}>{p.name}:</span>
          <b>{money ? fmtMoney(p.value) : fmtNumber(p.value)}</b>
        </Flex>
      ))}
    </div>
  );
}

function ChartLegend({ payload }: { payload?: { value: string; color: string }[] }) {
  return (
    <Flex gap={16} justify="center" style={{ direction: 'rtl', fontSize: 13, color: 'var(--c-muted)', marginTop: 4 }}>
      {payload?.map((p) => (
        <Flex key={p.value} gap={6} align="center">
          <span style={{ width: 10, height: 10, borderRadius: 3, background: p.color }} />{p.value}
        </Flex>
      ))}
    </Flex>
  );
}

function ActionCenter({ data, loading }: { data?: Overview['actions']; loading: boolean }) {
  const navigate = useNavigate();
  const all: { show: boolean; count: number; label: string; sub?: string; icon: ReactNode; tone: Tone; to: string }[] = data ? [
    { show: true, count: data.emergencies, label: 'طلبات طوارئ مفتوحة', icon: <AlertOutlined />, tone: 'red', to: '/service-requests?priority=EMERGENCY' },
    { show: true, count: data.unassigned, label: 'طلبات بدون فني', icon: <UserSwitchOutlined />, tone: 'orange', to: '/scheduling' },
    { show: data.pendingTransfers != null, count: data.pendingTransfers?.count ?? 0, label: 'تحويلات بانتظار التحقق', sub: data.pendingTransfers ? fmtMoney(data.pendingTransfers.amount) : undefined, icon: <SwapOutlined />, tone: 'purple', to: '/invoices?tab=transfers' },
    { show: data.submittedHandovers != null, count: data.submittedHandovers?.count ?? 0, label: 'توريدات نقدية للمراجعة', sub: data.submittedHandovers ? fmtMoney(data.submittedHandovers.amount) : undefined, icon: <WalletOutlined />, tone: 'green', to: '/invoices?tab=handovers' },
    { show: data.newOrders != null, count: data.newOrders ?? 0, label: 'طلبات متجر جديدة', icon: <ShoppingCartOutlined />, tone: 'blue', to: '/orders' },
    { show: true, count: data.dueMaintenance7d, label: 'أجهزة صيانتها مستحقة خلال 7 أيام', icon: <ClockCircleOutlined />, tone: 'teal', to: '/reports?tab=due' },
    { show: data.newLeads != null, count: data.newLeads ?? 0, label: 'ترشيحات جديدة', icon: <RiseOutlined />, tone: 'blue', to: '/leads' },
    { show: data.lowStock != null, count: data.lowStock ?? 0, label: 'أصناف قاربت على النفاد', icon: <DropboxOutlined />, tone: 'orange', to: '/inventory' },
  ] : [];
  const rows = all.filter((r) => r.show);
  const pending = rows.filter((r) => r.count > 0);
  const clear = rows.filter((r) => r.count === 0);

  return (
    <Card title={<Flex gap={8} align="center">محتاج إجراء{pending.length > 0 && <Badge count={pending.length} color="var(--c-danger)" />}</Flex>} style={{ height: '100%' }}>
      {loading ? <Skeleton active /> : (
        <Flex vertical>
          {pending.map((r) => (
            <div key={r.label} className="action-row" role="link" tabIndex={0}
              onClick={() => navigate(r.to)} onKeyDown={(e) => e.key === 'Enter' && navigate(r.to)}>
              <div className="kpi-icon" style={{ width: 36, height: 36, fontSize: 16, background: TONES[r.tone].bg, color: TONES[r.tone].fg }} aria-hidden>{r.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{r.label}</div>
                {r.sub && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.sub}</Typography.Text>}
              </div>
              <Typography.Text strong style={{ fontSize: 18 }}>{fmtNumber(r.count)}</Typography.Text>
              <LeftOutlined style={{ color: 'var(--c-faint)', fontSize: 12 }} aria-hidden />
            </div>
          ))}
          {!pending.length && (
            <Flex vertical align="center" gap={6} style={{ padding: '24px 0', color: 'var(--c-success)' }}>
              <CheckCircleOutlined style={{ fontSize: 32 }} />
              <Typography.Text strong>مفيش حاجة متأخرة</Typography.Text>
            </Flex>
          )}
          {clear.length > 0 && pending.length > 0 && (
            <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
              <CheckCircleOutlined style={{ color: 'var(--c-success)' }} /> لا يوجد: {clear.map((r) => r.label).join('، ')}
            </Typography.Text>
          )}
        </Flex>
      )}
    </Card>
  );
}

const TECH_STATE = {
  FREE: { label: 'متاح', color: 'green' },
  BUSY: { label: 'في زيارة', color: 'orange' },
  OFF: { label: 'غير متاح', color: 'default' },
} as const;

function TechniciansCard({ data, loading }: { data?: Overview['technicians']; loading: boolean }) {
  const navigate = useNavigate();
  const { can } = useAuth();
  const counts = { FREE: 0, BUSY: 0, OFF: 0 };
  data?.forEach((t) => counts[t.state]++);
  const sorted = [...(data ?? [])].sort((a, b) => ['BUSY', 'FREE', 'OFF'].indexOf(a.state) - ['BUSY', 'FREE', 'OFF'].indexOf(b.state));

  return (
    <Card title="الفنيين الآن" extra={can('technician.read') && <Typography.Link onClick={() => navigate('/technicians')}>الكل</Typography.Link>} style={{ height: '100%' }}>
      {loading ? <Skeleton active /> : !data?.length ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا يوجد فنيين" /> : (
        <>
          <Flex gap={8} style={{ marginBottom: 12 }} wrap>
            {(Object.keys(TECH_STATE) as (keyof typeof TECH_STATE)[]).map((s) => (
              <Tag key={s} color={TECH_STATE[s].color} style={{ fontSize: 13, padding: '2px 10px' }}>{TECH_STATE[s].label}: {counts[s]}</Tag>
            ))}
          </Flex>
          <Flex vertical style={{ maxHeight: 360, overflowY: 'auto' }}>
            {sorted.map((t) => (
              <div key={t.id} className="action-row" role={can('technician.read') ? 'link' : undefined} tabIndex={can('technician.read') ? 0 : undefined}
                onClick={() => can('technician.read') && navigate(`/technicians/${t.id}`)}
                onKeyDown={(e) => e.key === 'Enter' && can('technician.read') && navigate(`/technicians/${t.id}`)}>
                <Badge status={t.state === 'FREE' ? 'success' : t.state === 'BUSY' ? 'warning' : 'default'} />
                <div style={{ flex: 1, fontWeight: 600 }}>{t.name}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {fmtNumber(t.visitsToday)} زيارة اليوم
                </Typography.Text>
                <Tag color={TECH_STATE[t.state].color} style={{ marginInlineEnd: 0 }}>{TECH_STATE[t.state].label}</Tag>
              </div>
            ))}
          </Flex>
        </>
      )}
    </Card>
  );
}
