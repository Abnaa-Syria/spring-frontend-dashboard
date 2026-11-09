import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Avatar, Button, Card, Col, Descriptions, Divider, Flex, Form, Input, InputNumber, Row, Skeleton, Tabs, Tag, Typography } from 'antd';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, tokenStore } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useTabParam } from '../../lib/useOpenParam';
import { LegalTab } from './LegalTab';
import { RolesTab, UsersTab } from './UsersTabs';

export function SettingsPage() {
  const { can } = useAuth();
  const [tab, setTab] = useTabParam('account');
  const items = [
    { key: 'account', label: 'حسابي', children: <AccountTab /> },
    ...(can('settings.write') ? [
      { key: 'system', label: 'إعدادات النظام', children: <SystemTab /> },
      { key: 'legal', label: 'الشروط وسياسة الخصوصية', children: <LegalTab /> },
    ] : []),
    ...(can('user.manage') ? [
      { key: 'users', label: 'المستخدمين', children: <UsersTab /> },
      { key: 'roles', label: 'الأدوار والصلاحيات', children: <RolesTab /> },
    ] : []),
  ];
  return (
    <>
      <PageHeader title="الإعدادات" subtitle="حسابك، إعدادات التشغيل، والمستخدمين" />
      <Card>
        <Tabs activeKey={items.some((i) => i.key === tab) ? tab : 'account'} onChange={setTab} items={items} />
      </Card>
    </>
  );
}

function AccountTab() {
  const { user } = useAuth();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const change = useMutation({
    mutationFn: (v: { currentPassword: string; newPassword: string }) =>
      api.post('/auth/change-password', { ...v, refreshToken: tokenStore.get()?.refreshToken }),
    onSuccess: () => {
      message.success('تم تغيير كلمة المرور، وتم تسجيل الخروج من باقي الأجهزة');
      form.resetFields();
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  if (!user) return null;

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={10}>
        <Flex gap={16} align="center" style={{ marginBottom: 16 }}>
          <Avatar size={56} icon={<UserOutlined />} style={{ background: '#E8EFFA', color: '#2E508F' }} />
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>{user.name}</Typography.Title>
            <Flex gap={4} wrap>{user.roles.map((r) => <Tag key={r.code} color="blue">{r.nameAr}</Tag>)}</Flex>
          </div>
        </Flex>
        <Descriptions column={1} size="small" bordered>
          <Descriptions.Item label="اسم المستخدم"><bdi dir="ltr">{user.username ?? '—'}</bdi></Descriptions.Item>
          <Descriptions.Item label="عدد الصلاحيات">{user.permissions.length}</Descriptions.Item>
        </Descriptions>
      </Col>
      <Col xs={24} lg={14}>
        <Typography.Title level={5} style={{ marginTop: 0 }}><LockOutlined /> تغيير كلمة المرور</Typography.Title>
        <Form form={form} layout="vertical" onFinish={change.mutate} style={{ maxWidth: 420 }} requiredMark={false}>
          <Form.Item name="currentPassword" label="كلمة المرور الحالية" rules={[{ required: true, message: 'مطلوب' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Form.Item name="newPassword" label="كلمة المرور الجديدة" rules={[{ required: true, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirm"
            label="تأكيد كلمة المرور الجديدة"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'مطلوب' },
              ({ getFieldValue }) => ({
                validator: (_, v) => (!v || v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('غير مطابقة'))),
              }),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={change.isPending}>حفظ كلمة المرور</Button>
        </Form>
      </Col>
    </Row>
  );
}

type SettingsValues = Record<string, number | string>;

function SystemTab() {
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<SettingsValues>('/settings')).data,
  });
  const save = useMutation({
    mutationFn: (v: SettingsValues) => api.put('/settings', v),
    onSuccess: ({ data: d }) => {
      message.success('تم حفظ الإعدادات');
      qc.setQueryData(['settings'], d);
    },
    onError: (e) => message.error(errorMessage(e)),
  });
  if (isLoading || !data) return <Skeleton active />;

  // antd treats dots in names as paths, so map to nested-safe field names.
  const toForm = (d: SettingsValues) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k.replace('.', '__'), v]));
  const fromForm = (v: SettingsValues) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace('__', '.'), x ?? '']));

  return (
    <Form form={form} layout="vertical" initialValues={toForm(data)} onFinish={(v) => save.mutate(fromForm(v))} style={{ maxWidth: 720 }}>
      <Divider titlePlacement="start" style={{ marginTop: 0 }}>الصيانة الدورية</Divider>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="maintenance__intervalDays" label="الفترة بين الصيانات (يوم)" extra="تُستخدم لحساب موعد الصيانة القادمة بعد كل زيارة" rules={[{ required: true, message: 'مطلوب' }]}>
            <InputNumber min={7} max={730} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="maintenance__reminderDays" label="تذكير العميل قبلها بـ (يوم)" extra="رسالة تذكير تلقائية للعميل قبل موعد الصيانة" rules={[{ required: true, message: 'مطلوب' }]}>
            <InputNumber min={1} max={60} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Divider titlePlacement="start">بيانات الشركة والتواصل (تظهر في التطبيقين والفواتير والصفحات القانونية)</Divider>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="company__name" label="اسم الشركة"><Input maxLength={120} /></Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="company__supportPhone" label="رقم خدمة العملاء"><Input dir="ltr" placeholder="19xxx" /></Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="company__whatsapp" label="رقم واتساب"><Input dir="ltr" placeholder="+2010xxxxxxxx" /></Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="company__email" label="البريد الإلكتروني للدعم" rules={[{ type: 'email', message: 'بريد غير صحيح' }]}><Input dir="ltr" placeholder="support@example.com" /></Form.Item>
        </Col>
      </Row>
      <Divider titlePlacement="start">المخزون</Divider>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item name="inventory__lowStockThreshold" label="حد التنبيه بنقص المخزون" extra="الأصناف اللي كميتها في المخزن الرئيسي أقل من أو تساوي الرقم ده تظهر في 'محتاج إجراء'">
            <InputNumber min={0} max={1000} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
      </Row>
      <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ الإعدادات</Button>
    </Form>
  );
}
