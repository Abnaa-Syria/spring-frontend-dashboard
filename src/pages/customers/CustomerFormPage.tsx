import { LogoutOutlined, MobileOutlined, StopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, Button, Card, Col, Descriptions, Divider, Flex, Form, Input, Popconfirm, Row, Skeleton, Tag, Typography,
} from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
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

  const dataCard = (
    <Card title="بيانات العميل">
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={save.mutate}
        initialValues={existing ? { name: existing.name, phone: existing.phone, altPhone: existing.altPhone ?? undefined } : undefined}
      >
        <Row gutter={16}>
          <Col xs={24} md={12} xl={8}>
            <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
          </Col>
          <Col xs={24} md={12} xl={8}>
            <Form.Item
              name="phone"
              label="الموبايل"
              rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}
              extra={existing?.appAccount ? 'ده كمان رقم دخول العميل على التطبيق؛ لو اتغيّر هيدخل بالرقم الجديد' : undefined}
            >
              <Input dir="ltr" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12} xl={8}>
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
  );

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
      {existing ? (
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>{dataCard}</Col>
          <Col xs={24} xl={8}><AppAccountCard customer={existing} /></Col>
        </Row>
      ) : dataCard}
    </>
  );
}

/** The customer's app login: status, last sign-in, suspend / re-activate, sign out of every device. */
function AppAccountCard({ customer }: { customer: CustomerDetail }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const acc = customer.appAccount;
  const onDone = (msg: string) => ({
    onSuccess: ({ data }: { data: CustomerDetail }) => { message.success(msg); qc.setQueryData(['customer', customer.id], data); },
    onError: (e: unknown) => message.error(errorMessage(e)),
  });
  const status = useMutation({
    mutationFn: (active: boolean) => api.post<CustomerDetail>(`/customers/${customer.id}/app-account/status`, { active }),
    ...onDone('تم تحديث حالة الحساب'),
  });
  const signOut = useMutation({
    mutationFn: () => api.post<CustomerDetail>(`/customers/${customer.id}/app-account/sign-out`),
    ...onDone('تم تسجيل خروج العميل من كل الأجهزة'),
  });

  return (
    <Card title={<><MobileOutlined /> حساب التطبيق</>}>
      {!acc ? (
        <Alert
          type="info"
          showIcon
          title="العميل لسه معملش حساب على التطبيق"
          description={<>أول ما يسجّل في التطبيق بالرقم <bdi dir="ltr">{customer.phone}</bdi> حسابه هيترِبط تلقائياً بالبيانات دي وهيشوف أجهزته وطلباته.</>}
        />
      ) : (
        <Flex vertical gap={16}>
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="الحالة">
              {acc.isActive ? <Tag color="green">مفعّل</Tag> : <Tag color="red">موقوف</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="رقم الدخول"><bdi dir="ltr">{acc.phone ?? '—'}</bdi></Descriptions.Item>
            <Descriptions.Item label="عمل الحساب">{fmtDateTime(acc.createdAt)}</Descriptions.Item>
            <Descriptions.Item label="آخر دخول">{fmtDateTime(acc.lastLoginAt)}</Descriptions.Item>
            <Descriptions.Item label="أجهزة مسجّل عليها">{acc.activeSessions}</Descriptions.Item>
          </Descriptions>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            العميل بيدخل التطبيق برمز بيوصله في رسالة على موبايله.
          </Typography.Text>
          {can('customer.write') && (
            <Flex gap={8} wrap>
              {acc.isActive ? (
                <Popconfirm
                  title="إيقاف حساب التطبيق؟"
                  description="العميل هيتسجّل خروجه ومش هيقدر يدخل لحد ما تفعّله تاني"
                  okText="إيقاف" cancelText="رجوع" okButtonProps={{ danger: true }}
                  onConfirm={() => status.mutate(false)}
                >
                  <Button danger icon={<StopOutlined />} loading={status.isPending}>إيقاف الحساب</Button>
                </Popconfirm>
              ) : (
                <Button type="primary" icon={<CheckCircleOutlined />} loading={status.isPending} onClick={() => status.mutate(true)}>تفعيل الحساب</Button>
              )}
              <Popconfirm
                title="تسجيل خروج من كل الأجهزة؟"
                description="مفيد لو العميل ضاع منه الموبايل؛ هيدخل تاني برمز جديد"
                okText="تسجيل خروج" cancelText="رجوع"
                onConfirm={() => signOut.mutate()}
              >
                <Button icon={<LogoutOutlined />} disabled={acc.activeSessions === 0} loading={signOut.isPending}>تسجيل خروج من كل الأجهزة</Button>
              </Popconfirm>
            </Flex>
          )}
        </Flex>
      )}
    </Card>
  );
}
