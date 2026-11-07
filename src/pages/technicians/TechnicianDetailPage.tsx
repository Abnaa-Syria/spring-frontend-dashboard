import {
  CheckCircleOutlined, DollarOutlined, EditOutlined, PhoneOutlined, RiseOutlined, StarOutlined, WalletOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Badge, Button, Card, Col, Empty, Flex, Row, Skeleton, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, fmtMoney, fmtNumber } from '../../lib/format';
import {
  HANDOVER_STATUS, PRIORITY, SERVICE_KIND, SERVICE_STATUS, SPECIALIZATION, type HandoverStatus, type ServiceKind,
  type ServicePriority, type ServiceStatus, type Specialization,
} from '../../lib/labels';
import { useTabParam } from '../../lib/useOpenParam';

interface Task {
  id: number; number: string; kind: ServiceKind; status: ServiceStatus; priority: ServicePriority;
  scheduledAt: string | null; completedAt: string | null; rating: number | null;
  customer: { id: number; name: string }; address: { city: string; area: string | null };
}
interface Overview {
  id: number; code: string; name: string; username: string; phone: string | null; isActive: boolean; isAvailable: boolean;
  serviceArea: string | null; specializations: Specialization[]; openTasks: number; createdAt: string;
  warehouseId: number | null;
  stats: {
    completed30: number; avgRating30: number | null; ratings30: number; revenue30: number; cashInHand: number;
    leads: Partial<Record<'NEW' | 'CONTACTED' | 'WON' | 'LOST', number>>;
  };
  open: Task[];
  recent: Task[];
  stock: { id: number; nameAr: string; sku: string; price: string; quantity: number }[];
  handovers: { id: number; amount: string; status: HandoverStatus; note: string | null; createdAt: string }[];
}

const stars = (n: number | null) => (n == null ? '—' : <span style={{ color: '#D97706' }} aria-label={`${n} من 5`}>{'★'.repeat(n)}<span style={{ color: '#D9E1EB' }}>{'★'.repeat(5 - n)}</span></span>);

