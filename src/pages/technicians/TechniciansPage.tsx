import { PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, Card, Checkbox, Col, Form, Input, Modal, Row, Select, Space, Switch, Table, Tag, Typography,
} from 'antd';
import { useState } from 'react';
import { EnumTag } from '../../components/EnumTag';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SPECIALIZATION, options, type Specialization } from '../../lib/labels';
import { PHONE_RULE } from '../../lib/validation';

interface Technician {
  id: number;
  code: string;
  name: string;
  username: string;
  phone: string | null;
  isActive: boolean;
  isAvailable: boolean;
  serviceArea: string | null;
  specializations: Specialization[];
  openTasks: number;
}

export function TechniciansPage() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; specialization?: Specialization }>({});
  const [editing, setEditing] = useState<Technician | 'new' | null>(null);
  const [resetting, setResetting] = useState<Technician | null>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['technicians', filters, page],
    queryFn: async () => (await api.get<Page<Technician>>('/technicians', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>الفنيين</Typography.Title>}
      extra={can('technician.write') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>فني جديد</Button>
      )}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search placeholder="الاسم، الكود أو الموبايل" allowClear style={{ width: 260 }}
          onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
        <Select allowClear placeholder="التخصص" style={{ width: 160 }} options={options(SPECIALIZATION)}
          onChange={(v) => { setFilters((f) => ({ ...f, specialization: v })); setPage(1); }} />
      </Space>
      <Table<Technician>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'الكود', dataIndex: 'code', width: 100 },
          { title: 'الاسم', dataIndex: 'name' },
          { title: 'اسم المستخدم', dataIndex: 'username', render: (v) => <span dir="ltr">{v}</span> },
          { title: 'الموبايل', dataIndex: 'phone', render: (v) => <span dir="ltr">{v ?? '—'}</span> },
          {
            title: 'التخصصات',
            render: (_, t) => <Space size={4} wrap>{t.specializations.map((s) => <EnumTag key={s} map={SPECIALIZATION} value={s} />)}</Space>,
          },
          { title: 'المنطقة', dataIndex: 'serviceArea', render: (v) => v ?? '—' },
          { title: 'مهام مفتوحة', dataIndex: 'openTasks' },
          {
            title: 'الحالة',
            render: (_, t) => !t.isActive ? <Tag color="red">موقوف</Tag> : t.isAvailable ? <Tag color="green">متاح</Tag> : <Tag color="orange">غير متاح</Tag>,
          },
          {
            title: '',
            render: (_, t) => can('technician.write') && (
              <Space>
                <Button size="small" onClick={() => setEditing(t)}>تعديل</Button>
                <Button size="small" onClick={() => setResetting(t)}>كلمة المرور</Button>
              </Space>
            ),
          },
        ]}
      />
      <TechnicianModal technician={editing} onClose={() => setEditing(null)} />
      <ResetPasswordModal technician={resetting} onClose={() => setResetting(null)} />
    </Card>
  );
}

function TechnicianModal({ technician, onClose }: { technician: Technician | 'new' | null; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const existing = technician && technician !== 'new' ? technician : null;

  const save = useMutation({
    mutationFn: (v: object) => (existing ? api.patch(`/technicians/${existing.id}`, v) : api.post('/technicians', v)),
    onSuccess: () => {
      message.success('تم حفظ بيانات الفني');
      qc.invalidateQueries({ queryKey: ['technicians'] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={!!technician}
      title={existing ? `تعديل: ${existing.name}` : 'فني جديد'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={save.isPending}
      width={640}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={save.mutate}
        initialValues={existing
          ? { name: existing.name, phone: existing.phone ?? undefined, code: existing.code, serviceArea: existing.serviceArea ?? undefined,
              specializations: existing.specializations, isAvailable: existing.isAvailable, isActive: existing.isActive }
          : { specializations: [] }}
      >
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="code" label="كود الفني" rules={[{ required: true, message: 'مطلوب' }]}><Input dir="ltr" /></Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="phone" label="الموبايل (للدخول على التطبيق)" rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}><Input dir="ltr" /></Form.Item>
          </Col>
          {!existing && (
            <>
              <Col xs={12}>
                <Form.Item name="username" label="اسم المستخدم" rules={[
                  { required: true, message: 'مطلوب' },
                  { pattern: /^[a-zA-Z0-9_.]{3,32}$/, message: 'حروف إنجليزية وأرقام فقط (3 أحرف على الأقل)' },
                ]}>
                  <Input dir="ltr" autoComplete="off" />
                </Form.Item>
              </Col>
              <Col xs={12}>
                <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}>
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </Col>
            </>
          )}
          <Col span={24}>
            <Form.Item name="specializations" label="التخصصات" rules={[{ required: true, type: 'array', min: 1, message: 'اختر تخصصاً واحداً على الأقل' }]}>
              <Checkbox.Group options={options(SPECIALIZATION)} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="serviceArea" label="منطقة العمل"><Input placeholder="مثال: مدينة نصر، مصر الجديدة" /></Form.Item>
          </Col>
          {existing && (
            <>
              <Col><Form.Item name="isAvailable" label="متاح لاستلام مهام" valuePropName="checked"><Switch /></Form.Item></Col>
              <Col><Form.Item name="isActive" label="الحساب مفعل" valuePropName="checked"><Switch /></Form.Item></Col>
            </>
          )}
        </Row>
      </Form>
    </Modal>
  );
}

function ResetPasswordModal({ technician, onClose }: { technician: Technician | null; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const reset = useMutation({
    mutationFn: (v: { password: string }) => api.post(`/technicians/${technician!.id}/reset-password`, v),
    onSuccess: () => { message.success('تم تغيير كلمة المرور وتسجيل خروج الفني من كل الأجهزة'); onClose(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  return (
    <Modal
      open={!!technician}
      title={`كلمة مرور جديدة: ${technician?.name ?? ''}`}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={reset.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false} onFinish={reset.mutate}>
        <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
