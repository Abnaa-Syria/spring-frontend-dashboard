import {
  CarOutlined, DeleteOutlined, EditOutlined, EnvironmentOutlined, PlusOutlined, SaveOutlined, ToolOutlined, UnorderedListOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, Button, Col, Empty, Flex, Input, InputNumber, Popconfirm, Row, Select, Skeleton, Space, Switch, Table, Tag, Tooltip, Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { StatCard } from '../../components/StatCard';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';

export interface Area {
  id: number;
  name: string;
  isActive: boolean;
  serviceEnabled: boolean | null;
  deliveryEnabled: boolean | null;
  deliveryFee: number | null;
  deliveryDays: number | null;
  addresses: number;
}
export interface Governorate {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  serviceEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  freeDeliveryOver: number | null;
  deliveryDays: number | null;
  areas: Area[];
}
interface Stat { customers: number; openRequests: number; technicians: number }
interface Overview {
  byGovernorate: (Stat & { governorate: string })[];
  byArea: (Stat & { areaId: number })[];
  pinned: number;
  totalAddresses: number;
}

type GovEdit = Partial<Pick<Governorate, 'isActive' | 'serviceEnabled' | 'deliveryEnabled' | 'deliveryFee' | 'freeDeliveryOver' | 'deliveryDays'>>;

/** Inline rename: text with a pencil, turning into an input. */
function Rename({ value, onSave, disabled }: { value: string; onSave: (v: string) => Promise<unknown>; disabled?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState(false);
  if (!editing) {
    return (
      <Space size={4}>
        <Typography.Text strong>{value}</Typography.Text>
        {!disabled && <Button size="small" type="text" icon={<EditOutlined />} aria-label="تعديل الاسم" onClick={() => { setText(value); setEditing(true); }} />}
      </Space>
    );
  }
  const save = async () => {
    if (text.trim() === value || text.trim().length < 2) return setEditing(false);
    setBusy(true);
    try { await onSave(text.trim()); setEditing(false); } finally { setBusy(false); }
  };
  return (
    <Space.Compact size="small">
      <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} onPressEnter={save} style={{ width: 170 }} />
      <Button type="primary" loading={busy} onClick={save}>حفظ</Button>
      <Button onClick={() => setEditing(false)}>إلغاء</Button>
    </Space.Compact>
  );
}

/** Three-way setting for an area: inherit from the governorate, on, or off. */
function Inherit({ value, onChange, disabled, inherited }: { value: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean; inherited: boolean }) {
  return (
    <Select
      size="small"
      disabled={disabled}
      value={value === null ? 'inherit' : value ? 'on' : 'off'}
      onChange={(v) => onChange(v === 'inherit' ? null : v === 'on')}
      style={{ width: 150 }}
      options={[
        { value: 'inherit', label: `زي المحافظة (${inherited ? 'مفتوح' : 'مقفول'})` },
        { value: 'on', label: 'مفتوح' },
        { value: 'off', label: 'مقفول' },
      ]}
    />
  );
}

function AreasPanel({ gov, stats, editable, refresh }: { gov: Governorate; stats: Map<number, Stat>; editable: boolean; refresh: () => void }) {
  const { message } = App.useApp();
  const [name, setName] = useState('');
  const run = async (p: Promise<unknown>, ok?: string) => {
    try { await p; if (ok) message.success(ok); refresh(); } catch (e) { message.error(errorMessage(e)); throw e; }
  };
  const add = useMutation({
    mutationFn: () => api.post(`/zones/governorates/${gov.id}/areas`, { name: name.trim() }),
    onSuccess: () => { message.success('تمت إضافة المنطقة'); setName(''); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const patch = (a: Area, data: Partial<Area>) => run(api.patch(`/zones/areas/${a.id}`, data));

  return (
    <Flex vertical gap={10} style={{ padding: '4px 8px 12px' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        المنطقة بتاخد إعدادات المحافظة إلا لو حددت لها إعداد مختلف. العميل بيختار منطقته من القايمة دي في التطبيق، ولو منطقته مش موجودة بيكتبها بنفسه.
      </Typography.Text>
      {editable && (
        <Space.Compact style={{ maxWidth: 420 }}>
          <Input placeholder={`اسم منطقة جديدة في ${gov.name}`} value={name} onChange={(e) => setName(e.target.value)} onPressEnter={() => name.trim().length >= 2 && add.mutate()} />
          <Button type="primary" icon={<PlusOutlined />} disabled={name.trim().length < 2} loading={add.isPending} onClick={() => add.mutate()}>إضافة منطقة</Button>
        </Space.Compact>
      )}
      {gov.areas.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="مفيش مناطق في المحافظة دي لسه" /> : (
        <Table<Area>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={gov.areas}
          scroll={{ x: 900 }}
          columns={[
            { title: 'المنطقة', render: (_, a) => <Rename value={a.name} disabled={!editable} onSave={(v) => run(api.patch(`/zones/areas/${a.id}`, { name: v }), 'تم تغيير اسم المنطقة، والعناوين المرتبطة بيها اتعدّلت')} /> },
            {
              title: 'عملاء / مفتوح / فنيين',
              render: (_, a) => { const s = stats.get(a.id); return <Typography.Text type="secondary">{s?.customers ?? 0} / {s?.openRequests ?? 0} / {s?.technicians ?? 0}</Typography.Text>; },
            },
            { title: 'ظاهرة', render: (_, a) => <Switch size="small" checked={a.isActive} disabled={!editable} onChange={(v) => patch(a, { isActive: v })} /> },
            { title: 'زيارات', render: (_, a) => <Inherit value={a.serviceEnabled} inherited={gov.serviceEnabled} disabled={!editable} onChange={(v) => patch(a, { serviceEnabled: v })} /> },
            { title: 'توصيل', render: (_, a) => <Inherit value={a.deliveryEnabled} inherited={gov.deliveryEnabled} disabled={!editable} onChange={(v) => patch(a, { deliveryEnabled: v })} /> },
            {
              title: 'رسوم التوصيل',
              render: (_, a) => (
                <InputNumber size="small" min={0} max={100000} defaultValue={a.deliveryFee ?? undefined} placeholder={`${gov.deliveryFee} (المحافظة)`} suffix="ج.م" style={{ width: 150 }} disabled={!editable}
                  onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value.replace(/[^\d.]/g, '')); if (v !== a.deliveryFee) void patch(a, { deliveryFee: v }); }} />
              ),
            },
            {
              title: 'مدة التوصيل',
              render: (_, a) => (
                <InputNumber size="small" min={0} max={60} defaultValue={a.deliveryDays ?? undefined} placeholder={gov.deliveryDays != null ? `${gov.deliveryDays} (المحافظة)` : '—'} suffix="يوم" style={{ width: 130 }} disabled={!editable}
                  onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value.replace(/[^\d]/g, '')); if (v !== a.deliveryDays) void patch(a, { deliveryDays: v }); }} />
              ),
            },
            {
              title: '',
              render: (_, a) => editable && (
                <Popconfirm
                  title="مسح المنطقة؟"
                  description={a.addresses ? `${a.addresses} عنوان مرتبط بيها هيفضل محتفظ باسمها كنص` : undefined}
                  okText="مسح" cancelText="رجوع" okButtonProps={{ danger: true }}
                  onConfirm={() => run(api.delete(`/zones/areas/${a.id}`), 'تم مسح المنطقة')}
                >
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} aria-label="مسح المنطقة" />
                </Popconfirm>
              ),
            },
          ]}
        />
      )}
    </Flex>
  );
}

