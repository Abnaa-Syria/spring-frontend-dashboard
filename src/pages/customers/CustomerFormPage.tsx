import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Divider, Flex, Form, Input, Row, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { PHONE_RULE } from '../../lib/validation';
import { AddressFields } from './AddressFields';
import type { CustomerDetail } from './types';

interface Values { name: string; phone: string; altPhone?: string; address?: object }

/** New customer (/customers/new) or edit basic data (/customers/:id/edit). */
export function CustomerFormPage() {
  const params = useParams();
  const id = params.id ? Number(params.id) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm<Values>();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${id}`)).data,
    enabled: id != null,
  });

  const save = useMutation({
    mutationFn: async (v: Values) => id != null
      ? (await api.patch<CustomerDetail>(`/customers/${id}`, { name: v.name, phone: v.phone, altPhone: v.altPhone || undefined })).data
      : (await api.post<CustomerDetail>('/customers', v)).data,
    onSuccess: (c) => {
      message.success(id != null ? 'تم تحديث بيانات العميل' : 'تم إضافة العميل');
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer', c.id] });
      navigate(`/customers/${c.id}`, { replace: true });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (id != null && (isLoading || !existing)) return <Card><Skeleton active /></Card>;
  const title = existing ? `تعديل بيانات ${existing.name}` : 'عميل جديد';

  return (
    <>
      <PageHeader
        crumbs={[
          { title: 'العملاء', to: '/customers' },
          ...(existing ? [{ title: existing.name, to: `/customers/${existing.id}` }] : []),
          { title: existing ? 'تعديل' : 'عميل جديد' },
        ]}
        title={title}
      />
      <Card style={{ maxWidth: 860 }}>
        <Form<Values>
          form={form}
          layout="vertical"
          onFinish={save.mutate}
          initialValues={existing ? { name: existing.name, phone: existing.phone, altPhone: existing.altPhone ?? undefined } : undefined}
        >
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="phone" label="الموبايل" rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}>
                <Input dir="ltr" />
              </Form.Item>
            </Col>
            <Col xs={12} md={8}>
              <Form.Item name="altPhone" label="موبايل آخر" rules={[PHONE_RULE]}><Input dir="ltr" /></Form.Item>
            </Col>
          </Row>
          {id == null && (
            <>
              <Divider titlePlacement="start">العنوان</Divider>
              <AddressFields prefix="address" />
            </>
          )}
          <Flex gap={8} style={{ marginTop: 8 }}>
            <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
