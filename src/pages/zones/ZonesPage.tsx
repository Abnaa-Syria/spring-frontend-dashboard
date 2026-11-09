import 'leaflet/dist/leaflet.css';
import { CarOutlined, EnvironmentOutlined, SaveOutlined, ToolOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, Button, Card, Col, Flex, Form, Input, InputNumber, Row, Skeleton, Space, Switch, Table, Tabs, Tag, Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SERVICE_KIND, SERVICE_STATUS, type ServiceKind, type ServiceStatus } from '../../lib/labels';
import { useTabParam } from '../../lib/useOpenParam';

interface Zone {
  governorate: string;
  serviceEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number | null;
  deliveryDays: number | null;
  configured: boolean;
}
interface Overview {
  byGovernorate: { governorate: string; customers: number; openRequests: number; technicians: number }[];
  requests: { id: number; number: string; status: ServiceStatus; kind: ServiceKind; priority: string; customer: string; lat: number; lng: number }[];
  customers: { customerId: number; name: string; lat: number; lng: number }[];
  pinned: number;
  totalAddresses: number;
}

export function ZonesPage() {
  const [tab, setTab] = useTabParam('governorates');
  return (
    <>
      <PageHeader title="مناطق الخدمة والتسعير" subtitle="المحافظات اللي بنخدمها، رسوم التوصيل، أسعار الزيارات، وخريطة الشغل" />
      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'governorates', label: 'المحافظات والتوصيل', children: <GovernoratesTab /> },
            { key: 'prices', label: 'أسعار الزيارات', children: <PricesTab /> },
            { key: 'map', label: 'خريطة الشغل', children: <MapTab /> },
          ]}
        />
      </Card>
    </>
  );
}

