import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, DatePicker, Divider, Flex, Form, Input, InputNumber, Radio, Row, Select } from 'antd';
import type { Dayjs } from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { fmtAddress } from '../../lib/format';
import { PHONE_RULE } from '../../lib/validation';
import { PRIORITY, SERVICE_KIND, options, type ServiceKind, type ServicePriority } from '../../lib/labels';
import type { CustomerDetail, CustomerRow } from '../customers/types';

const SLOTS = ['09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00'];

interface Values {
  customerMode: 'existing' | 'new';
  customerId?: number;
  newCustomer?: { name: string; phone: string; governorate: string; city: string; area?: string; street?: string; details?: string };
  addressId?: number;
  deviceId?: number;
  kind: ServiceKind;
  priority: ServicePriority;
  preferredDate?: Dayjs;
  preferredSlot?: string;
  scheduledAt?: Dayjs;
  description?: string;
  serviceFee?: number | null;
}

/** Office booking (usually from a phone call). Can create the customer in the same step. */
export function ServiceRequestCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const fixedCustomerId = Number(params.get('customerId')) || undefined;
  const [form] = Form.useForm<Values>();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const mode = Form.useWatch('customerMode', form) ?? 'existing';
  const customerId = Form.useWatch('customerId', form) ?? fixedCustomerId;
  const kind = Form.useWatch('kind', form);
  const coverage = useQuery({
    queryKey: ['coverage'],
    queryFn: async () => (await api.get<{ serviceFees: Record<ServiceKind, number> }>('/coverage')).data,
  });
  const defaultFee = kind ? coverage.data?.serviceFees[kind] : undefined;

  const customers = useQuery({
    queryKey: ['customers', 'lookup', search],
    queryFn: async () => (await api.get<Page<CustomerRow>>('/customers', { params: { search, pageSize: 10 } })).data.items,
    enabled: mode === 'existing' && !fixedCustomerId,
  });
  const customer = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${customerId}`)).data,
    enabled: !!customerId && mode === 'existing',
  });

  const create = useMutation({
    mutationFn: async (v: Values) => {
      let cId = fixedCustomerId ?? v.customerId;
      let addressId = v.addressId;
      if (v.customerMode === 'new' && v.newCustomer) {
        const { name, phone, ...address } = v.newCustomer;
        const { data } = await api.post<CustomerDetail>('/customers', { name, phone, address });
        cId = data.id;
        addressId = data.addresses[0].id;
      }
      const { data } = await api.post<{ id: number; number: string }>('/service-requests', {
        customerId: cId,
        addressId,
        deviceId: v.deviceId,
        kind: v.kind,
        priority: v.priority,
        preferredDate: v.preferredDate?.format('YYYY-MM-DD'),
        preferredSlot: v.preferredSlot,
        scheduledAt: v.scheduledAt?.toISOString(),
        description: v.description,
        ...(v.serviceFee != null && { serviceFee: v.serviceFee }),
      });
      return data;
    },
    onSuccess: (sr) => {
      message.success(`تم إنشاء الطلب ${sr.number}`);
      qc.invalidateQueries({ queryKey: ['service-requests'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer'] });
      qc.invalidateQueries({ queryKey: ['dashboard-summary'] });
      navigate(`/service-requests/${sr.id}`, { replace: true });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  // Preselect the customer's default (or only) address once their record loads.
  useEffect(() => {
    const c = customer.data;
    if (!c?.addresses.length || form.getFieldValue('addressId')) return;
    form.setFieldValue('addressId', (c.addresses.find((a) => a.isDefault) ?? c.addresses[0]).id);
  }, [customer.data, form]);

  const fixedCustomer = fixedCustomerId ? customer.data : undefined;

  return (
    <>
    <PageHeader
      crumbs={[
        { title: 'طلبات الخدمة', to: '/service-requests' },
        ...(fixedCustomer ? [{ title: fixedCustomer.name, to: `/customers/${fixedCustomer.id}` }] : []),
        { title: 'طلب جديد' },
      ]}
      title="طلب خدمة جديد"
      subtitle={fixedCustomer ? `للعميل ${fixedCustomer.name} — ${fixedCustomer.phone}` : 'حجز زيارة من المكتب، مع إمكانية تسجيل عميل جديد في نفس الخطوة'}
    />
    <Card style={{ maxWidth: 860 }}>
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={create.mutate}
        initialValues={{ customerMode: 'existing', priority: 'NORMAL', customerId: fixedCustomerId }}
      >
        {!fixedCustomerId && (
          <Form.Item name="customerMode">
            <Radio.Group optionType="button" options={[
              { value: 'existing', label: 'عميل مسجل' },
              { value: 'new', label: 'عميل جديد' },
            ]} />
          </Form.Item>
        )}

        {mode === 'existing' ? (
          <>
            {!fixedCustomerId && (
              <Form.Item name="customerId" label="العميل" rules={[{ required: true, message: 'اختر العميل' }]}>
                <Select
                  showSearch={{ filterOption: false, onSearch: setSearch }}
                  placeholder="ابحث بالاسم أو رقم الموبايل"
                  loading={customers.isFetching}
                  onChange={() => form.setFieldsValue({ addressId: undefined, deviceId: undefined })}
                  options={customers.data?.map((c) => ({ value: c.id, label: `${c.name} — ${c.phone}` }))}
                />
              </Form.Item>
            )}
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="addressId" label="عنوان الزيارة" rules={[{ required: true, message: 'اختر العنوان' }]}>
                  <Select
                    disabled={!customer.data}
                    loading={customer.isFetching}
                    options={customer.data?.addresses.map((a) => ({ value: a.id, label: fmtAddress(a) }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="deviceId" label="الجهاز">
                  <Select
                    allowClear
                    disabled={!customer.data}
                    placeholder="اختياري"
                    options={customer.data?.devices.map((d) => ({
                      value: d.id,
                      label: `${d.product?.nameAr ?? d.modelName}${d.serialNumber ? ` — ${d.serialNumber}` : ''}`,
                    }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        ) : (
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name={['newCustomer', 'name']} label="اسم العميل" rules={[{ required: true, message: 'مطلوب' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['newCustomer', 'phone']} label="الموبايل"
                rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}>
                <Input dir="ltr" placeholder="01xxxxxxxxx" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name={['newCustomer', 'governorate']} label="المحافظة" rules={[{ required: true, message: 'مطلوب' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name={['newCustomer', 'city']} label="المدينة / الحي" rules={[{ required: true, message: 'مطلوب' }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name={['newCustomer', 'area']} label="المنطقة"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['newCustomer', 'street']} label="الشارع ورقم العقار"><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name={['newCustomer', 'details']} label="علامة مميزة / تفاصيل"><Input /></Form.Item>
            </Col>
          </Row>
        )}

        <Divider />
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="kind" label="نوع الخدمة" rules={[{ required: true, message: 'اختر نوع الخدمة' }]}>
              <Select options={options(SERVICE_KIND)} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="serviceFee" label="رسوم الزيارة"
              extra={defaultFee != null ? `سيبها فاضية عشان تتحسب من الأسعار (${defaultFee} ج.م). اكتب ٠ لو الزيارة في الضمان.` : 'اختر نوع الخدمة الأول'}>
              <InputNumber min={0} max={100000} placeholder={defaultFee != null ? String(defaultFee) : ''} suffix="ج.م" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="priority" label="الأولوية">
              <Radio.Group optionType="button" options={options(PRIORITY)} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="preferredDate" label="اليوم المفضل">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="preferredSlot" label="الفترة">
              <Select allowClear options={SLOTS.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="scheduledAt" label="موعد مؤكد (اختياري)">
              <DatePicker showTime={{ format: 'h:mm A', minuteStep: 15 }} format="D MMM h:mm A" style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="description" label="وصف المشكلة / ملاحظات">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Flex gap={8}>
          <Button type="primary" htmlType="submit" loading={create.isPending}>إنشاء الطلب</Button>
          <Button onClick={() => navigate(-1)}>إلغاء</Button>
        </Flex>
      </Form>
    </Card>
    </>
  );
}
