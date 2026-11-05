import { PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { api, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate, fmtDateTime } from '../../lib/format';
import {
  PRIORITY, SERVICE_KIND, SERVICE_STATUS, SOURCE, options, type ServiceKind, type ServicePriority,
  type ServiceStatus,
} from '../../lib/labels';
import { CreateServiceRequestModal } from './CreateServiceRequestModal';
import { ServiceRequestDrawer } from './ServiceRequestDrawer';
import type { ServiceRequestRow } from './types';

/** `dispatch` mode is the "توزيع المهام" screen: open requests with no technician yet. */
export function ServiceRequestsPage({ dispatch = false }: { dispatch?: boolean }) {
  const { can } = useAuth();
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  const filters = {
    search: params.get('search') ?? undefined,
    status: (params.get('status') as ServiceStatus) ?? undefined,
    kind: (params.get('kind') as ServiceKind) ?? undefined,
    priority: (params.get('priority') as ServicePriority) ?? undefined,
    unassigned: dispatch || params.get('unassigned') === 'true' || undefined,
  };
  const setFilter = (key: string, value?: string | boolean) => {
    const next = new URLSearchParams(params);
    if (value === undefined || value === '' || value === false) next.delete(key);
    else next.set(key, String(value));
    setParams(next, { replace: true });
    setPage(1);
  };

  const { data, isFetching } = useQuery({
    queryKey: ['service-requests', filters, page],
    queryFn: async () =>
      (await api.get<Page<ServiceRequestRow>>('/service-requests', { params: { ...filters, page, pageSize: 20 } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>{dispatch ? 'توزيع المهام' : 'طلبات الخدمة'}</Typography.Title>}
      extra={can('service.write') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>طلب جديد</Button>
      )}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="رقم الطلب، اسم أو موبايل العميل"
          allowClear
          defaultValue={filters.search}
          onSearch={(v) => setFilter('search', v)}
          style={{ width: 280 }}
        />
        {!dispatch && (
          <Select allowClear placeholder="الحالة" style={{ width: 150 }} value={filters.status}
            options={options(SERVICE_STATUS)} onChange={(v) => setFilter('status', v)} />
        )}
        <Select allowClear placeholder="نوع الخدمة" style={{ width: 170 }} value={filters.kind}
          options={options(SERVICE_KIND)} onChange={(v) => setFilter('kind', v)} />
        <Select allowClear placeholder="الأولوية" style={{ width: 130 }} value={filters.priority}
          options={options(PRIORITY)} onChange={(v) => setFilter('priority', v)} />
        {!dispatch && (
          <Space>
            <Switch checked={!!filters.unassigned} onChange={(v) => setFilter('unassigned', v)} />
            يحتاج تعيين فقط
          </Space>
        )}
      </Space>

      <Table<ServiceRequestRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 1000 }}
        onRow={(r) => ({ onClick: () => setOpenId(r.id), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'رقم الطلب', dataIndex: 'number', width: 120 },
          { title: 'النوع', dataIndex: 'kind', render: (v: ServiceKind) => SERVICE_KIND[v].label },
          { title: 'الأولوية', dataIndex: 'priority', render: (v: ServicePriority) => <EnumTag map={PRIORITY} value={v} /> },
          {
            title: 'العميل',
            render: (_, r) => (<>{r.customer.name}<br /><Typography.Text type="secondary">{r.customer.phone}</Typography.Text></>),
          },
          { title: 'المنطقة', render: (_, r) => [r.address.area, r.address.city].filter(Boolean).join('، ') },
          {
            title: 'الموعد',
            render: (_, r) => r.scheduledAt
              ? fmtDateTime(r.scheduledAt)
              : r.preferredDate
                ? <Typography.Text type="secondary">مفضل: {fmtDate(r.preferredDate)} {r.preferredSlot}</Typography.Text>
                : '—',
          },
          {
            title: 'الفني',
            render: (_, r) => r.technician?.user.name ?? <Typography.Text type="danger">غير محدد</Typography.Text>,
          },
          { title: 'الحالة', dataIndex: 'status', render: (v: ServiceStatus) => <EnumTag map={SERVICE_STATUS} value={v} /> },
          { title: 'المصدر', dataIndex: 'source', render: (v: ServiceRequestRow['source']) => SOURCE[v].label },
        ]}
      />

      <ServiceRequestDrawer id={openId} onClose={() => setOpenId(null)} />
      <CreateServiceRequestModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); setOpenId(id); }}
      />
    </Card>
  );
}
