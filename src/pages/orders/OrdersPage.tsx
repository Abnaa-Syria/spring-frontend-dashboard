import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { App, Badge, Button, Card, Col, Input, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage, type Page } from '../../lib/api';
import { downloadCsv, fetchAll } from '../../lib/export';
import { ORDER_STATUS, type OrderStatus } from '../../lib/labels';
import { fmtDateTime, fmtMoney } from '../../lib/format';
import { paymentLabel, type OrderRow } from './types';

const STATUS = ORDER_STATUS;

export function OrdersPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ status?: OrderStatus; search?: string }>({});
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const { data, isFetching } = useQuery({
    queryKey: ['orders', filters, page],
    queryFn: async () =>
      (await api.get<Page<OrderRow> & { byStatus: Partial<Record<OrderStatus, number>> }>('/orders', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll<OrderRow>('/orders', filters);
      downloadCsv('orders', [
        { title: 'رقم الطلب', value: (o) => o.number },
        { title: 'التاريخ', value: (o) => fmtDateTime(o.createdAt) },
        { title: 'العميل', value: (o) => o.customer.name },
        { title: 'الموبايل', value: (o) => o.customer.phone },
        { title: 'المدينة', value: (o) => o.address.city },
        { title: 'المنطقة', value: (o) => o.address.area },
        { title: 'عدد الأصناف', value: (o) => o._count.items },
        { title: 'الإجمالي', value: (o) => Number(o.total) },
        { title: 'الحالة', value: (o) => STATUS[o.status].label },
      ], rows);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };
  const setStatus = (v?: OrderStatus) => { setFilters((f) => ({ ...f, status: v })); setPage(1); };

  return (
    <>
    <PageHeader
      title="طلبات المتجر"
      subtitle="طلبات الشراء من تطبيق العميل: التجهيز، التوصيل والتحصيل"
      actions={<Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>تصدير Excel</Button>}
    />
    <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
      {(Object.keys(STATUS) as OrderStatus[]).map((s) => {
        const active = filters.status === s;
        return (
          <Col key={s} xs={12} sm={8} lg={{ flex: '20%' }}>
            <Card
              hoverable
              onClick={() => setStatus(active ? undefined : s)}
              styles={{ body: { padding: 14 } }}
              style={active ? { borderColor: 'var(--c-primary)', boxShadow: '0 0 0 1px var(--c-primary)' } : undefined}
            >
              <Statistic title={<Space size={6}><Badge color={STATUS[s].color} />{STATUS[s].label}</Space>} value={data?.byStatus[s] ?? 0} />
            </Card>
          </Col>
        );
      })}
    </Row>
    <Card className="table-card">
      <Space wrap className="table-toolbar" style={{ display: 'flex' }}>
        <Input.Search placeholder="رقم الطلب، اسم أو موبايل العميل" allowClear style={{ width: 280 }}
          onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
        <Select allowClear placeholder="الحالة" style={{ width: 160 }} value={filters.status}
          options={(Object.keys(STATUS) as OrderStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))}
          onChange={setStatus} />
      </Space>
      <Table<OrderRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        rowClassName="clickable"
        onRow={(o) => ({ onClick: () => navigate(`/orders/${o.id}`) })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'رقم الطلب', dataIndex: 'number' },
          { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime },
          { title: 'العميل', render: (_, o) => <>{o.customer.name}<br /><Typography.Text type="secondary" dir="ltr">{o.customer.phone}</Typography.Text></> },
          { title: 'المنطقة', render: (_, o) => [o.address.area, o.address.city].filter(Boolean).join('، ') },
          { title: 'الأصناف', render: (_, o) => o._count.items },
          { title: 'الإجمالي', dataIndex: 'total', render: fmtMoney },
          { title: 'الدفع', dataIndex: 'paymentMethod', render: paymentLabel },
          { title: 'الحالة', render: (_, o) => <Tag color={STATUS[o.status].color}>{STATUS[o.status].label}</Tag> },
        ]}
      />
    </Card>
    </>
  );
}
