import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Flex, Form, Input, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { AddressFields } from './AddressFields';
import type { CustomerDetail } from './types';

/** /customers/:id/addresses/new and /customers/:id/addresses/:addressId/edit */
export function AddressFormPage() {
  const params = useParams();
  const customerId = Number(params.id);
  const addressId = params.addressId ? Number(params.addressId) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const back = `/customers/${customerId}?tab=addresses`;

  const { data: c, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${customerId}`)).data,
  });
  const editing = addressId != null ? c?.addresses.find((a) => a.id === addressId) : undefined;

  const save = useMutation({
    mutationFn: (v: object) => addressId != null
      ? api.put(`/customers/${customerId}/addresses/${addressId}`, v)
      : api.post(`/customers/${customerId}/addresses`, v),
    onSuccess: () => {
      message.success(addressId != null ? 'تم تحديث العنوان (العنوان السابق محفوظ في السجل)' : 'تم إضافة العنوان');
      qc.invalidateQueries({ queryKey: ['customer', customerId] });
      navigate(back, { replace: true });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !c) return <Card><Skeleton active /></Card>;
  if (addressId != null && !editing) {
    return <Card><Alert type="warning" showIcon title="العنوان غير موجود أو تم أرشفته" /></Card>;
  }
  const title = editing ? 'تعديل العنوان' : 'عنوان جديد';

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'العملاء', to: '/customers' }, { title: c.name, to: back }, { title }]}
        title={title}
        subtitle={c.name}
      />
      <Card style={{ maxWidth: 860 }}>
        {editing && (
          <Alert type="info" showIcon style={{ marginBottom: 16 }}
            title="التعديل بيحفظ العنوان القديم في السجل، والزيارات المفتوحة على العنوان ده بتتنقل للعنوان الجديد." />
        )}
        <Form
          form={form}
          layout="vertical"
          onFinish={save.mutate}
          initialValues={editing ? {
            ...editing,
            label: editing.label ?? undefined,
            latitude: editing.latitude != null ? Number(editing.latitude) : null,
            longitude: editing.longitude != null ? Number(editing.longitude) : null,
          } : undefined}
        >
          <Form.Item name="label" label="اسم العنوان"><Input placeholder="المنزل، العمل…" /></Form.Item>
          <AddressFields />
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
