import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Flex, Row, Skeleton, Space, Table, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime } from '../../lib/format';

interface Role { id: number; code: string; nameAr: string; permissions: string[] }
interface StaffUser {
  id: number; name: string; username: string; phone: string | null; isActive: boolean;
  lastLoginAt: string | null; roles: { id: number; code: string; nameAr: string }[];
}

/** Arabic names for permission codes, grouped by area. */
const PERMISSION_GROUPS: { title: string; items: Record<string, string> }[] = [
  { title: 'العملاء', items: { 'customer.read': 'عرض', 'customer.write': 'إضافة وتعديل' } },
  { title: 'طلبات الخدمة', items: { 'service.read': 'عرض', 'service.write': 'إنشاء وتعديل', 'service.assign': 'توزيع على الفنيين' } },
  { title: 'الفنيين', items: { 'technician.read': 'عرض', 'technician.write': 'إضافة وتعديل' } },
  { title: 'المنتجات', items: { 'product.read': 'عرض', 'product.write': 'إضافة وتعديل' } },
  { title: 'طلبات المتجر', items: { 'order.read': 'عرض', 'order.write': 'تجهيز وتوصيل' } },
  { title: 'المخزون', items: { 'inventory.read': 'عرض', 'inventory.write': 'حركات', 'inventory.approve': 'اعتماد' } },
  { title: 'العهدة النقدية', items: { 'custody.read': 'عرض', 'custody.approve': 'اعتماد التوريد' } },
  { title: 'الفواتير والمدفوعات', items: { 'invoice.read': 'عرض الفواتير', 'invoice.void': 'إلغاء فاتورة', 'payment.read': 'عرض المدفوعات', 'payment.verify': 'تأكيد التحويلات' } },
  { title: 'الترشيحات', items: { 'lead.read': 'عرض', 'lead.write': 'متابعة' } },
  { title: 'الإدارة', items: { 'report.read': 'التقارير', 'settings.write': 'إعدادات النظام', 'user.manage': 'المستخدمين والأدوار' } },
];

export function UsersTab() {
  const users = useQuery({ queryKey: ['users'], queryFn: async () => (await api.get<StaffUser[]>('/users')).data });
  const navigate = useNavigate();
  const { user: me } = useAuth();

  return (
    <>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Text type="secondary">موظفو الإدارة اللي بيدخلوا لوحة التحكم. حسابات الفنيين من صفحة الفنيين.</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/settings/users/new')}>مستخدم جديد</Button>
      </Flex>
      <Table<StaffUser>
        rowKey="id"
        loading={users.isFetching}
        dataSource={users.data}
        pagination={false}
        scroll={{ x: 700 }}
        columns={[
          { title: 'الاسم', dataIndex: 'name', render: (v, u) => <>{v}{u.id === me?.id && <Tag style={{ marginInlineStart: 6 }}>أنت</Tag>}</> },
          { title: 'اسم المستخدم', dataIndex: 'username', render: (v) => <span dir="ltr">{v}</span> },
          { title: 'الأدوار', render: (_, u) => <Space size={4} wrap>{u.roles.map((r) => <Tag key={r.id} color="blue">{r.nameAr}</Tag>)}</Space> },
          { title: 'آخر دخول', dataIndex: 'lastLoginAt', render: fmtDateTime },
          { title: 'الحالة', render: (_, u) => (u.isActive ? <Tag color="green">مفعل</Tag> : <Tag color="red">موقوف</Tag>) },
          { title: '', width: 90, render: (_, u) => <Button size="small" onClick={() => navigate(`/settings/users/${u.id}/edit`)}>تعديل</Button> },
        ]}
      />
    </>
  );
}

export function RolesTab() {
  const roles = useQuery({ queryKey: ['roles'], queryFn: async () => (await api.get<Role[]>('/roles')).data });
  if (roles.isLoading) return <Skeleton active />;
  return (
    <Row gutter={[16, 16]}>
      {roles.data?.map((r) => (
        <Col key={r.id} xs={24} lg={12}>
          <Card size="small" title={r.nameAr} extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{r.permissions.length} صلاحية</Typography.Text>} style={{ height: '100%' }}>
            <Flex vertical gap={6}>
              {PERMISSION_GROUPS.map((g) => {
                const have = Object.keys(g.items).filter((k) => r.permissions.includes(k));
                if (!have.length) return null;
                return (
                  <Flex key={g.title} gap={8} align="baseline" wrap>
                    <Typography.Text strong style={{ minWidth: 120 }}>{g.title}</Typography.Text>
                    <Space size={4} wrap>{have.map((k) => <Tag key={k}>{g.items[k]}</Tag>)}</Space>
                  </Flex>
                );
              })}
            </Flex>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
