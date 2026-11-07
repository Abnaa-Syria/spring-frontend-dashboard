import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Empty, Flex, Form, Input, Row, Select, Skeleton, Switch, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
import { PHONE_RULE } from '../../lib/validation';

interface Role { id: number; code: string; nameAr: string }
interface StaffUser {
  id: number; name: string; username: string; phone: string | null; isActive: boolean;
  lastLoginAt: string | null; roles: { id: number; code: string; nameAr: string }[];
}

/** /settings/users/new and /settings/users/:id/edit */
export function UserFormPage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [form] = Form.useForm();

  const roles = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get<Role[]>('/roles')).data });
  // There is no single-user endpoint; the staff list is small, so pick from it.
  const users = useQuery({
    queryKey: ['users'],
    queryFn: async () => (await api.get<StaffUser[]>('/users')).data,
    enabled: editId != null,
  });
  const existing = editId != null ? users.data?.find((u) => u.id === editId) : undefined;
  const isSelf = existing?.id === me?.id;

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      if (!v.password) delete v.password;
      return editId ? api.patch(`/users/${editId}`, v) : api.post('/users', v);
    },
    onSuccess: () => {
      message.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['users'] });
      navigate('/settings?tab=users');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (roles.isLoading || (editId != null && users.isLoading)) return <Card><Skeleton active /></Card>;
  if (editId != null && !existing) return <Card><Empty description="المستخدم غير موجود" /></Card>;

  const crumbs = [
    { title: 'الإعدادات', to: '/settings' },
    { title: 'المستخدمين', to: '/settings?tab=users' },
    { title: existing ? existing.name : 'مستخدم جديد' },
  ];

  return (
    <>
      <PageHeader
        crumbs={crumbs}
        title={existing ? `تعديل: ${existing.name}` : 'مستخدم جديد'}
        subtitle={existing ? `آخر دخول: ${fmtDateTime(existing.lastLoginAt)}` : 'حساب موظف للدخول على لوحة التحكم'}
      />
      <Card style={{ maxWidth: 860 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={save.mutate}
          initialValues={existing
            ? { name: existing.name, phone: existing.phone ?? undefined, roleIds: existing.roles.map((r) => r.id), isActive: existing.isActive }
            : undefined}
        >
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="الموبايل" rules={[PHONE_RULE]}><Input dir="ltr" /></Form.Item>
            </Col>
            {existing ? (
              <Col xs={24} md={12}>
                <Form.Item label="اسم المستخدم"><Input dir="ltr" value={existing.username} disabled /></Form.Item>
              </Col>
            ) : (
              <Col xs={24} md={12}>
                <Form.Item name="username" label="اسم المستخدم" rules={[
                  { required: true, message: 'مطلوب' },
                  { pattern: /^[a-zA-Z0-9_.]{3,32}$/, message: 'حروف إنجليزية وأرقام فقط' },
                ]}>
                  <Input dir="ltr" autoComplete="off" />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} md={12}>
              <Form.Item
                name="password"
                label={existing ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
                rules={[{ required: !existing, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            </Col>
            {!isSelf ? (
              <Col span={24}>
                <Form.Item name="roleIds" label="الأدوار" rules={[{ required: true, message: 'اختر دوراً واحداً على الأقل' }]}>
                  <Select mode="multiple" options={(roles.data ?? []).map((r) => ({ value: r.id, label: r.nameAr }))} />
                </Form.Item>
              </Col>
            ) : (
              <Col span={24}>
                <Typography.Paragraph type="secondary">مينفعش تغيّر أدوارك أو توقف حسابك بنفسك.</Typography.Paragraph>
              </Col>
            )}
            {existing && !isSelf && (
              <Col span={24}>
                <Form.Item name="isActive" label="الحساب مفعل" valuePropName="checked"><Switch /></Form.Item>
              </Col>
            )}
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
