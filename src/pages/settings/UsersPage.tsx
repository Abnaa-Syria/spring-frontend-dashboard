import { PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';
import { PHONE_RULE } from '../../lib/validation';

interface Role { id: number; code: string; nameAr: string; permissions: string[] }
interface StaffUser {
  id: number; name: string; username: string; phone: string | null; isActive: boolean;
  lastLoginAt: string | null; roles: { id: number; code: string; nameAr: string }[];
}

export function UsersPage() {
  const roles = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get<Role[]>('/roles')).data });
  const users = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<StaffUser[]>('/users')).data });
  const [editing, setEditing] = useState<StaffUser | 'new' | null>(null);
  const { user: me } = useAuth();

  return (
    <Card title={<Typography.Title level={4} style={{ margin: 0 }}>المستخدمين والصلاحيات</Typography.Title>}>
      <Tabs items={[
        {
          key: 'users',
          label: 'موظفو الإدارة',
          children: (
            <>
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')} style={{ marginBottom: 16 }}>
                مستخدم جديد
              </Button>
              <Table<StaffUser>
                rowKey="id"
                loading={users.isFetching}
                dataSource={users.data}
                pagination={false}
                scroll={{ x: 700 }}
                columns={[
                  { title: 'الاسم', dataIndex: 'name' },
                  { title: 'اسم المستخدم', dataIndex: 'username', render: (v) => <span dir="ltr">{v}</span> },
                  { title: 'الأدوار', render: (_, u) => <Space size={4} wrap>{u.roles.map((r) => <Tag key={r.id}>{r.nameAr}</Tag>)}</Space> },
                  { title: 'آخر دخول', dataIndex: 'lastLoginAt', render: fmtDateTime },
                  { title: 'الحالة', render: (_, u) => (u.isActive ? <Tag color="green">مفعل</Tag> : <Tag color="red">موقوف</Tag>) },
                  { title: '', render: (_, u) => <Button size="small" onClick={() => setEditing(u)}>تعديل</Button> },
                ]}
              />
            </>
          ),
        },
        {
          key: 'roles',
          label: 'الأدوار',
          children: (
            <Table<Role>
              rowKey="id"
              loading={roles.isFetching}
              dataSource={roles.data}
              pagination={false}
              columns={[
                { title: 'الدور', dataIndex: 'nameAr', width: 180 },
                { title: 'الصلاحيات', render: (_, r) => <Space size={4} wrap>{r.permissions.map((p) => <Tag key={p}>{p}</Tag>)}</Space> },
              ]}
            />
          ),
        },
      ]} />
      <UserModal user={editing} roles={roles.data ?? []} selfId={me?.id} onClose={() => setEditing(null)} />
    </Card>
  );
}

function UserModal({
  user, roles, selfId, onClose,
}: { user: StaffUser | 'new' | null; roles: Role[]; selfId?: number; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const existing = user && user !== 'new' ? user : null;
  const isSelf = existing?.id === selfId;

  const save = useMutation({
    mutationFn: (v: Record<string, unknown>) => {
      if (!v.password) delete v.password;
      return existing ? api.patch(`/users/${existing.id}`, v) : api.post('/users', v);
    },
    onSuccess: () => {
      message.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={!!user}
      title={existing ? `تعديل: ${existing.name}` : 'مستخدم جديد'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={save.isPending}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={save.mutate}
        initialValues={existing
          ? { name: existing.name, phone: existing.phone ?? undefined, roleIds: existing.roles.map((r) => r.id), isActive: existing.isActive }
          : undefined}
      >
        <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
        {!existing && (
          <Form.Item name="username" label="اسم المستخدم" rules={[
            { required: true, message: 'مطلوب' },
            { pattern: /^[a-zA-Z0-9_.]{3,32}$/, message: 'حروف إنجليزية وأرقام فقط' },
          ]}>
            <Input dir="ltr" autoComplete="off" />
          </Form.Item>
        )}
        <Form.Item name="phone" label="الموبايل" rules={[PHONE_RULE]}><Input dir="ltr" /></Form.Item>
        <Form.Item
          name="password"
          label={existing ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور'}
          rules={[{ required: !existing, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}
        >
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        {!isSelf && (
          <Form.Item name="roleIds" label="الأدوار" rules={[{ required: true, message: 'اختر دوراً واحداً على الأقل' }]}>
            <Select mode="multiple" options={roles.map((r) => ({ value: r.id, label: r.nameAr }))} />
          </Form.Item>
        )}
        {existing && !isSelf && (
          <Form.Item name="isActive" label="الحساب مفعل" valuePropName="checked"><Switch /></Form.Item>
        )}
      </Form>
    </Modal>
  );
}
