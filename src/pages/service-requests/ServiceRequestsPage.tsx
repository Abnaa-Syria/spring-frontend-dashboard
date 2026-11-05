import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { App, Button, Card, Input, Select, Space, Switch, Table, Typography } from 'antd';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { downloadCsv, fetchAll } from '../../lib/export';
import { useOpenParam } from '../../lib/useOpenParam';
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
  const { message } = App.useApp();
  const [openId, setOpenId] = useOpenParam();
  const [exporting, setExporting] = useState(false);
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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll<ServiceRequestRow>('/service-requests', filters);
      downloadCsv(dispatch ? 'dispatch' : 'service-requests', [
        { title: 'رقم الطلب', value: (r) => r.number },
        { title: 'النوع', value: (r) => SERVICE_KIND[r.kind].label },
        { title: 'الأولوية', value: (r) => PRIORITY[r.priority].label },
        { title: 'العميل', value: (r) => r.customer.name },
        { title: 'الموبايل', value: (r) => r.customer.phone },
        { title: 'المحافظة', value: (r) => r.address.governorate },
        { title: 'المدينة', value: (r) => r.address.city },
        { title: 'المنطقة', value: (r) => r.address.area },
        { title: 'الموعد', value: (r) => fmtDateTime(r.scheduledAt) },
        { title: 'الفني', value: (r) => r.technician?.user.name },
        { title: 'الحالة', value: (r) => SERVICE_STATUS[r.status].label },
        { title: 'المصدر', value: (r) => SOURCE[r.source].label },
        { title: 'تاريخ الإنشاء', value: (r) => fmtDateTime(r.createdAt) },
      ], rows);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
    <PageHeader
      title={dispatch ? 'توزيع المهام' : 'طلبات الخدمة'}
      subtitle={dispatch ? 'طلبات مفتوحة لسه محتاجة فني — افتح الطلب وعيّن الفني والموعد' : `${data?.total ?? '…'} طلب`}
      actions={<>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>تصدير Excel</Button>
        {can('service.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>طلب جديد</Button>}
      </>}
    />
    <Card className="table-card">
      <Space wrap className="table-toolbar" style={{ display: 'flex' }}>
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
        rowClassName="clickable"
        onRow={(r) => ({ onClick: () => setOpenId(r.id) })}
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

    </Card>
      <ServiceRequestDrawer id={openId} onClose={() => setOpenId(null)} />
      <CreateServiceRequestModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => { setCreating(false); setOpenId(id); }}
      />
    </>
  );
}
