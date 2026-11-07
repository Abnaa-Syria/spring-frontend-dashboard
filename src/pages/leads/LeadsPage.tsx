import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  App, Badge, Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage, type Page } from '../../lib/api';
import { DownloadOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { downloadCsv, fetchAll } from '../../lib/export';
import { fmtDateTime } from '../../lib/format';

export type LeadStatus = 'NEW' | 'CONTACTED' | 'WON' | 'LOST';
export const LEAD_STATUS: Record<LeadStatus, { label: string; color: string }> = {
  NEW: { label: 'جديد', color: 'blue' },
  CONTACTED: { label: 'تم التواصل', color: 'orange' },
  WON: { label: 'تم البيع', color: 'green' },
  LOST: { label: 'لم يتم', color: 'red' },
};
export const REFERRER_TYPE: Record<string, string> = { TECHNICIAN: 'فني', SALES_REP: 'مندوب', STAFF: 'موظف', CUSTOMER: 'عميل' };

export interface Lead {
  id: number;
  customerName: string;
  phone: string;
  area: string | null;
  notes: string | null;
  outcomeNote: string | null;
  status: LeadStatus;
  createdAt: string;
  closedAt: string | null;
  referrer: { id: number; name: string; type: string };
  assignee: { id: number; name: string } | null;
  product: { id: number; nameAr: string } | null;
}

export function LeadsPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; status?: LeadStatus; assigneeId?: number }>({});
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['leads', filters, page],
    queryFn: async () =>
      (await api.get<Page<Lead> & { byStatus: Partial<Record<LeadStatus, number>> }>('/leads', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });
  const assignees = useQuery({
    queryKey: ['lead-assignees'],
    queryFn: async () => (await api.get<{ id: number; name: string }[]>('/leads/assignees')).data,
  });
  const update = (patch: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  const won = data?.byStatus.WON ?? 0;
  const closed = won + (data?.byStatus.LOST ?? 0);
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll<Lead>('/leads', filters);
      downloadCsv('leads', [
        { title: 'التاريخ', value: (l) => fmtDateTime(l.createdAt) },
        { title: 'العميل المحتمل', value: (l) => l.customerName },
        { title: 'الموبايل', value: (l) => l.phone },
        { title: 'المنطقة', value: (l) => l.area },
        { title: 'المنتج', value: (l) => l.product?.nameAr },
        { title: 'صاحب الترشيح', value: (l) => l.referrer.name },
        { title: 'المتابعة', value: (l) => l.assignee?.name },
        { title: 'الحالة', value: (l) => LEAD_STATUS[l.status].label },
        { title: 'ملاحظات', value: (l) => l.outcomeNote ?? l.notes },
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
      title="الترشيحات"
      subtitle="عملاء محتملين رشحهم الفنيين والمندوبين"
      actions={<Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>تصدير Excel</Button>}
    />
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => {
        const active = filters.status === s;
        return (
          <Col key={s} xs={12} sm={8} lg={{ flex: '20%' }}>
            <Card hoverable onClick={() => update({ status: active ? undefined : s })} styles={{ body: { padding: 14 } }}
              style={active ? { borderColor: '#2E508F', boxShadow: '0 0 0 1px #2E508F' } : undefined}>
              <Statistic title={<Space size={6}><Badge color={LEAD_STATUS[s].color} />{LEAD_STATUS[s].label}</Space>} value={data?.byStatus[s] ?? 0} />
            </Card>
          </Col>
        );
      })}
      <Col xs={12} sm={8} lg={{ flex: '20%' }}>
        <Card styles={{ body: { padding: 14 } }}>
          <Statistic title="نسبة التحويل" value={closed ? Math.round((won / closed) * 100) : 0} suffix="%" />
        </Card>
      </Col>
    </Row>
    <Card className="table-card">
      <Space wrap className="table-toolbar" style={{ display: 'flex' }}>
        <Input.Search placeholder="الاسم أو الموبايل" allowClear style={{ width: 240 }} onSearch={(v) => update({ search: v || undefined })} />
        <Select allowClear placeholder="الحالة" style={{ width: 150 }}
          value={filters.status}
          options={(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => ({ value: s, label: LEAD_STATUS[s].label }))}
          onChange={(v) => update({ status: v })} />
        <Select allowClear placeholder="المسؤول عن المتابعة" style={{ width: 200 }}
          options={assignees.data?.map((u) => ({ value: u.id, label: u.name }))}
          onChange={(v) => update({ assigneeId: v })} />
      </Space>
      <Table<Lead>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 1000 }}
        rowClassName="clickable"
        onRow={(l) => ({ onClick: () => navigate(`/leads/${l.id}`) })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime, width: 170 },
          { title: 'العميل المحتمل', render: (_, l) => <>{l.customerName}<br /><Typography.Text type="secondary" dir="ltr">{l.phone}</Typography.Text></> },
          { title: 'المنطقة', dataIndex: 'area', render: (v) => v ?? '—' },
          { title: 'المنتج', render: (_, l) => l.product?.nameAr ?? '—' },
          { title: 'صاحب الترشيح', render: (_, l) => <>{l.referrer.name} <Tag>{REFERRER_TYPE[l.referrer.type] ?? l.referrer.type}</Tag></> },
          { title: 'المتابعة', render: (_, l) => l.assignee?.name ?? <Typography.Text type="danger">غير محدد</Typography.Text> },
          { title: 'الحالة', render: (_, l) => <Tag color={LEAD_STATUS[l.status].color}>{LEAD_STATUS[l.status].label}</Tag> },
          { title: 'ملاحظات', render: (_, l) => l.outcomeNote ?? l.notes ?? '—', ellipsis: true },
        ]}
      />
    </Card>
    </>
  );
}
