import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, Card, Col, Form, Input, InputNumber, Modal, Radio, Row, Select, Space, Table, Tabs, Tag, Typography,
} from 'antd';
import { useState } from 'react';
import { ProductPicker } from '../../components/ProductPicker';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDateTime, fmtSigned } from '../../lib/format';
import { MOVEMENT_TYPE, PRODUCT_TYPE, type MovementType, type ProductType } from '../../lib/labels';

interface Warehouse {
  id: number;
  name: string;
  type: 'MAIN' | 'TECHNICIAN';
  isActive: boolean;
  technician: { id: number; code: string; user: { name: string; isActive: boolean } } | null;
  totalUnits: number;
  productCount: number;
}
interface Balance {
  warehouseId: number;
  productId: number;
  quantity: number;
  updatedAt: string;
  product: { id: number; sku: string; nameAr: string; type: ProductType };
  warehouse: { id: number; name: string; type: string };
}
interface Movement {
  id: number;
  type: MovementType;
  quantity: number;
  signedQuantity?: number;
  note: string | null;
  createdAt: string;
  product: { nameAr: string; sku: string };
  fromWarehouse: { name: string } | null;
  toWarehouse: { name: string } | null;
  createdBy: { name: string };
  invoiceItem: { invoice: { number: string } } | null;
}

const useWarehouses = () => useQuery({
  queryKey: ['warehouses'],
  queryFn: async () => (await api.get<Warehouse[]>('/inventory/warehouses')).data,
});
const warehouseOptions = (ws?: Warehouse[], filter?: (w: Warehouse) => boolean) =>
  (ws ?? []).filter((w) => w.isActive && (!filter || filter(w))).map((w) => ({
    value: w.id,
    label: w.type === 'MAIN' ? `مخزن: ${w.name}` : `عهدة: ${w.technician?.user.name ?? w.name}`,
  }));

