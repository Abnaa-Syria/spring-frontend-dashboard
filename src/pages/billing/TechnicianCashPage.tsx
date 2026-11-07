import { ClockCircleOutlined, WalletOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Row, Skeleton, Table, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, fmtMoney, fmtSigned } from '../../lib/format';
import { CASH_TYPE, useCashRows } from './types';

interface CashEntry {
  id: number; type: string; amount: string; note: string | null; createdAt: string;
  payment: { invoice: { id?: number; number: string } } | null; createdBy: { name: string };
}

export function TechnicianCashPage() {
  const technicianId = Number(useParams().technicianId);
  const navigate = useNavigate();
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const cash = useCashRows();
  const tech = cash.data?.find((c) => c.technicianId === technicianId);
  const { data, isFetching, isLoading } = useQuery({
    queryKey: ['cash', 'entries', technicianId, page],
    queryFn: async () => (await api.get<Page<CashEntry> & { balance: string }>(`/custody/cash/${technicianId}/entries`, { params: { page } })).data,
  });

  if (isLoading || cash.isLoading) return <Card><Skeleton active /></Card>;
  const name = tech?.name ?? `فني #${technicianId}`;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'الفواتير والتحصيل', to: '/invoices' }, { title: 'العهدة النقدية', to: '/invoices?tab=cash' }, { title: name }]}
        title={`كشف العهدة النقدية — ${name}`}
        subtitle={tech ? `كود الفني ${tech.code}` : undefined}
        actions={<>
          <Button onClick={() => navigate(`/technicians/${technicianId}`)}>ملف الفني</Button>
          {can('custody.approve') && tech && Number(tech.cashInHand) > 0 && (
            <Button type="primary" onClick={() => navigate(`/invoices/cash/${technicianId}/handover`)}>استلام نقدية</Button>
          )}
        </>}
      />
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12}>
          <StatCard tone="orange" icon={<WalletOutlined />} label="الرصيد الحالي في العهدة" value={fmtMoney(data?.balance)} />
        </Col>
        <Col xs={24} md={12}>
          <StatCard tone="blue" icon={<ClockCircleOutlined />} label="توريدات بانتظار المراجعة" value={fmtMoney(tech?.pendingHandovers ?? 0)} />
        </Col>
      </Row>
      <Card title="كشف الحركة" className="table-card">
        <Table<CashEntry>
          rowKey="id" loading={isFetching} dataSource={data?.items} scroll={{ x: 720 }}
          pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
          columns={[
            { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
            { title: 'الحركة', render: (_, e) => CASH_TYPE[e.type]?.label ?? e.type },
            {
              title: 'المبلغ',
              render: (_, e) => {
                const sign = CASH_TYPE[e.type]?.sign ?? 1;
                return (
                  <Typography.Text type={sign > 0 ? 'success' : 'danger'}>
                    <bdi dir="ltr">{fmtSigned(sign * Number(e.amount))}</bdi>
                  </Typography.Text>
                );
              },
            },
            { title: 'المرجع', render: (_, e) => e.payment?.invoice.number ?? e.note ?? '—' },
            { title: 'بواسطة', render: (_, e) => e.createdBy.name },
          ]}
        />
      </Card>
    </>
  );
}