function GovernoratesTab() {
  const { can } = useAuth();
  const editable = can('settings.write');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const zones = useQuery({ queryKey: ['zones'], queryFn: async () => (await api.get<Zone[]>('/zones')).data });
  const overview = useQuery({ queryKey: ['zones-overview'], queryFn: async () => (await api.get<Overview>('/zones/overview')).data });
  const [edits, setEdits] = useState<Record<string, Partial<Zone>>>({});
  const [search, setSearch] = useState('');

  const rows = useMemo(() => (zones.data ?? []).map((z) => ({ ...z, ...edits[z.governorate] })), [zones.data, edits]);
  const stats = useMemo(() => new Map((overview.data?.byGovernorate ?? []).map((s) => [s.governorate, s])), [overview.data]);
  const changed = Object.keys(edits);
  const set = (g: string, patch: Partial<Zone>) => setEdits((e) => ({ ...e, [g]: { ...e[g], ...patch } }));

  const save = useMutation({
    mutationFn: () => api.put<Zone[]>('/zones', {
      zones: rows.filter((r) => changed.includes(r.governorate)).map((r) => ({
        governorate: r.governorate, serviceEnabled: r.serviceEnabled, deliveryEnabled: r.deliveryEnabled,
        deliveryFee: r.deliveryFee ?? 0, freeDeliveryOver: r.freeDeliveryOver ?? null, deliveryDays: r.deliveryDays ?? null,
      })),
    }),
    onSuccess: ({ data }) => {
      message.success(`تم حفظ ${changed.length} محافظة، والتغيير ظهر في التطبيق`);
      qc.setQueryData(['zones'], data);
      setEdits({});
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const bulk = (patch: Partial<Zone>) => {
    const next = { ...edits };
    for (const z of zones.data ?? []) next[z.governorate] = { ...next[z.governorate], ...patch };
    setEdits(next);
  };

  if (zones.isLoading) return <Skeleton active />;
  const served = rows.filter((r) => r.serviceEnabled).length;
  const delivered = rows.filter((r) => r.deliveryEnabled).length;
  const filtered = rows.filter((r) => !search || r.governorate.includes(search));

  return (
    <Flex vertical gap={16}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><StatCard icon={<ToolOutlined />} label="محافظات الزيارات" value={`${served} / ${rows.length}`} /></Col>
        <Col xs={12} md={6}><StatCard icon={<CarOutlined />} tone="green" label="محافظات التوصيل" value={`${delivered} / ${rows.length}`} /></Col>
        <Col xs={12} md={6}><StatCard icon={<EnvironmentOutlined />} tone="purple" label="عملاء على الخريطة" value={overview.data ? `${overview.data.pinned} / ${overview.data.totalAddresses}` : '—'} /></Col>
        <Col xs={12} md={6}><StatCard icon={<UnorderedListOutlined />} tone="orange" label="طلبات مفتوحة" value={overview.data?.byGovernorate.reduce((s, g) => s + g.openRequests, 0) ?? '—'} /></Col>
      </Row>
      <Alert
        type="info"
        showIcon
        title="المحافظة المقفولة للزيارات مش هيقدر العميل يحجز فيها من التطبيق، والمقفولة للتوصيل مش هيقدر يطلب منتجات عليها. الحجز من لوحة التحكم بيفضل متاح في كل المحافظات."
      />
      <Flex gap={8} wrap align="center">
        <Input.Search placeholder="ابحث باسم المحافظة" allowClear style={{ width: 240 }} onChange={(e) => setSearch(e.target.value)} />
        {editable && (
          <Space wrap>
            <Button size="small" onClick={() => bulk({ serviceEnabled: true })}>فتح الزيارات للكل</Button>
            <Button size="small" onClick={() => bulk({ serviceEnabled: false })}>قفل الزيارات للكل</Button>
            <Button size="small" onClick={() => bulk({ deliveryEnabled: true })}>فتح التوصيل للكل</Button>
            <Button size="small" onClick={() => bulk({ deliveryEnabled: false })}>قفل التوصيل للكل</Button>
          </Space>
        )}
        <div style={{ flex: 1 }} />
        {editable && changed.length > 0 && (
          <Space>
            <Typography.Text type="warning">{changed.length} محافظة متعدلة ولسه متحفظتش</Typography.Text>
            <Button onClick={() => setEdits({})}>تجاهل</Button>
            <Button type="primary" icon={<SaveOutlined />} loading={save.isPending} onClick={() => save.mutate()}>حفظ التغييرات</Button>
          </Space>
        )}
      </Flex>
      <Table<Zone>
        rowKey="governorate"
        size="middle"
        dataSource={filtered}
        pagination={false}
        scroll={{ x: 980 }}
        rowClassName={(r) => (changed.includes(r.governorate) ? 'ant-table-row-selected' : '')}
        columns={[
          {
            title: 'المحافظة',
            dataIndex: 'governorate',
            fixed: 'start',
            render: (g: string, r) => (
              <Flex vertical>
                <Typography.Text strong>{g}</Typography.Text>
                {!r.serviceEnabled && !r.deliveryEnabled && <Tag color="default" style={{ width: 'fit-content' }}>خارج التغطية</Tag>}
              </Flex>
            ),
          },
          {
            title: 'العملاء / المفتوح / الفنيين',
            render: (_, r) => {
              const s = stats.get(r.governorate);
              return <Typography.Text type="secondary">{s?.customers ?? 0} / {s?.openRequests ?? 0} / {s?.technicians ?? 0}</Typography.Text>;
            },
          },
          {
            title: 'زيارات',
            dataIndex: 'serviceEnabled',
            render: (v: boolean, r) => <Switch checked={v} disabled={!editable} onChange={(c) => set(r.governorate, { serviceEnabled: c })} />,
          },
          {
            title: 'توصيل',
            dataIndex: 'deliveryEnabled',
            render: (v: boolean, r) => <Switch checked={v} disabled={!editable} onChange={(c) => set(r.governorate, { deliveryEnabled: c })} />,
          },
          {
            title: 'رسوم التوصيل',
            dataIndex: 'deliveryFee',
            render: (v: number, r) => (
              <InputNumber min={0} max={100000} value={v} disabled={!editable || !r.deliveryEnabled} suffix="ج.م" style={{ width: 120 }}
                onChange={(n) => set(r.governorate, { deliveryFee: Number(n ?? 0) })} />
            ),
          },
          {
            title: 'مدة التوصيل',
            dataIndex: 'deliveryDays',
            render: (v: number | null, r) => (
              <InputNumber min={0} max={60} value={v ?? undefined} placeholder="—" disabled={!editable || !r.deliveryEnabled} suffix="يوم" style={{ width: 100 }}
                onChange={(n) => set(r.governorate, { deliveryDays: n == null ? null : Number(n) })} />
            ),
          },
          {
            title: 'توصيل مجاني فوق',
            dataIndex: 'freeDeliveryOver',
            render: (v: number | null, r) => (
              <InputNumber min={0} max={1000000} value={v ?? undefined} placeholder="الإعداد العام" disabled={!editable || !r.deliveryEnabled} suffix="ج.م" style={{ width: 150 }}
                onChange={(n) => set(r.governorate, { freeDeliveryOver: n == null ? null : Number(n) })} />
            ),
          },
        ]}
      />
    </Flex>
  );
}

type Prices = Record<string, number | boolean | string>;
const FEE_KEYS: ServiceKind[] = ['INSTALLATION', 'PERIODIC_MAINTENANCE', 'CARTRIDGE_REPLACEMENT', 'FAULT_REPORT'];

function PricesTab() {
  const { can } = useAuth();
  const editable = can('settings.write');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['settings'], queryFn: async () => (await api.get<Prices>('/settings')).data, enabled: editable });
  const save = useMutation({
    mutationFn: (v: Prices) => api.put<Prices>('/settings', v),
    onSuccess: ({ data: d }) => { message.success('تم حفظ الأسعار، والأسعار الجديدة هتطبق على الطلبات الجديدة'); qc.setQueryData(['settings'], d); },
    onError: (e) => message.error(errorMessage(e)),
  });
  if (!editable) return <Alert type="warning" showIcon title="تعديل الأسعار محتاج صلاحية إعدادات النظام" />;
  if (isLoading || !data) return <Skeleton active />;

  // antd treats dots in field names as paths.
  const toForm = Object.fromEntries(Object.entries(data).map(([k, v]) => [k.replace('.', '__'), v]));
  const submit = (v: Prices) => save.mutate(Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace('__', '.'), x ?? 0])));

  return (
    <Form form={form} layout="vertical" initialValues={toForm} onFinish={submit} style={{ maxWidth: 820 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="رسوم الزيارة بتتحسب وقت الحجز وبتتقفل على الطلب، فتغيير السعر بيطبق على الطلبات الجديدة بس. الرسوم بتظهر للعميل وهو بيحجز، وبتتضاف للفاتورة تلقائياً كبند منفصل، وتقدر تعدّلها لطلب معيّن من صفحة الطلب (زي زيارة في الضمان)."
      />
      <Row gutter={16}>
        {FEE_KEYS.map((k) => (
          <Col xs={24} md={12} key={k}>
            <Form.Item name={`fees__${k}`} label={`رسوم ${SERVICE_KIND[k].label}`} rules={[{ required: true, message: 'مطلوب' }]}>
              <InputNumber min={0} max={100000} suffix="ج.م" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        ))}
        <Col span={24}>
          <Form.Item name="fees__freeInstallForStoreDevices" label="تركيب الأجهزة المشتراة من المتجر" valuePropName="checked"
            extra="لما العميل يشتري جهاز من التطبيق بيتعمل له طلب تركيب تلقائي؛ لو الخيار ده شغال يبقى التركيب مجاني">
            <Switch checkedChildren="مجاني" unCheckedChildren="بالرسوم" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="delivery__freeOver" label="توصيل مجاني لطلبات المتجر فوق" extra="٠ = مفيش توصيل مجاني. تقدر تحدد رقم مختلف لمحافظة معيّنة من تبويب المحافظات.">
            <InputNumber min={0} max={1000000} suffix="ج.م" style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ الأسعار</Button>
    </Form>
  );
}

const STATUS_COLOR: Partial<Record<ServiceStatus, string>> = {
  PENDING: '#8C8C8C', SCHEDULED: '#1677FF', ASSIGNED: '#2F54EB', ON_THE_WAY: '#13C2C2', ARRIVED: '#13C2C2', IN_PROGRESS: '#FA8C16',
};

function MapTab() {
  const { data, isLoading } = useQuery({ queryKey: ['zones-overview'], queryFn: async () => (await api.get<Overview>('/zones/overview')).data });
  const [showCustomers, setShowCustomers] = useState(true);
  if (isLoading || !data) return <Skeleton active />;
  const pts = [...data.requests, ...data.customers];
  const center: [number, number] = pts.length
    ? [pts.reduce((s, p) => s + p.lat, 0) / pts.length, pts.reduce((s, p) => s + p.lng, 0) / pts.length]
    : [30.0444, 31.2357];

  return (
    <Flex vertical gap={12}>
      <Flex gap={12} wrap align="center">
        <Typography.Text>
          <EnvironmentOutlined /> {data.requests.length} طلب مفتوح على الخريطة، و{data.pinned} عنوان عميل متحدد من أصل {data.totalAddresses}
        </Typography.Text>
        <div style={{ flex: 1 }} />
        <Space><Switch size="small" checked={showCustomers} onChange={setShowCustomers} /> عناوين العملاء</Space>
      </Flex>
      {data.pinned < data.totalAddresses && (
        <Alert type="warning" showIcon title="العناوين اللي ملهاش موقع مش بتظهر على الخريطة. الموقع بيتحدد لما العميل يعدّل عنوانه من التطبيق، أو الفني يحدده وهو عند العميل، أو من صفحة العميل هنا." />
      )}
      <div dir="ltr" style={{ height: 520, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--ant-color-border, #e5e7eb)' }}>
        <MapContainer center={center} zoom={pts.length ? 10 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
          {showCustomers && data.customers.map((c, i) => (
            <CircleMarker key={`c${i}`} center={[c.lat, c.lng]} radius={4} pathOptions={{ color: '#2E508F', fillOpacity: 0.5, weight: 1 }}>
              <Popup><div dir="rtl"><Link to={`/customers/${c.customerId}`}>{c.name}</Link></div></Popup>
            </CircleMarker>
          ))}
          {data.requests.map((r) => (
            <CircleMarker key={r.id} center={[r.lat, r.lng]} radius={9} pathOptions={{ color: '#fff', weight: 2, fillColor: STATUS_COLOR[r.status] ?? '#D92D20', fillOpacity: 0.95 }}>
              <Popup>
                <div dir="rtl" style={{ minWidth: 160 }}>
                  <Link to={`/service-requests/${r.id}`}><b>{r.number}</b></Link>
                  <div>{r.customer}</div>
                  <div>{SERVICE_KIND[r.kind].label} — {SERVICE_STATUS[r.status].label}</div>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <Flex gap={12} wrap>
        {Object.entries(STATUS_COLOR).map(([s, c]) => (
          <Space key={s} size={4}><span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 6, background: c }} />{SERVICE_STATUS[s as ServiceStatus].label}</Space>
        ))}
        {showCustomers && <Space size={4}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: '#2E508F', opacity: 0.6 }} />عنوان عميل</Space>}
      </Flex>
      <Table
        size="small"
        rowKey="governorate"
        pagination={false}
        dataSource={data.byGovernorate}
        title={() => <Typography.Text strong>التوزيع حسب المحافظة</Typography.Text>}
        columns={[
          { title: 'المحافظة', dataIndex: 'governorate' },
          { title: 'عملاء', dataIndex: 'customers' },
          { title: 'طلبات مفتوحة', dataIndex: 'openRequests' },
          { title: 'فنيين بيغطّوها', dataIndex: 'technicians', render: (v: number, r) => (v ? v : r.openRequests ? <Tag color="red">مفيش فني</Tag> : 0) },
        ]}
      />
    </Flex>
  );
}
