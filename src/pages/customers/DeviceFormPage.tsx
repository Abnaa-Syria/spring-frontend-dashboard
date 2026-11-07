import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, DatePicker, Flex, Form, Input, Row, Select, Skeleton } from 'antd';
import type { Dayjs } from 'dayjs';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { fmtAddress } from '../../lib/format';
import type { ProductRow } from '../products/types';
import type { CustomerDetail } from './types';

interface Values {
  productId?: number; modelName?: string; serialNumber?: string; addressId?: number;
  installedAt?: Dayjs; nextMaintenanceAt?: Dayjs;
}

/** /customers/:id/devices/new */
export function DeviceFormPage() {
  const customerId = Number(useParams().id);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm<Values>();
  const [search, setSearch] = useState('');
  const back = `/customers/${customerId}?tab=devices`;

  const { data: c, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${customerId}`)).data,
  });
  const products = useQuery({
    queryKey: ['products', 'lookup', 'DEVICE', search],
    queryFn: async () =>
      (await api.get<Page<ProductRow>>('/products', { params: { type: 'DEVICE', search: search || undefined, pageSize: 20 } })).data.items,
  });

  const save = useMutation({
    mutationFn: (v: Values) =>
      api.post(`/customers/${customerId}/devices`, {
        ...v,
        installedAt: v.installedAt?.format('YYYY-MM-DD'),
        nextMaintenanceAt: v.nextMaintenanceAt?.format('YYYY-MM-DD'),
      }),
    onSuccess: () => {
      message.success('تم إضافة الجهاز');
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      navigate(back, { replace: true });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !c) return <Card><Skeleton active /></Card>;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'العملاء', to: '/customers' }, { title: c.name, to: back }, { title: 'إضافة جهاز' }]}
        title="إضافة جهاز للعميل"
        subtitle={c.name}
      />
      <Card style={{ maxWidth: 860 }}>
        <Form<Values> form={form} layout="vertical" onFinish={save.mutate}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="productId" label="المنتج">
                <Select
                  allowClear
                  showSearch={{ filterOption: false, onSearch: setSearch }}
                  placeholder="اختر من المنتجات"
                  loading={products.isFetching}
                  options={products.data?.map((p) => ({ value: p.id, label: `${p.nameAr} (${p.sku})` }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="modelName"
                label="اسم الموديل"
                extra="مطلوب لو الجهاز مش موجود في قائمة المنتجات"
                dependencies={['productId']}
                rules={[({ getFieldValue }) => ({
                  validator: (_, v) => (getFieldValue('productId') || v?.trim() ? Promise.resolve() : Promise.reject(new Error('اختر منتج أو اكتب اسم الموديل'))),
                })]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="serialNumber" label="الرقم التسلسلي"><Input dir="ltr" /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="addressId" label="مكان التركيب">
                <Select allowClear options={c.addresses.map((a) => ({ value: a.id, label: fmtAddress(a) }))} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="installedAt" label="تاريخ التركيب"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="nextMaintenanceAt" label="الصيانة القادمة"><DatePicker style={{ width: '100%' }} /></Form.Item>
            </Col>
          </Row>
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
