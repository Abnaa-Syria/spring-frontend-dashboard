import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type Page } from '../../lib/api';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../lib/auth';
import { useTabParam } from '../../lib/useOpenParam';
import { fmtDateTime } from '../../lib/format';
import { PRODUCT_TYPE } from '../../lib/labels';
import { MovementsTable, useWarehouses, warehouseOptions, type Balance, type Warehouse } from './shared';

export function InventoryPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useTabParam('warehouses');

  return (
    <>
    <PageHeader
      title="المخزون والعهد"
      subtitle="المخزن الرئيسي وعهد الفنيين، وكل حركة صرف أو بيع أو تسوية"
      actions={<>
        {can('inventory.approve') && <Button onClick={() => navigate('/inventory/movements/adjust')}>تالف / فاقد</Button>}
        {can('inventory.approve') && <Button onClick={() => navigate('/inventory/movements/count')}>جرد وتسوية</Button>}
        {can('inventory.write') && <Button onClick={() => navigate('/inventory/movements/receipt')}>استلام من مورد</Button>}
        {can('inventory.write') && <Button type="primary" onClick={() => navigate('/inventory/movements/transfer')}>صرف / تحويل عهدة</Button>}
      </>}
    />
    <Card>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'warehouses', label: 'المخازن وعهد الفنيين', children: <WarehousesTab onOpen={(id) => navigate(`/inventory/warehouses/${id}`)} /> },
        { key: 'balances', label: 'الأرصدة', children: <BalancesTab /> },
        { key: 'movements', label: 'سجل الحركات', children: <MovementsTab /> },
      ]} />
    </Card>
    </>
  );
}

function WarehousesTab({ onOpen }: { onOpen: (id: number) => void }) {
  const { data, isFetching } = useWarehouses();
  return (
    <Table<Warehouse>
      rowKey="id"
      loading={isFetching}
      dataSource={data}
      pagination={false}
      rowClassName="clickable"
      onRow={(w) => ({ onClick: () => onOpen(w.id) })}
      columns={[
        { title: 'المخزن / العهدة', render: (_, w) => (w.type === 'MAIN' ? w.name : w.technician?.user.name ?? w.name) },
        { title: 'النوع', render: (_, w) => (w.type === 'MAIN' ? <Tag color="blue">مخزن</Tag> : <Tag color="purple">عهدة فني</Tag>) },
        { title: 'كود الفني', render: (_, w) => w.technician?.code ?? '—' },
        { title: 'عدد الأصناف', dataIndex: 'productCount' },
        { title: 'إجمالي الوحدات', dataIndex: 'totalUnits' },
      ]}
    />
  );
}

function BalancesTab() {
  const ws = useWarehouses();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ warehouseId?: number; search?: string }>({});
  const { data, isFetching } = useQuery({
    queryKey: ['balances', filters, page],
    queryFn: async () => (await api.get<Page<Balance>>('/inventory/balances', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });
  return (
    <>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select allowClear placeholder="كل المخازن" style={{ width: 220 }} options={warehouseOptions(ws.data)}
          onChange={(v) => { setFilters((f) => ({ ...f, warehouseId: v })); setPage(1); }} />
        <Input.Search placeholder="المنتج أو الكود" allowClear style={{ width: 220 }}
          onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
      </Space>
      <Table<Balance>
        rowKey={(b) => `${b.warehouseId}-${b.productId}`}
        loading={isFetching}
        dataSource={data?.items}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'المخزن', render: (_, b) => b.warehouse.name },
          { title: 'المنتج', render: (_, b) => <>{b.product.nameAr} <Typography.Text type="secondary">({b.product.sku})</Typography.Text></> },
          { title: 'النوع', render: (_, b) => PRODUCT_TYPE[b.product.type].label },
          { title: 'الرصيد', dataIndex: 'quantity', render: (q: number) => <Typography.Text strong>{q}</Typography.Text> },
          { title: 'آخر حركة', dataIndex: 'updatedAt', render: fmtDateTime },
        ]}
      />
    </>
  );
}

function MovementsTab() {
  return <MovementsTable />;
}
