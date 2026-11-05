import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Card, Col, Form, Input, Modal, Row, Select, Space, Statistic, Table, Tag, Typography,
} from 'antd';
import { useState } from 'react';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';

type LeadStatus = 'NEW' | 'CONTACTED' | 'WON' | 'LOST';
const LEAD_STATUS: Record<LeadStatus, { label: string; color: string }> = {
  NEW: { label: 'جديد', color: 'blue' },
  CONTACTED: { label: 'تم التواصل', color: 'orange' },
  WON: { label: 'تم البيع', color: 'green' },
  LOST: { label: 'لم يتم', color: 'red' },
};
const REFERRER_TYPE: Record<string, string> = { TECHNICIAN: 'فني', SALES_REP: 'مندوب', STAFF: 'موظف', CUSTOMER: 'عميل' };

interface Lead {
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
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; status?: LeadStatus; assigneeId?: number }>({});
  const [editing, setEditing] = useState<Lead | null>(null);

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

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>الترشيحات</Typography.Title>}>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {(Object.keys(LEAD_STATUS) as LeadStatus[]).map((s) => (
          <Col key={s} xs={12} md={4}>
            <Statistic title={LEAD_STATUS[s].label} value={data?.byStatus[s] ?? 0} />
          </Col>
        ))}
        <Col xs={12} md={4}>
          <Statistic title="نسبة التحويل" value={closed ? Math.round((won / closed) * 100) : 0} suffix="%" />
        </Col>
      </Row>
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="الاسم أو الموبايل" allowClear style={{ width: 240 }} onSearch={(v) => update({ search: v || undefined })} />
        <Select allowClear placeholder="الحالة" style={{ width: 150 }}
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
        onRow={(l) => ({ onClick: () => can('lead.write') && setEditing(l), style: { cursor: 'pointer' } })}
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
      <LeadModal lead={editing} assignees={assignees.data ?? []} onClose={() => setEditing(null)} />
    </Card>
  );
}

function LeadModal({ lead, assignees, onClose }: {
  lead: Lead | null; assignees: { id: number; name: string }[]; onClose: () => void;
}) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const status = Form.useWatch('status', form) as LeadStatus | undefined;
  const save = useMutation({
    mutationFn: (v: { status: LeadStatus; assigneeId?: number; outcomeNote?: string }) =>
      api.patch(`/leads/${lead!.id}`, { ...v, assigneeId: v.assigneeId ?? null }),
    onSuccess: () => {
      message.success('تم تحديث الترشيح');
      qc.invalidateQueries({ queryKey: ['leads'] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  const closed = !!lead?.closedAt;

  return (
    <Modal open={!!lead} title={lead ? `${lead.customerName} — ${lead.phone}` : ''} onCancel={onClose} onOk={() => form.submit()}
      okText="حفظ" cancelText="إلغاء" confirmLoading={save.isPending} destroyOnHidden>
      {lead && (
        <Typography.Paragraph type="secondary">
          رشّحه {lead.referrer.name} — {fmtDateTime(lead.createdAt)}
          {lead.product && <> — مهتم بـ {lead.product.nameAr}</>}
          {lead.notes && <><br />{lead.notes}</>}
        </Typography.Paragraph>
      )}
      <Form form={form} layout="vertical" preserve={false} onFinish={save.mutate}
        initialValues={lead ? { status: lead.status, assigneeId: lead.assignee?.id, outcomeNote: lead.outcomeNote ?? undefined } : undefined}>
        <Form.Item name="status" label="الحالة">
          <Select options={(Object.keys(LEAD_STATUS) as LeadStatus[])
            .filter((s) => !closed || s === 'WON' || s === 'LOST')
            .map((s) => ({ value: s, label: LEAD_STATUS[s].label }))} />
        </Form.Item>
        <Form.Item name="assigneeId" label="المسؤول عن المتابعة">
          <Select allowClear options={assignees.map((u) => ({ value: u.id, label: u.name }))} />
        </Form.Item>
        <Form.Item
          name="outcomeNote"
          label={status === 'LOST' ? 'سبب عدم إتمام البيع' : 'ملاحظات المتابعة (العربون، الجهاز المتفق عليه…)'}
          rules={[{ required: status === 'LOST', message: 'اذكر السبب' }]}
        >
          <Input.TextArea rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
