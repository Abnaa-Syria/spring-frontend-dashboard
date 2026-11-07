import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Descriptions, Flex, Form, Input, Row, Select, Skeleton, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
import { LEAD_STATUS, REFERRER_TYPE, type Lead, type LeadStatus } from './LeadsPage';

/** /leads/:id — everything about a referral plus the follow-up form. */
export function LeadDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const status = Form.useWatch('status', form) as LeadStatus | undefined;

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', id],
    queryFn: async () => (await api.get<Lead & { product: { id: number; nameAr: string; sku?: string } | null }>(`/leads/${id}`)).data,
  });
  const assignees = useQuery({
    queryKey: ['lead-assignees'],
    queryFn: async () => (await api.get<{ id: number; name: string }[]>('/leads/assignees')).data,
  });
  const save = useMutation({
    mutationFn: (v: { status: LeadStatus; assigneeId?: number; outcomeNote?: string }) =>
      api.patch(`/leads/${id}`, { ...v, assigneeId: v.assigneeId ?? null }),
    onSuccess: () => {
      message.success('تم تحديث الترشيح');
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['lead', id] });
      navigate('/leads');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !lead) return <Card><Skeleton active /></Card>;
  const closed = !!lead.closedAt;
  const editable = can('lead.write');

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'الترشيحات', to: '/leads' }, { title: lead.customerName }]}
        title={<Flex gap={10} align="center" wrap>{lead.customerName}<Tag color={LEAD_STATUS[lead.status].color}>{LEAD_STATUS[lead.status].label}</Tag></Flex>}
        subtitle={<bdi dir="ltr">{lead.phone}</bdi>}
      />
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={editable ? 12 : 24}>
          <Card title="بيانات الترشيح" style={{ height: '100%' }}>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="العميل المحتمل">{lead.customerName}</Descriptions.Item>
              <Descriptions.Item label="الموبايل"><bdi dir="ltr">{lead.phone}</bdi></Descriptions.Item>
              <Descriptions.Item label="المنطقة">{lead.area ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="المنتج المهتم بيه">
                {lead.product ? <>{lead.product.nameAr}{lead.product.sku && <Typography.Text type="secondary"> ({lead.product.sku})</Typography.Text>}</> : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="صاحب الترشيح">
                {lead.referrer.name} <Tag>{REFERRER_TYPE[lead.referrer.type] ?? lead.referrer.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="ملاحظات صاحب الترشيح">{lead.notes ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="تاريخ الترشيح">{fmtDateTime(lead.createdAt)}</Descriptions.Item>
              <Descriptions.Item label="المسؤول عن المتابعة">{lead.assignee?.name ?? <Typography.Text type="danger">غير محدد</Typography.Text>}</Descriptions.Item>
              <Descriptions.Item label="الحالة"><Tag color={LEAD_STATUS[lead.status].color}>{LEAD_STATUS[lead.status].label}</Tag></Descriptions.Item>
              <Descriptions.Item label="نتيجة المتابعة">{lead.outcomeNote ?? '—'}</Descriptions.Item>
              {lead.closedAt && <Descriptions.Item label="تاريخ الإغلاق">{fmtDateTime(lead.closedAt)}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
        {editable && (
          <Col xs={24} lg={12}>
            <Card title="تحديث المتابعة" style={{ height: '100%' }}>
              <Form form={form} layout="vertical" onFinish={save.mutate}
                initialValues={{ status: lead.status, assigneeId: lead.assignee?.id, outcomeNote: lead.outcomeNote ?? undefined }}>
                <Form.Item name="status" label="الحالة" extra={closed ? 'الترشيح مقفول: يمكن التبديل بين "تم البيع" و"لم يتم" فقط' : undefined}>
                  <Select options={(Object.keys(LEAD_STATUS) as LeadStatus[])
                    .filter((s) => !closed || s === 'WON' || s === 'LOST')
                    .map((s) => ({ value: s, label: LEAD_STATUS[s].label }))} />
                </Form.Item>
                <Form.Item name="assigneeId" label="المسؤول عن المتابعة">
                  <Select allowClear loading={assignees.isLoading} options={assignees.data?.map((u) => ({ value: u.id, label: u.name }))} />
                </Form.Item>
                <Form.Item
                  name="outcomeNote"
                  label={status === 'LOST' ? 'سبب عدم إتمام البيع' : 'ملاحظات المتابعة (العربون، الجهاز المتفق عليه…)'}
                  rules={[{ required: status === 'LOST', message: 'اذكر السبب' }]}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
                <Flex gap={8}>
                  <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
                  <Button onClick={() => navigate(-1)}>إلغاء</Button>
                </Flex>
              </Form>
            </Card>
          </Col>
        )}
      </Row>
    </>
  );
}
