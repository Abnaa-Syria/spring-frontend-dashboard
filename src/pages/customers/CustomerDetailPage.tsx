import { EditOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, Card, Col, DatePicker, Descriptions, Empty, Flex, Form, Grid, Input, Modal, Row, Select, Skeleton, Space,
  Table, Tag, Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtAddress, fmtDate, fmtDateTime } from '../../lib/format';
import { PRIORITY, SERVICE_KIND, SERVICE_STATUS } from '../../lib/labels';
import { CreateServiceRequestModal } from '../service-requests/CreateServiceRequestModal';
import { ServiceRequestDrawer } from '../service-requests/ServiceRequestDrawer';
import type { ProductRow } from '../products/types';
import { AddressFields } from './AddressFields';
import type { Address, CustomerDetail } from './types';

export function CustomerDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const screens = Grid.useBreakpoint();
  const [addressModal, setAddressModal] = useState<{ open: boolean; address?: Address }>({ open: false });
  const [deviceModal, setDeviceModal] = useState(false);
  const [requestModal, setRequestModal] = useState(false);
  const [openRequest, setOpenRequest] = useState<number | null>(null);

  const { data: c, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${id}`)).data,
  });

  if (isLoading || !c) return <Card><Skeleton active /></Card>;
  const editable = can('customer.write');

  return (
    <Space orientation="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={<Typography.Title level={4} style={{ margin: 0 }}>{c.name}</Typography.Title>}
        extra={can('service.write') && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setRequestModal(true)}>طلب خدمة</Button>
        )}
      >
        <Descriptions column={screens.lg ? 4 : screens.sm ? 2 : 1} size="small">
          <Descriptions.Item label="الموبايل"><span dir="ltr">{c.phone}</span></Descriptions.Item>
          <Descriptions.Item label="موبايل آخر"><span dir="ltr">{c.altPhone ?? '—'}</span></Descriptions.Item>
          <Descriptions.Item label="حساب التطبيق">
            {c.userId ? <Tag color="green">مسجل</Tag> : <Tag>غير مسجل</Tag>}
          </Descriptions.Item>
          <Descriptions.Item label="نقاط الولاء">{c.loyaltyPoints}</Descriptions.Item>
          {c.legacyCustomerId && <Descriptions.Item label="رقم النظام القديم">{c.legacyCustomerId}</Descriptions.Item>}
          {c.nationalIdLast4 && <Descriptions.Item label="الرقم القومي">•••• {c.nationalIdLast4}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={10}>
          <Card
            title="العناوين"
            extra={editable && <Button size="small" icon={<PlusOutlined />} onClick={() => setAddressModal({ open: true })}>إضافة</Button>}
          >
            {c.addresses.length === 0 ? <Empty description="لا توجد عناوين" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
              <Flex vertical gap={12}>
                {c.addresses.map((a) => (
                  <Flex key={a.id} justify="space-between" align="start" gap={8}>
                    <div>
                      <Space>
                        <Typography.Text strong>{a.label ?? 'عنوان'}</Typography.Text>
                        {a.isDefault && <Tag color="blue">افتراضي</Tag>}
                      </Space>
                      <div>
                        <Typography.Text type="secondary">
                          {fmtAddress(a)}{a.floor && ` — دور ${a.floor}`}{a.apartment && ` شقة ${a.apartment}`}
                        </Typography.Text>
                      </div>
                    </div>
                    {editable && (
                      <Button size="small" type="text" icon={<EditOutlined />} aria-label="تعديل العنوان"
                        onClick={() => setAddressModal({ open: true, address: a })} />
                    )}
                  </Flex>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card
            title="الأجهزة"
            extra={editable && <Button size="small" icon={<PlusOutlined />} onClick={() => setDeviceModal(true)}>إضافة جهاز</Button>}
          >
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={c.devices}
              locale={{ emptyText: 'لا توجد أجهزة' }}
              columns={[
                { title: 'الجهاز', render: (_, d) => d.product?.nameAr ?? d.modelName },
                { title: 'الرقم التسلسلي', dataIndex: 'serialNumber', render: (v) => v ?? '—' },
                { title: 'التركيب', dataIndex: 'installedAt', render: fmtDate },
                { title: 'الصيانة القادمة', dataIndex: 'nextMaintenanceAt', render: fmtDate },
              ]}
            />
          </Card>
        </Col>
      </Row>

      <Card title="طلبات الخدمة">
        <Table
          rowKey="id"
          size="small"
          dataSource={c.serviceRequests}
          pagination={false}
          onRow={(r) => ({ onClick: () => setOpenRequest(r.id), style: { cursor: 'pointer' } })}
          locale={{ emptyText: 'لا توجد طلبات' }}
          columns={[
            { title: 'الرقم', dataIndex: 'number' },
            { title: 'النوع', render: (_, r) => SERVICE_KIND[r.kind].label },
            { title: 'الأولوية', render: (_, r) => <EnumTag map={PRIORITY} value={r.priority} /> },
            { title: 'الموعد', dataIndex: 'scheduledAt', render: fmtDateTime },
            { title: 'الفني', render: (_, r) => r.technician?.user.name ?? '—' },
            { title: 'الحالة', render: (_, r) => <EnumTag map={SERVICE_STATUS} value={r.status} /> },
          ]}
        />
      </Card>

      <AddressModal customerId={id} state={addressModal} onClose={() => setAddressModal({ open: false })} />
      <DeviceModal customer={c} open={deviceModal} onClose={() => setDeviceModal(false)} />
      <CreateServiceRequestModal
        open={requestModal}
        customerId={id}
        onClose={() => setRequestModal(false)}
        onCreated={(rid) => { setRequestModal(false); setOpenRequest(rid); }}
      />
      <ServiceRequestDrawer id={openRequest} onClose={() => setOpenRequest(null)} />
    </Space>
  );
}

function AddressModal({
  customerId, state, onClose,
}: { customerId: number; state: { open: boolean; address?: Address }; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const editing = state.address;

  const save = useMutation({
    mutationFn: (v: object) => editing
      ? api.put(`/customers/${customerId}/addresses/${editing.id}`, v)
      : api.post(`/customers/${customerId}/addresses`, v),
    onSuccess: () => {
      message.success(editing ? 'تم تحديث العنوان (العنوان السابق محفوظ في السجل)' : 'تم إضافة العنوان');
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={state.open}
      title={editing ? 'تعديل العنوان' : 'عنوان جديد'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={save.isPending}
      width={680}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={save.mutate}
        initialValues={editing ? { ...editing, label: editing.label ?? undefined } : undefined}
        preserve={false}
      >
        <Form.Item name="label" label="اسم العنوان"><Input placeholder="المنزل، العمل…" /></Form.Item>
        <AddressFields />
      </Form>
    </Modal>
  );
}

function DeviceModal({ customer, open, onClose }: { customer: CustomerDetail; open: boolean; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const products = useQuery({
    queryKey: ['products', 'lookup', 'DEVICE', search],
    queryFn: async () =>
      (await api.get<Page<ProductRow>>('/products', { params: { type: 'DEVICE', search: search || undefined, pageSize: 20 } })).data.items,
    enabled: open,
  });

  const save = useMutation({
    mutationFn: (v: { productId?: number; modelName?: string; serialNumber?: string; addressId?: number; installedAt?: Dayjs; nextMaintenanceAt?: Dayjs }) =>
      api.post(`/customers/${customer.id}/devices`, {
        ...v,
        installedAt: v.installedAt?.format('YYYY-MM-DD'),
        nextMaintenanceAt: v.nextMaintenanceAt?.format('YYYY-MM-DD'),
      }),
    onSuccess: () => {
      message.success('تم إضافة الجهاز');
      qc.invalidateQueries({ queryKey: ['customer', customer.id] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={open}
      title="إضافة جهاز للعميل"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={save.isPending}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={save.mutate} preserve={false}>
        <Form.Item name="productId" label="المنتج">
          <Select
            allowClear
            showSearch={{ filterOption: false, onSearch: setSearch }}
            placeholder="اختر من المنتجات"
            options={products.data?.map((p) => ({ value: p.id, label: `${p.nameAr} (${p.sku})` }))}
          />
        </Form.Item>
        <Form.Item name="modelName" label="اسم الموديل" extra="مطلوب لو الجهاز مش موجود في قائمة المنتجات">
          <Input />
        </Form.Item>
        <Form.Item name="serialNumber" label="الرقم التسلسلي"><Input dir="ltr" /></Form.Item>
        <Form.Item name="addressId" label="مكان التركيب">
          <Select allowClear options={customer.addresses.map((a) => ({ value: a.id, label: fmtAddress(a) }))} />
        </Form.Item>
        <Space>
          <Form.Item name="installedAt" label="تاريخ التركيب"><DatePicker /></Form.Item>
          <Form.Item name="nextMaintenanceAt" label="الصيانة القادمة"><DatePicker /></Form.Item>
        </Space>
      </Form>
    </Modal>
  );
}
