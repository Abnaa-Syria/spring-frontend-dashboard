import 'leaflet/dist/leaflet.css';
import { EnvironmentOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, Button, Card, Col, Flex, Form, InputNumber, Row, Skeleton, Space, Switch, Table, Tabs, Tag, Typography,
} from 'antd';
import { useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SERVICE_KIND, SERVICE_STATUS, type ServiceKind, type ServiceStatus } from '../../lib/labels';
import { useTabParam } from '../../lib/useOpenParam';
import { GovernoratesTab } from './GovernoratesTab';
import { useThemeMode } from '../../lib/themeMode';

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
  const { palette } = useThemeMode();
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
      <div dir="ltr" style={{ height: 520, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
        <MapContainer center={center} zoom={pts.length ? 10 : 6} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' maxZoom={19} />
          {showCustomers && data.customers.map((c, i) => (
            <CircleMarker key={`c${i}`} center={[c.lat, c.lng]} radius={4} pathOptions={{ color: palette.primary, fillOpacity: 0.5, weight: 1 }}>
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
        {showCustomers && <Space size={4}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 4, background: 'var(--c-primary)', opacity: 0.6 }} />عنوان عميل</Space>}
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