export function TechnicianDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { can } = useAuth();
  const [tab, setTab] = useTabParam('open');
  const { data: t, isLoading } = useQuery({
    queryKey: ['technician-overview', id],
    queryFn: async () => (await api.get<Overview>(`/technicians/${id}/overview`)).data,
  });

  if (isLoading || !t) return <Card><Skeleton active avatar paragraph={{ rows: 6 }} /></Card>;

  const leadsTotal = Object.values(t.stats.leads).reduce((s, n) => s + (n ?? 0), 0);
  const stockValue = t.stock.reduce((s, p) => s + Number(p.price) * p.quantity, 0);
  const taskColumns = (done: boolean) => [
    { title: 'الرقم', dataIndex: 'number' },
    { title: 'النوع', render: (_: unknown, r: Task) => SERVICE_KIND[r.kind].label },
    { title: 'العميل', render: (_: unknown, r: Task) => r.customer.name },
    { title: 'المنطقة', render: (_: unknown, r: Task) => [r.address.area, r.address.city].filter(Boolean).join('، ') },
    done
      ? { title: 'تاريخ الإنجاز', render: (_: unknown, r: Task) => fmtDateTime(r.completedAt) }
      : { title: 'الموعد', render: (_: unknown, r: Task) => fmtDateTime(r.scheduledAt) },
    done
      ? { title: 'التقييم', render: (_: unknown, r: Task) => stars(r.rating) }
      : { title: 'الأولوية', render: (_: unknown, r: Task) => <EnumTag map={PRIORITY} value={r.priority} /> },
    { title: 'الحالة', render: (_: unknown, r: Task) => <EnumTag map={SERVICE_STATUS} value={r.status} /> },
  ];

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'الفنيين', to: '/technicians' }, { title: t.name }]}
        title={t.name}
        actions={can('technician.write') && <Button icon={<EditOutlined />} onClick={() => navigate(`/technicians/${t.id}/edit`)}>تعديل البيانات</Button>}
      />

      <Card style={{ marginBottom: 16 }}>
        <Flex gap={20} wrap align="center">
          <Badge dot status={!t.isActive ? 'error' : t.isAvailable ? 'success' : 'default'} offset={[-6, 54]}>
            <Avatar size={64} style={{ background: '#E3F5F8', color: '#1E8A9B', fontSize: 26, fontWeight: 800 }}>{t.name.trim().charAt(0)}</Avatar>
          </Badge>
          <Flex vertical gap={6} style={{ flex: 1, minWidth: 240 }}>
            <Flex gap={8} wrap align="center">
              <Typography.Text strong style={{ fontSize: 16 }}>بيانات الفني</Typography.Text>
              <Tag>{t.code}</Tag>
              {!t.isActive ? <Tag color="red">موقوف</Tag> : t.isAvailable ? <Tag color="green">متاح</Tag> : <Tag color="orange">غير متاح</Tag>}
            </Flex>
            <Flex gap={20} wrap style={{ color: '#5B6B80' }} align="center">
              {t.phone && <span><PhoneOutlined /> <bdi dir="ltr">{t.phone}</bdi></span>}
              <span>اسم المستخدم: <bdi dir="ltr">{t.username}</bdi></span>
              {t.serviceArea && <span>المنطقة: {t.serviceArea}</span>}
              <Space size={4}>{t.specializations.map((s) => <EnumTag key={s} map={SPECIALIZATION} value={s} />)}</Space>
            </Flex>
          </Flex>
        </Flex>
      </Card>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} xl={6}>
          <StatCard tone="blue" icon={<CheckCircleOutlined />} label="زيارات منجزة (30 يوم)" value={fmtNumber(t.stats.completed30)} hint={`${fmtNumber(t.open.length)} مهمة مفتوحة الآن`} />
        </Col>
        <Col xs={12} xl={6}>
          <StatCard tone="orange" icon={<StarOutlined />} label="متوسط التقييم" value={t.stats.avgRating30 != null ? t.stats.avgRating30.toFixed(1) : '—'} hint={`${fmtNumber(t.stats.ratings30)} تقييم خلال 30 يوم`} />
        </Col>
        <Col xs={12} xl={6}>
          <StatCard tone="green" icon={<DollarOutlined />} label="مبيعات (30 يوم)" value={<span style={{ fontSize: 20 }}>{fmtMoney(t.stats.revenue30)}</span>} />
        </Col>
        <Col xs={12} xl={6}>
          <StatCard
            tone={t.stats.cashInHand > 0 ? 'red' : 'teal'} icon={<WalletOutlined />} label="نقدية في العهدة"
            value={<span style={{ fontSize: 20 }}>{fmtMoney(t.stats.cashInHand)}</span>}
            hint={can('custody.read') ? 'كشف حساب العهدة' : undefined}
            onClick={can('custody.read') ? () => navigate(`/invoices/cash/${t.id}`) : undefined}
          />
        </Col>
      </Row>

      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            {
              key: 'open',
              label: <Space size={6}>المهام المفتوحة<Badge count={t.open.length} size="small" /></Space>,
              children: (
                <Table<Task> rowKey="id" dataSource={t.open} pagination={false} scroll={{ x: 760 }} columns={taskColumns(false)}
                  rowClassName="clickable" onRow={(r) => ({ onClick: () => navigate(`/service-requests/${r.id}`) })}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد مهام مفتوحة" /> }} />
              ),
            },
            {
              key: 'recent',
              label: 'آخر الزيارات المنجزة',
              children: (
                <Table<Task> rowKey="id" dataSource={t.recent} pagination={false} scroll={{ x: 760 }} columns={taskColumns(true)}
                  rowClassName="clickable" onRow={(r) => ({ onClick: () => navigate(`/service-requests/${r.id}`) })}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد زيارات منجزة" /> }} />
              ),
            },
            {
              key: 'stock',
              label: 'عهدة المنتجات',
              children: (
                <>
                  <Typography.Paragraph type="secondary">
                    {fmtNumber(t.stock.length)} صنف بقيمة تقريبية <Typography.Text strong>{fmtMoney(stockValue)}</Typography.Text>
                  </Typography.Paragraph>
                  <Table rowKey="id" dataSource={t.stock} pagination={false}
                    locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد عهدة" /> }}
                    columns={[
                      { title: 'المنتج', dataIndex: 'nameAr' },
                      { title: 'الكود', dataIndex: 'sku' },
                      { title: 'الكمية', dataIndex: 'quantity' },
                      { title: 'سعر الوحدة', dataIndex: 'price', render: fmtMoney },
                    ]} />
                </>
              ),
            },
            {
              key: 'cash',
              label: 'التوريدات النقدية',
              children: (
                <Table rowKey="id" dataSource={t.handovers} pagination={false}
                  locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا توجد توريدات" /> }}
                  columns={[
                    { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
                    { title: 'المبلغ', dataIndex: 'amount', render: fmtMoney },
                    { title: 'ملاحظة', dataIndex: 'note', render: (v) => v ?? '—' },
                    { title: 'الحالة', dataIndex: 'status', render: (v: HandoverStatus) => <EnumTag map={HANDOVER_STATUS} value={v} /> },
                  ]} />
              ),
            },
            {
              key: 'leads',
              label: <Space size={6}><RiseOutlined />الترشيحات</Space>,
              children: leadsTotal === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لم يرشح عملاء بعد" /> : (
                <Row gutter={[12, 12]}>
                  {([['NEW', 'جديد', 'blue'], ['CONTACTED', 'تم التواصل', 'orange'], ['WON', 'تم البيع', 'green'], ['LOST', 'لم يتم', 'red']] as const).map(([k, label, tone]) => (
                    <Col key={k} xs={12} md={6}>
                      <StatCard tone={tone} icon={<RiseOutlined />} label={label} value={fmtNumber(t.stats.leads[k] ?? 0)} />
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