export function GovernoratesTab() {
  const { can } = useAuth();
  const editable = can('settings.write');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const zones = useQuery({ queryKey: ['zones'], queryFn: async () => (await api.get<Governorate[]>('/zones')).data });
  const overview = useQuery({ queryKey: ['zones-overview'], queryFn: async () => (await api.get<Overview>('/zones/overview')).data });
  const [edits, setEdits] = useState<Record<number, GovEdit>>({});
  const [search, setSearch] = useState('');
  const [newGov, setNewGov] = useState('');
  const refresh = () => { void qc.invalidateQueries({ queryKey: ['zones'] }); void qc.invalidateQueries({ queryKey: ['coverage'] }); };

  const rows = useMemo(() => (zones.data ?? []).map((g) => ({ ...g, ...edits[g.id] })), [zones.data, edits]);
  const govStats = useMemo(() => new Map((overview.data?.byGovernorate ?? []).map((s) => [s.governorate, s])), [overview.data]);
  const areaStats = useMemo(() => new Map((overview.data?.byArea ?? []).map((s) => [s.areaId, s])), [overview.data]);
  const changed = Object.keys(edits).map(Number);
  const set = (id: number, patch: GovEdit) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const save = useMutation({
    mutationFn: () => api.put<Governorate[]>('/zones', { governorates: changed.map((id) => ({ id, ...edits[id] })) }),
    onSuccess: ({ data }) => {
      message.success(`تم حفظ ${changed.length} محافظة، والتغيير ظهر في التطبيق`);
      qc.setQueryData(['zones'], data);
      setEdits({});
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  const addGov = useMutation({
    mutationFn: () => api.post('/zones/governorates', { name: newGov.trim() }),
    onSuccess: () => { message.success('تمت إضافة المحافظة'); setNewGov(''); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const run = async (p: Promise<unknown>, ok: string) => {
    try { await p; message.success(ok); refresh(); } catch (e) { message.error(errorMessage(e)); throw e; }
  };

  const bulk = (patch: GovEdit) => {
    const next = { ...edits };
    for (const g of zones.data ?? []) next[g.id] = { ...next[g.id], ...patch };
    setEdits(next);
  };

  if (zones.isLoading) return <Skeleton active />;
  const active = rows.filter((r) => r.isActive);
  const filtered = rows.filter((r) => !search || r.name.includes(search) || r.areas.some((a) => a.name.includes(search)));
  const areaCount = rows.reduce((s, r) => s + r.areas.length, 0);

  return (
    <Flex vertical gap={16}>
      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}><StatCard icon={<ToolOutlined />} label="محافظات الزيارات" value={`${active.filter((r) => r.serviceEnabled).length} / ${active.length}`} /></Col>
        <Col xs={12} md={6}><StatCard icon={<CarOutlined />} tone="green" label="محافظات التوصيل" value={`${active.filter((r) => r.deliveryEnabled).length} / ${active.length}`} /></Col>
        <Col xs={12} md={6}><StatCard icon={<EnvironmentOutlined />} tone="purple" label="المناطق المسجلة" value={areaCount} /></Col>
        <Col xs={12} md={6}><StatCard icon={<UnorderedListOutlined />} tone="orange" label="طلبات مفتوحة" value={overview.data?.byGovernorate.reduce((s, g) => s + g.openRequests, 0) ?? '—'} /></Col>
      </Row>
      <Alert
        type="info"
        showIcon
        title="اضغط على أي محافظة عشان تفتح مناطقها. المحافظة أو المنطقة المقفولة للزيارات مش هيقدر العميل يحجز فيها من التطبيق، والمقفولة للتوصيل مش هيقدر يطلب منتجات عليها. المحافظة المخفية مبتظهرش في قايمة العناوين."
      />
      <Flex gap={8} wrap align="center">
        <Input.Search placeholder="ابحث بالمحافظة أو المنطقة" allowClear style={{ width: 240 }} onChange={(e) => setSearch(e.target.value)} />
        {editable && (
          <Space.Compact>
            <Input placeholder="اسم محافظة جديدة" value={newGov} onChange={(e) => setNewGov(e.target.value)} onPressEnter={() => newGov.trim().length >= 2 && addGov.mutate()} style={{ width: 200 }} />
            <Button icon={<PlusOutlined />} disabled={newGov.trim().length < 2} loading={addGov.isPending} onClick={() => addGov.mutate()}>إضافة محافظة</Button>
          </Space.Compact>
        )}
        {editable && (
          <Space wrap>
            <Button size="small" onClick={() => bulk({ serviceEnabled: true })}>فتح الزيارات للكل</Button>
            <Button size="small" onClick={() => bulk({ serviceEnabled: false })}>قفل الزيارات للكل</Button>
            <Button size="small" onClick={() => bulk({ deliveryEnabled: true })}>فتح التوصيل للكل</Button>
            <Button size="small" onClick={() => bulk({ deliveryEnabled: false })}>قفل التوصيل للكل</Button>
          </Space>
        )}
      </Flex>
      {editable && changed.length > 0 && (
        <Alert
          type="warning"
          title={`${changed.length} محافظة متعدلة ولسه متحفظتش`}
          action={<Space><Button onClick={() => setEdits({})}>تجاهل</Button><Button type="primary" icon={<SaveOutlined />} loading={save.isPending} onClick={() => save.mutate()}>حفظ التغييرات</Button></Space>}
        />
      )}
      <Table<Governorate>
        rowKey="id"
        size="middle"
        dataSource={filtered}
        pagination={false}
        scroll={{ x: 1150 }}
        rowClassName={(r) => (changed.includes(r.id) ? 'ant-table-row-selected' : '')}
        expandable={{
          expandRowByClick: false,
          expandedRowRender: (g) => <AreasPanel gov={g} stats={areaStats} editable={editable} refresh={refresh} />,
        }}
        columns={[
          {
            title: 'المحافظة',
            fixed: 'start',
            render: (_, r) => (
              <Flex vertical gap={2}>
                <Rename value={r.name} disabled={!editable} onSave={(v) => run(api.patch(`/zones/governorates/${r.id}`, { name: v }), 'تم تغيير اسم المحافظة، والعناوين والفنيين اتعدّلوا')} />
                <Space size={4}>
                  <Tag style={{ width: 'fit-content' }}>{r.areas.length} منطقة</Tag>
                  {!r.isActive && <Tag color="default">مخفية</Tag>}
                  {r.isActive && !r.serviceEnabled && !r.deliveryEnabled && <Tag>خارج التغطية</Tag>}
                </Space>
              </Flex>
            ),
          },
          {
            title: 'عملاء / مفتوح / فنيين',
            render: (_, r) => { const s = govStats.get(r.name); return <Typography.Text type="secondary">{s?.customers ?? 0} / {s?.openRequests ?? 0} / {s?.technicians ?? 0}</Typography.Text>; },
          },
          { title: <Tooltip title="تظهر في قايمة المحافظات في التطبيق ولوحة التحكم">ظاهرة</Tooltip>, render: (_, r) => <Switch size="small" checked={r.isActive} disabled={!editable} onChange={(c) => set(r.id, { isActive: c })} /> },
          { title: 'زيارات', render: (_, r) => <Switch checked={r.serviceEnabled} disabled={!editable} onChange={(c) => set(r.id, { serviceEnabled: c })} /> },
          { title: 'توصيل', render: (_, r) => <Switch checked={r.deliveryEnabled} disabled={!editable} onChange={(c) => set(r.id, { deliveryEnabled: c })} /> },
          {
            title: 'رسوم التوصيل',
            render: (_, r) => (
              <InputNumber min={0} max={100000} value={r.deliveryFee} disabled={!editable || !r.deliveryEnabled} suffix="ج.م" style={{ width: 120 }}
                onChange={(n) => set(r.id, { deliveryFee: Number(n ?? 0) })} />
            ),
          },
          {
            title: 'مدة التوصيل',
            render: (_, r) => (
              <InputNumber min={0} max={60} value={r.deliveryDays ?? undefined} placeholder="—" disabled={!editable || !r.deliveryEnabled} suffix="يوم" style={{ width: 100 }}
                onChange={(n) => set(r.id, { deliveryDays: n == null ? null : Number(n) })} />
            ),
          },
          {
            title: 'توصيل مجاني فوق',
            render: (_, r) => (
              <InputNumber min={0} max={1000000} value={r.freeDeliveryOver ?? undefined} placeholder="الإعداد العام" disabled={!editable || !r.deliveryEnabled} suffix="ج.م" style={{ width: 150 }}
                onChange={(n) => set(r.id, { freeDeliveryOver: n == null ? null : Number(n) })} />
            ),
          },
          {
            title: '',
            render: (_, r) => editable && (
              <Popconfirm
                title="مسح المحافظة؟"
                description="ينفع تمسح المحافظة لو مفيش عليها عناوين بس؛ غير كده اخفيها."
                okText="مسح" cancelText="رجوع" okButtonProps={{ danger: true }}
                onConfirm={() => run(api.delete(`/zones/governorates/${r.id}`), 'تم مسح المحافظة')}
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />} aria-label="مسح المحافظة" />
              </Popconfirm>
            ),
          },
        ]}
      />
    </Flex>
  );
}