export function InventoryPage() {
  const { can } = useAuth();
  const [dialog, setDialog] = useState<'receipt' | 'transfer' | 'adjust' | 'count' | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | undefined>();

  return (
    <Card
      title={<Typography.Title level={4} style={{ margin: 0 }}>المخزون والعهد</Typography.Title>}
      extra={
        <Space wrap>
          {can('inventory.write') && <Button type="primary" onClick={() => setDialog('transfer')}>صرف / تحويل عهدة</Button>}
          {can('inventory.write') && <Button onClick={() => setDialog('receipt')}>استلام من مورد</Button>}
          {can('inventory.approve') && <Button onClick={() => setDialog('count')}>جرد وتسوية</Button>}
          {can('inventory.approve') && <Button onClick={() => setDialog('adjust')}>تالف / فاقد</Button>}
        </Space>
      }
    >
      <Tabs items={[
        { key: 'warehouses', label: 'المخازن وعهد الفنيين', children: <WarehousesTab onOpen={setWarehouseId} /> },
        { key: 'balances', label: 'الأرصدة', children: <BalancesTab /> },
        { key: 'movements', label: 'سجل الحركات', children: <MovementsTab /> },
      ]} />
      <WarehouseLedgerModal warehouseId={warehouseId} onClose={() => setWarehouseId(undefined)} />
      <MovementDialog kind={dialog} onClose={() => setDialog(null)} />
    </Card>
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
      onRow={(w) => ({ onClick: () => onOpen(w.id), style: { cursor: 'pointer' } })}
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

function MovementsTable({ warehouseId }: { warehouseId?: number }) {
  const [page, setPage] = useState(1);
  const { data, isFetching } = useQuery({
    queryKey: ['movements', warehouseId, page],
    queryFn: async () => (await api.get<Page<Movement>>('/inventory/movements', { params: { warehouseId, page } })).data,
    placeholderData: keepPreviousData,
  });
  return (
    <Table<Movement>
      rowKey="id"
      size="small"
      loading={isFetching}
      dataSource={data?.items}
      scroll={{ x: 900 }}
      pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
      columns={[
        { title: 'التاريخ', dataIndex: 'createdAt', render: fmtDateTime, width: 170 },
        { title: 'الحركة', dataIndex: 'type', render: (t: MovementType) => <Tag color={MOVEMENT_TYPE[t].color}>{MOVEMENT_TYPE[t].label}</Tag> },
        { title: 'المنتج', render: (_, m) => m.product.nameAr },
        {
          title: 'الكمية',
          render: (_, m) => m.signedQuantity === undefined ? m.quantity : (
            <Typography.Text type={m.signedQuantity > 0 ? 'success' : 'danger'}>
              <bdi dir="ltr">{fmtSigned(m.signedQuantity)}</bdi>
            </Typography.Text>
          ),
        },
        ...(warehouseId ? [] : [
          { title: 'من', render: (_: unknown, m: Movement) => m.fromWarehouse?.name ?? '—' },
          { title: 'إلى', render: (_: unknown, m: Movement) => m.toWarehouse?.name ?? '—' },
        ]),
        { title: 'المرجع / ملاحظة', render: (_, m) => m.invoiceItem?.invoice.number ?? m.note ?? '—' },
        { title: 'بواسطة', render: (_, m) => m.createdBy.name },
      ]}
    />
  );
}

function MovementsTab() {
  return <MovementsTable />;
}

function WarehouseLedgerModal({ warehouseId, onClose }: { warehouseId?: number; onClose: () => void }) {
  const ws = useWarehouses();
  const w = ws.data?.find((x) => x.id === warehouseId);
  const { data } = useQuery({
    queryKey: ['balances', { warehouseId }, 'ledger'],
    queryFn: async () => (await api.get<Page<Balance>>('/inventory/balances', { params: { warehouseId, pageSize: 100 } })).data,
    enabled: !!warehouseId,
  });
  return (
    <Modal open={!!warehouseId} onCancel={onClose} footer={null} width={960} destroyOnHidden
      title={w ? (w.type === 'MAIN' ? w.name : `عهدة ${w.technician?.user.name}`) : ''}>
      <Typography.Title level={5}>الرصيد الحالي</Typography.Title>
      <Table<Balance>
        rowKey="productId"
        size="small"
        pagination={false}
        dataSource={data?.items}
        locale={{ emptyText: 'لا يوجد رصيد' }}
        columns={[
          { title: 'المنتج', render: (_, b) => `${b.product.nameAr} (${b.product.sku})` },
          { title: 'الرصيد', dataIndex: 'quantity' },
        ]}
      />
      <Typography.Title level={5} style={{ marginTop: 24 }}>كشف الحركة</Typography.Title>
      {warehouseId && <MovementsTable warehouseId={warehouseId} />}
    </Modal>
  );
}

const TITLES = {
  receipt: 'استلام بضاعة من مورد',
  transfer: 'صرف / تحويل عهدة',
  adjust: 'تسجيل تالف أو فاقد أو زيادة',
  count: 'جرد وتسوية',
} as const;

function MovementDialog({ kind, onClose }: { kind: keyof typeof TITLES | null; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message, modal } = App.useApp();
  const qc = useQueryClient();
  const ws = useWarehouses();

  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => {
      const path = { receipt: '/inventory/receipts', transfer: '/inventory/transfers', adjust: '/inventory/adjustments', count: '/inventory/counts' }[kind!];
      return (await api.post(path, v)).data;
    },
    onSuccess: (res: { lines?: { productId: number; expected: number; counted: number; difference: number }[]; differences?: number }) => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      if (kind === 'count' && res.lines) {
        modal.info({
          title: res.differences ? `تم الجرد — ${res.differences} فروقات تمت تسويتها` : 'تم الجرد — لا توجد فروقات',
          content: res.lines.filter((l) => l.difference !== 0).map((l) => (
            <div key={l.productId}>منتج #{l.productId}: المسجل {l.expected}، الفعلي {l.counted} ({l.difference > 0 ? '+' : ''}{l.difference})</div>
          )),
        });
      } else {
        message.success('تم تسجيل الحركة');
      }
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const lines = kind === 'receipt' || kind === 'transfer' || kind === 'count';
  const qtyField = kind === 'count' ? 'countedQuantity' : 'quantity';

  return (
    <Modal open={!!kind} title={kind ? TITLES[kind] : ''} onCancel={onClose} onOk={() => form.submit()}
      okText="حفظ" cancelText="إلغاء" confirmLoading={save.isPending} width={680} destroyOnHidden>
      <Form form={form} layout="vertical" preserve={false} onFinish={save.mutate}
        initialValues={{ items: [{}], lines: [{}], direction: 'OUT' }}>
        {kind === 'transfer' ? (
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="fromWarehouseId" label="من" rules={[{ required: true, message: 'مطلوب' }]}>
                <Select options={warehouseOptions(ws.data)} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="toWarehouseId" label="إلى" rules={[{ required: true, message: 'مطلوب' }]}>
                <Select options={warehouseOptions(ws.data)} />
              </Form.Item>
            </Col>
          </Row>
        ) : kind && (
          <Form.Item name="warehouseId" label="المخزن / العهدة" rules={[{ required: true, message: 'مطلوب' }]}>
            <Select options={warehouseOptions(ws.data, kind === 'receipt' ? (w) => w.type === 'MAIN' : undefined)} />
          </Form.Item>
        )}

        {kind === 'adjust' && (
          <>
            <Form.Item name="direction" label="النوع">
              <Radio.Group optionType="button" options={[{ value: 'OUT', label: 'نقص (تالف / فاقد)' }, { value: 'IN', label: 'زيادة' }]} />
            </Form.Item>
            <Row gutter={12}>
              <Col xs={24} md={16}>
                <Form.Item name="productId" label="المنتج" rules={[{ required: true, message: 'مطلوب' }]}><ProductPicker /></Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="quantity" label="الكمية" rules={[{ required: true, message: 'مطلوب' }]}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="reason" label="السبب" rules={[{ required: true, min: 3, message: 'اذكر السبب' }]}><Input /></Form.Item>
          </>
        )}

        {lines && (
          <Form.List name={kind === 'count' ? 'lines' : 'items'}>
            {(fields, { add, remove }) => (
              <>
                {kind === 'count' && (
                  <Typography.Paragraph type="secondary">
                    أدخل الكمية الفعلية لكل منتج. أي فرق عن الرصيد المسجل يتسجل كحركة تسوية، والسجل القديم مايتمسحش.
                  </Typography.Paragraph>
                )}
                {fields.map((f) => (
                  <Space key={f.key} align="baseline" style={{ display: 'flex' }}>
                    <Form.Item name={[f.name, 'productId']} rules={[{ required: true, message: 'اختر المنتج' }]}>
                      <ProductPicker style={{ width: 340 }} />
                    </Form.Item>
                    <Form.Item name={[f.name, qtyField]} rules={[{ required: true, message: 'الكمية' }]}>
                      <InputNumber min={kind === 'count' ? 0 : 1} placeholder={kind === 'count' ? 'الفعلي' : 'الكمية'} />
                    </Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(f.name)} />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>إضافة صنف</Button>
              </>
            )}
          </Form.List>
        )}

        {kind !== 'adjust' && <Form.Item name="note" label="ملاحظة / مرجع" style={{ marginTop: 16 }}><Input /></Form.Item>}
      </Form>
    </Modal>
  );
}
