import { useQuery } from '@tanstack/react-query';
import { Button, Card, Col, Result, Row, Skeleton, Table, Tag, Typography } from 'antd';
import { AppstoreOutlined, DropboxOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { StatCard } from '../../components/StatCard';
import { api, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, fmtNumber } from '../../lib/format';
import { PRODUCT_TYPE } from '../../lib/labels';
import { MovementsTable, useWarehouses, type Balance } from './shared';

/** /inventory/warehouses/:id — current balance + movement ledger of one warehouse / technician custody. */
export function WarehouseDetailPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { can } = useAuth();
  const ws = useWarehouses();
  const balances = useQuery({
    queryKey: ['balances', { warehouseId: id }, 'ledger'],
    queryFn: async () => (await api.get<Page<Balance>>('/inventory/balances', { params: { warehouseId: id, pageSize: 100 } })).data,
    enabled: Number.isFinite(id),
  });

  if (ws.isLoading) return <Card><Skeleton active /></Card>;
  const w = ws.data?.find((x) => x.id === id);
  if (!w) return <Result status="404" title="المخزن غير موجود" extra={<Button onClick={() => navigate('/inventory')}>رجوع للمخزون</Button>} />;

  const isMain = w.type === 'MAIN';
  const title = isMain ? w.name : `عهدة ${w.technician?.user.name ?? w.name}`;
  const q = `?warehouseId=${w.id}`;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'المخزون والعهد', to: '/inventory' }, { title }]}
        title={<>{title} {isMain ? <Tag color="blue">مخزن</Tag> : <Tag color="purple">عهدة فني</Tag>}</>}
        subtitle={w.technician ? <>كود الفني {w.technician.code} · <Link to={`/technicians/${w.technician.id}`}>صفحة الفني</Link></> : undefined}
        actions={<>
          {can('inventory.approve') && <Button onClick={() => navigate(`/inventory/movements/count${q}`)}>جرد وتسوية</Button>}
          {can('inventory.approve') && <Button onClick={() => navigate(`/inventory/movements/adjust${q}`)}>تالف / فاقد</Button>}
          {can('inventory.write') && isMain && <Button onClick={() => navigate(`/inventory/movements/receipt${q}`)}>استلام من مورد</Button>}
          {can('inventory.write') && <Button type="primary" onClick={() => navigate(`/inventory/movements/transfer${q}`)}>صرف / تحويل</Button>}
        </>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}><StatCard tone="blue" icon={<AppstoreOutlined />} label="عدد الأصناف" value={fmtNumber(w.productCount)} /></Col>
        <Col xs={12} lg={6}><StatCard tone="teal" icon={<DropboxOutlined />} label="إجمالي الوحدات" value={fmtNumber(w.totalUnits)} /></Col>
      </Row>

      <Card title="الرصيد الحالي" style={{ marginBottom: 16 }} className="table-card">
        <Table<Balance>
          rowKey="productId"
          loading={balances.isFetching}
          pagination={false}
          dataSource={balances.data?.items}
          locale={{ emptyText: 'لا يوجد رصيد' }}
          columns={[
            { title: 'المنتج', render: (_, b) => <>{b.product.nameAr} <Typography.Text type="secondary">({b.product.sku})</Typography.Text></> },
            { title: 'النوع', render: (_, b) => PRODUCT_TYPE[b.product.type].label },
            { title: 'الرصيد', dataIndex: 'quantity', render: (v: number) => <Typography.Text strong>{v}</Typography.Text> },
            { title: 'آخر حركة', dataIndex: 'updatedAt', render: fmtDateTime },
          ]}
        />
      </Card>

      <Card title="كشف الحركة" className="table-card">
        <MovementsTable warehouseId={w.id} />
      </Card>
    </>
  );
}
