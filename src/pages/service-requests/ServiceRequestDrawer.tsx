import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, DatePicker, Descriptions, Divider, Drawer, Empty, Form, Grid, Image, Input, Popconfirm, Skeleton, Space,
  Table, Tag, Timeline, Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { EnumTag } from '../../components/EnumTag';
import { PrivateImage } from '../../components/FileLink';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtAddress, fmtDate, fmtDateTime } from '../../lib/format';
import {
  PRIORITY, SERVICE_KIND, SERVICE_STATUS, SOURCE, SPECIALIZATION, type ServiceStatus,
} from '../../lib/labels';
import type { EligibleTechnicians, ServiceRequestDetail } from './types';

const DISPATCHABLE: ServiceStatus[] = ['PENDING', 'SCHEDULED', 'ASSIGNED'];

export function ServiceRequestDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const screens = Grid.useBreakpoint();

  const { data: r, isLoading } = useQuery({
    queryKey: ['service-request', id],
    queryFn: async () => (await api.get<ServiceRequestDetail>(`/service-requests/${id}`)).data,
    enabled: id != null,
  });

  const canDispatch = !!r && DISPATCHABLE.includes(r.status);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['service-request', id] });
    qc.invalidateQueries({ queryKey: ['service-requests'] });
    qc.invalidateQueries({ queryKey: ['eligible', id] });
    qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
  };

  const cancel = useMutation({
    mutationFn: (reason: string) => api.post(`/service-requests/${id}/cancel`, { reason }),
    onSuccess: () => { message.success('تم إلغاء الطلب'); refresh(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  const [cancelReason, setCancelReason] = useState('');

  return (
    <Drawer
      open={id != null}
      onClose={onClose}
      size={720}
      title={r ? <Space>{r.number}<EnumTag map={SERVICE_STATUS} value={r.status} /></Space> : 'تفاصيل الطلب'}
      extra={canDispatch && can('service.write') && (
        <Popconfirm
          title="إلغاء الطلب"
          description={<Input.TextArea placeholder="سبب الإلغاء" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />}
          okText="تأكيد الإلغاء"
          cancelText="رجوع"
          okButtonProps={{ danger: true, disabled: cancelReason.trim().length < 3, loading: cancel.isPending }}
          onConfirm={() => cancel.mutateAsync(cancelReason.trim())}
        >
          <Button danger>إلغاء الطلب</Button>
        </Popconfirm>
      )}
    >
      {isLoading || !r ? <Skeleton active /> : (
        <>
          <Descriptions column={screens.sm === false ? 1 : 2} size="small" bordered>
            <Descriptions.Item label="نوع الخدمة">{SERVICE_KIND[r.kind].label}</Descriptions.Item>
            <Descriptions.Item label="الأولوية"><EnumTag map={PRIORITY} value={r.priority} /></Descriptions.Item>
            <Descriptions.Item label="العميل">{r.customer.name}</Descriptions.Item>
            <Descriptions.Item label="الموبايل">
              <a href={`tel:${r.customer.phone}`}>{r.customer.phone}</a>
              {r.customer.altPhone && <> / {r.customer.altPhone}</>}
            </Descriptions.Item>
            <Descriptions.Item label="العنوان" span="filled">
              {fmtAddress(r.address)}
              {r.address.floor && ` — دور ${r.address.floor}`}
              {r.address.apartment && ` شقة ${r.address.apartment}`}
              {r.address.details && <><br /><Typography.Text type="secondary">{r.address.details}</Typography.Text></>}
            </Descriptions.Item>
            <Descriptions.Item label="الجهاز">
              {r.device ? `${r.device.product?.nameAr ?? r.device.modelName}${r.device.serialNumber ? ` (${r.device.serialNumber})` : ''}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="المصدر">{SOURCE[r.source].label}{r.createdBy && ` — ${r.createdBy.name}`}</Descriptions.Item>
            <Descriptions.Item label="الموعد المفضل">
              {r.preferredDate ? `${fmtDate(r.preferredDate)} ${r.preferredSlot ?? ''}` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="الموعد المحدد">{fmtDateTime(r.scheduledAt)}</Descriptions.Item>
            <Descriptions.Item label="الفني">
              {r.technician ? `${r.technician.user.name} (${r.technician.code})` : <Typography.Text type="danger">غير محدد</Typography.Text>}
            </Descriptions.Item>
            <Descriptions.Item label="التخصص المطلوب">
              <EnumTag map={SPECIALIZATION} value={r.requiredSpecialization} />
            </Descriptions.Item>
            {r.description && <Descriptions.Item label="وصف المشكلة" span="filled">{r.description}</Descriptions.Item>}
            {r.cancelReason && <Descriptions.Item label="سبب الإلغاء" span="filled">{r.cancelReason}</Descriptions.Item>}
          </Descriptions>

          {canDispatch && (
            <>
              {can('service.assign') && (
                <>
                  <Divider titlePlacement="start">{r.technician ? 'إعادة التعيين' : 'تعيين فني'}</Divider>
                  <AssignPanel request={r} onDone={refresh} />
                </>
              )}
              {can('service.write') && (
                <>
                  <Divider titlePlacement="start">الموعد</Divider>
                  <ScheduleForm request={r} onDone={refresh} />
                </>
              )}
            </>
          )}

          {r.attachments.length > 0 && (
            <>
              <Divider titlePlacement="start">صور الزيارة</Divider>
              <Image.PreviewGroup>
                <Space wrap>
                  {r.attachments.map((a) => <PrivateImage key={a.fileId} fileId={a.fileId} />)}
                </Space>
              </Image.PreviewGroup>
            </>
          )}

          <Divider titlePlacement="start">سجل الطلب</Divider>
          <Timeline
            items={r.statusHistory.map((h) => ({
              content: (
                <>
                  <EnumTag map={SERVICE_STATUS} value={h.toStatus} />
                  <Typography.Text type="secondary">{fmtDateTime(h.createdAt)} — {h.changedBy?.name ?? 'النظام'}</Typography.Text>
                  {h.note && <div>{h.note}</div>}
                </>
              ),
            }))}
          />
        </>
      )}
    </Drawer>
  );
}

function AssignPanel({ request, onDone }: { request: ServiceRequestDetail; onDone: () => void }) {
  const { message } = App.useApp();
  const [reason, setReason] = useState('');
  const reassigning = !!request.technician;

  const { data, isLoading } = useQuery({
    queryKey: ['eligible', request.id],
    queryFn: async () => (await api.get<EligibleTechnicians>(`/service-requests/${request.id}/eligible-technicians`)).data,
  });

  const assign = useMutation({
    mutationFn: (technicianId: number) =>
      api.post(`/service-requests/${request.id}/assign`, { technicianId, reason: reassigning ? reason.trim() : undefined }),
    onSuccess: () => { message.success('تم تعيين الفني'); setReason(''); onDone(); },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !data) return <Skeleton active />;
  return (
    <>
      <Typography.Paragraph type="secondary">
        فنيون متاحون بتخصص <EnumTag map={SPECIALIZATION} value={data.specialization} />
        مرتبون حسب عدد مهامهم يوم {fmtDate(data.day)}
      </Typography.Paragraph>
      {reassigning && (
        <Input
          placeholder="سبب إعادة التعيين (مطلوب)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ marginBottom: 12 }}
        />
      )}
      {data.technicians.length === 0 ? <Empty description="لا يوجد فنيون متاحون بهذا التخصص" /> : (
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={data.technicians}
          columns={[
            { title: 'الفني', render: (_, t) => <>{t.name} <Typography.Text type="secondary">({t.code})</Typography.Text></> },
            { title: 'المنطقة', dataIndex: 'serviceArea', render: (v) => v ?? '—' },
            {
              title: 'مهام اليوم',
              render: (_, t) => (
                <span title={t.scheduleThatDay.map((x) => `${x.number} ${dayjs(x.scheduledAt).format('h:mm A')}`).join('\n')}>
                  {t.tasksThatDay}
                </span>
              ),
            },
            { title: 'مهام مفتوحة', dataIndex: 'openTasks' },
            {
              title: '',
              render: (_, t) => t.id === request.technician?.id
                ? <Tag color="green">الحالي</Tag>
                : (
                  <Button
                    size="small"
                    type="primary"
                    loading={assign.isPending && assign.variables === t.id}
                    disabled={reassigning && reason.trim().length < 3}
                    onClick={() => assign.mutate(t.id)}
                  >
                    تعيين
                  </Button>
                ),
            },
          ]}
        />
      )}
    </>
  );
}

function ScheduleForm({ request, onDone }: { request: ServiceRequestDetail; onDone: () => void }) {
  const { message } = App.useApp();
  const schedule = useMutation({
    mutationFn: (v: { scheduledAt: Dayjs; note?: string }) =>
      api.post(`/service-requests/${request.id}/schedule`, { scheduledAt: v.scheduledAt.toISOString(), note: v.note }),
    onSuccess: () => { message.success('تم تحديد الموعد'); onDone(); },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Form
      layout="inline"
      onFinish={schedule.mutate}
      initialValues={{ scheduledAt: request.scheduledAt ? dayjs(request.scheduledAt) : undefined }}
    >
      <Form.Item name="scheduledAt" rules={[{ required: true, message: 'حدد الموعد' }]}>
        <DatePicker showTime={{ format: 'h:mm A', minuteStep: 15 }} format="D MMM YYYY h:mm A" />
      </Form.Item>
      <Form.Item name="note">
        <Input placeholder="ملاحظة (اختياري)" />
      </Form.Item>
      <Button htmlType="submit" loading={schedule.isPending}>
        {request.scheduledAt ? 'إعادة جدولة' : 'حفظ الموعد'}
      </Button>
    </Form>
  );
}
