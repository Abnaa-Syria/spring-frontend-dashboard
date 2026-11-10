import {
  CalendarOutlined, EditOutlined, EnvironmentOutlined, FileTextOutlined, MobileOutlined, PhoneOutlined, PlusOutlined,
  ShoppingCartOutlined, StarOutlined, ToolOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Col, Empty, Flex, Row, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import { useNavigate, useParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtAddress, fmtDate, fmtDateTime, fmtMoney, fmtNumber } from '../../lib/format';
import { ORDER_STATUS, PRIORITY, SERVICE_KIND, SERVICE_STATUS, type OrderStatus } from '../../lib/labels';
import { useTabParam } from '../../lib/useOpenParam';
import type { CustomerDetail } from './types';

const OPEN = ['PENDING', 'SCHEDULED', 'ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

function dueTag(date: string | null) {
  if (!date) return <Typography.Text type="secondary">—</Typography.Text>;
  const days = dayjs(date).startOf('day').diff(dayjs().startOf('day'), 'day');
  const color = days < 0 ? 'red' : days <= 7 ? 'orange' : 'default';
  const hint = days < 0 ? `متأخرة ${-days} يوم` : days === 0 ? 'اليوم' : `بعد ${days} يوم`;
  return <Space size={4} wrap>{fmtDate(date)}<Tag color={color}>{hint}</Tag></Space>;
}

export function CustomerDetailPage() {
  const id = Number(useParams().id);
  const { can } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useTabParam('devices');

  const { data: c, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => (await api.get<CustomerDetail>(`/customers/${id}`)).data,
  });

  if (isLoading || !c) return <Card><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>;
  const editable = can('customer.write');
  const openRequests = c.serviceRequests.filter((r) => OPEN.includes(r.status)).length;
  const spent = c.invoices.filter((i) => i.status === 'ISSUED').reduce((s, i) => s + Number(i.total), 0);
  const nextDue = c.devices.filter((d) => d.status === 'ACTIVE' && d.nextMaintenanceAt).map((d) => d.nextMaintenanceAt!).sort()[0] ?? null;
  const defaultAddress = c.addresses.find((a) => a.isDefault) ?? c.addresses[0];

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'العملاء', to: '/customers' }, { title: c.name }]}
        title={c.name}
        actions={<>
          {editable && <Button icon={<EditOutlined />} onClick={() => navigate(`/customers/${id}/edit`)}>تعديل البيانات</Button>}
          {can('service.write') && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate(`/service-requests/new?customerId=${id}`)}>طلب خدمة</Button>
          )}
        </>}
      />

      <Card style={{ marginBottom: 16 }}>
        <Flex gap={20} wrap align="center">
          <Avatar size={64} style={{ background: 'var(--tone-blue-bg)', color: 'var(--tone-blue-fg)', fontSize: 26, fontWeight: 800 }}>
            {c.name.trim().charAt(0)}
          </Avatar>
          <Flex vertical gap={6} style={{ flex: 1, minWidth: 240 }}>
            <Flex gap={8} wrap align="center">
              <Typography.Text strong style={{ fontSize: 16 }}>بيانات العميل</Typography.Text>
              {c.userId ? <Tag color="green" icon={<MobileOutlined />}>مسجل في التطبيق</Tag> : <Tag>غير مسجل في التطبيق</Tag>}
              {c.legacyCustomerId && <Tag>النظام القديم: {c.legacyCustomerId}</Tag>}
            </Flex>
            <Flex gap={20} wrap style={{ color: 'var(--c-muted)' }}>
              <span><PhoneOutlined /> <bdi dir="ltr">{c.phone}</bdi>{c.altPhone && <> · <bdi dir="ltr">{c.altPhone}</bdi></>}</span>
              {defaultAddress && <span><EnvironmentOutlined /> {fmtAddress(defaultAddress)}</span>}
              <span><CalendarOutlined /> عميل منذ {fmtDate(c.createdAt)}</span>
              {c.nationalIdLast4 && <span>الرقم القومي •••• {c.nationalIdLast4}</span>}
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <StatCard tone="blue" icon={<ToolOutlined />} label="طلبات مفتوحة" value={fmtNumber(openRequests)} hint={`من ${fmtNumber(c.serviceRequests.length)} طلب`} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard tone="teal" icon={<CalendarOutlined />} label="الصيانة القادمة" value={<span style={{ fontSize: 18 }}>{nextDue ? fmtDate(nextDue) : '—'}</span>} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard tone="green" icon={<FileTextOutlined />} label="إجمالي المشتريات" value={<span style={{ fontSize: 20 }}>{fmtMoney(spent)}</span>} hint={`${fmtNumber(c.invoices.length)} فاتورة`} />
        </Col>
        <Col xs={12} lg={6}>
          <StatCard tone="orange" icon={<StarOutlined />} label="نقاط الولاء" value={fmtNumber(c.loyaltyPoints)} />
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          tabBarExtraContent={
            tab === 'devices' && editable ? <Button size="small" icon={<PlusOutlined />} onClick={() => navigate(`/customers/${id}/devices/new`)}>إضافة جهاز</Button>
              : tab === 'addresses' && editable ? <Button size="small" icon={<PlusOutlined />} onClick={() => navigate(`/customers/${id}/addresses/new`)}>إضافة عنوان</Button>
                : null
          }
          items={[
            {
              key: 'devices',
              label: <Space size={6}>الأجهزة<Badge count={c.devices.length} color="var(--c-badge-muted)" size="small" /></Space>,
              children: (
                <Table
                  rowKey="id"
                  pagination={false}
                  dataSource={c.devices}
                  scroll={{ x: 760 }}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد أجهزة" /> }}
                  expandable={{
                    rowExpandable: (d) => d.cartridges.length > 0,
                    expandedRowRender: (d) => (
                      <Flex gap={8} wrap>
                        {d.cartridges.map((k) => (
                          <Card key={k.id} size="small" style={{ minWidth: 180 }}>
                            <Typography.Text strong>المرحلة {k.stage}</Typography.Text>
                            <div style={{ fontSize: 13 }}>{k.product?.nameAr ?? 'شمعة'}</div>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>رُكبت {fmtDate(k.installedAt)}</Typography.Text>
                            <div style={{ marginTop: 4 }}>{dueTag(k.nextDueAt)}</div>
                          </Card>
                        ))}
                      </Flex>
                    ),
                  }}
                  columns={[
                    {
                      title: 'الجهاز',
                      render: (_, d) => (
                        <>
                          <Typography.Text strong>{d.product?.nameAr ?? d.modelName}</Typography.Text>
                          {d.product && <div><Typography.Text type="secondary" style={{ fontSize: 12 }}>{d.product.sku}</Typography.Text></div>}
                        </>
                      ),
                    },
                    { title: 'الرقم التسلسلي', dataIndex: 'serialNumber', render: (v) => (v ? <bdi dir="ltr">{v}</bdi> : '—') },
                    {
                      title: 'مكان التركيب',
                      render: (_, d) => {
                        const a = c.addresses.find((x) => x.id === d.addressId);
                        return a ? (a.label ?? [a.area, a.city].filter(Boolean).join('، ')) : '—';
                      },
                    },
                    { title: 'التركيب', dataIndex: 'installedAt', render: fmtDate },
                    { title: 'الشمعات', render: (_, d) => d.cartridges.length || '—' },
                    {
                      title: 'الصيانة القادمة',
                      render: (_, d) => (d.status === 'ACTIVE' ? dueTag(d.nextMaintenanceAt) : <Tag>{d.status === 'REPLACED' ? 'مستبدل' : 'غير نشط'}</Tag>),
                    },
                  ]}
                />
              ),
            },
            {
              key: 'requests',
              label: <Space size={6}>طلبات الخدمة<Badge count={openRequests} size="small" /></Space>,
              children: (
                <Table
                  rowKey="id"
                  dataSource={c.serviceRequests}
                  pagination={false}
                  scroll={{ x: 760 }}
                  rowClassName="clickable"
                  onRow={(r) => ({ onClick: () => navigate(`/service-requests/${r.id}`) })}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد طلبات" /> }}
                  columns={[
                    { title: 'الرقم', dataIndex: 'number' },
                    { title: 'النوع', render: (_, r) => SERVICE_KIND[r.kind].label },
                    { title: 'الأولوية', render: (_, r) => <EnumTag map={PRIORITY} value={r.priority} /> },
                    { title: 'الموعد', dataIndex: 'scheduledAt', render: fmtDateTime },
                    { title: 'الفني', render: (_, r) => r.technician?.user.name ?? '—' },
                    { title: 'الحالة', render: (_, r) => <EnumTag map={SERVICE_STATUS} value={r.status} /> },
                  ]}
                />
              ),
            },
            ...(can('order.read') ? [{
              key: 'orders',
              label: <Space size={6}><ShoppingCartOutlined />طلبات المتجر</Space>,
              children: (
                <Table
                  rowKey="id"
                  dataSource={c.orders}
                  pagination={false}
                  rowClassName="clickable"
                  onRow={(o) => ({ onClick: () => navigate(`/orders/${o.id}`) })}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد طلبات شراء" /> }}
                  columns={[
                    { title: 'الرقم', dataIndex: 'number' },
                    { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
                    { title: 'الإجمالي', dataIndex: 'total', render: fmtMoney },
                    {
                      title: 'الحالة',
                      dataIndex: 'status',
                      render: (v: OrderStatus) => <Tag color={ORDER_STATUS[v]?.color}>{ORDER_STATUS[v]?.label ?? v}</Tag>,
                    },
                  ]}
                />
              ),
            }] : []),
            ...(can('invoice.read') ? [{
              key: 'invoices',
              label: 'الفواتير',
              children: (
                <Table
                  rowKey="id"
                  dataSource={c.invoices}
                  pagination={false}
                  rowClassName="clickable"
                  onRow={(i) => ({ onClick: () => navigate(`/invoices/${i.id}`) })}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد فواتير" /> }}
                  columns={[
                    { title: 'الرقم', dataIndex: 'number' },
                    { title: 'التاريخ', dataIndex: 'issuedAt', render: fmtDateTime },
                    { title: 'المصدر', render: (_, i) => (i.orderId ? 'طلب متجر' : i.serviceRequestId ? 'زيارة' : '—') },
                    { title: 'الإجمالي', dataIndex: 'total', render: fmtMoney },
                    { title: 'الحالة', render: (_, i) => (i.status === 'VOID' ? <Tag color="red">ملغاة</Tag> : <Tag color="green">صادرة</Tag>) },
                  ]}
                />
              ),
            }] : []),
            {
              key: 'addresses',
              label: <Space size={6}>العناوين<Badge count={c.addresses.length} color="var(--c-badge-muted)" size="small" /></Space>,
              children: c.addresses.length === 0 ? <Empty description="لا توجد عناوين" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
                <Row gutter={[12, 12]}>
                  {c.addresses.map((a) => (
                    <Col key={a.id} xs={24} md={12} xl={8}>
                      <Card
                        size="small"
                        style={{ height: '100%' }}
                        title={<Space><EnvironmentOutlined />{a.label ?? 'عنوان'}{a.isDefault && <Tag color="blue">افتراضي</Tag>}</Space>}
                        extra={editable && (
                          <Button size="small" type="text" icon={<EditOutlined />} aria-label="تعديل العنوان"
                            onClick={() => navigate(`/customers/${id}/addresses/${a.id}/edit`)} />
                        )}
                      >
                        <div>{fmtAddress(a)}</div>
                        {(a.floor || a.apartment) && (
                          <Typography.Text type="secondary">
                            {a.floor && `الدور ${a.floor}`}{a.floor && a.apartment && ' · '}{a.apartment && `شقة ${a.apartment}`}
                          </Typography.Text>
                        )}
                        {a.details && <div><Typography.Text type="secondary">{a.details}</Typography.Text></div>}
                      </Card>
                    </Col>
                  ))}
                </Row>
              ),
            },
          ]}
        />
      </Card>

    </>
  );
}
