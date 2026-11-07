import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, Button, Card, Col, Flex, Form, Input, InputNumber, Radio, Result, Row, Select, Space, Table, Typography,
} from 'antd';
import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { ProductPicker } from '../../components/ProductPicker';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { MOVEMENT_TITLES, isMovementKind, useWarehouses, warehouseOptions } from './shared';

interface CountResult {
  differences?: number;
  lines?: { productId: number; expected: number; counted: number; difference: number }[];
}

const PATHS = { receipt: '/inventory/receipts', transfer: '/inventory/transfers', adjust: '/inventory/adjustments', count: '/inventory/counts' };
const HINTS = {
  receipt: 'البضاعة الواردة من المورد بتدخل المخزن الرئيسي وتتسجل كحركة استلام.',
  transfer: 'صرف من المخزن لعهدة فني، أو رجوع من عهدة فني للمخزن، أو تحويل بين عهدتين.',
  adjust: 'لتسجيل صنف تالف أو مفقود (نقص) أو صنف زيادة اتلقى في الجرد. لازم تذكر السبب.',
  count: 'أدخل الكمية الفعلية لكل منتج. أي فرق عن الرصيد المسجل يتسجل كحركة تسوية، والسجل القديم مايتمسحش.',
};

/** /inventory/movements/:kind — kind ∈ receipt | transfer | adjust | count. Optional ?warehouseId= preselects. */
export function MovementFormPage() {
  const { kind } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const ws = useWarehouses();
  const [form] = Form.useForm();
  const [countResult, setCountResult] = useState<CountResult | null>(null);

  const save = useMutation({
    mutationFn: async (v: Record<string, unknown>) => (await api.post(PATHS[kind as keyof typeof PATHS], v)).data as CountResult,
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['warehouses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['movements'] });
      if (kind === 'count') {
        setCountResult(res);
        return;
      }
      message.success('تم تسجيل الحركة');
      navigate('/inventory?tab=movements');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (!isMovementKind(kind)) return <Result status="404" title="نوع حركة غير معروف" extra={<Button onClick={() => navigate('/inventory')}>رجوع للمخزون</Button>} />;
  const allowed = kind === 'receipt' || kind === 'transfer' ? can('inventory.write') : can('inventory.approve');
  if (!allowed) return <Result status="403" title="ليس لديك صلاحية لهذا الإجراء" />;

  const title = MOVEMENT_TITLES[kind];
  const header = <PageHeader crumbs={[{ title: 'المخزون والعهد', to: '/inventory' }, { title }]} title={title} subtitle={HINTS[kind]} />;

  if (countResult) {
    const diffs = (countResult.lines ?? []).filter((l) => l.difference !== 0);
    return (
      <>
        {header}
        <Card style={{ maxWidth: 820 }}>
          <Result
            status="success"
            title={countResult.differences ? `تم الجرد — ${countResult.differences} فروقات تمت تسويتها` : 'تم الجرد — لا توجد فروقات'}
            extra={[
              <Button key="ok" type="primary" onClick={() => navigate('/inventory?tab=balances')}>عرض الأرصدة</Button>,
              <Button key="again" onClick={() => { setCountResult(null); form.resetFields(); }}>جرد جديد</Button>,
            ]}
          />
          {diffs.length > 0 && (
            <Table
              rowKey="productId"
              size="small"
              pagination={false}
              dataSource={diffs}
              columns={[
                { title: 'المنتج', render: (_, l) => `#${l.productId}` },
                { title: 'المسجل', dataIndex: 'expected' },
                { title: 'الفعلي', dataIndex: 'counted' },
                {
                  title: 'الفرق',
                  render: (_, l) => (
                    <Typography.Text type={l.difference > 0 ? 'success' : 'danger'}>
                      <bdi dir="ltr">{l.difference > 0 ? '+' : ''}{l.difference}</bdi>
                    </Typography.Text>
                  ),
                },
              ]}
            />
          )}
        </Card>
      </>
    );
  }

  const lines = kind === 'receipt' || kind === 'transfer' || kind === 'count';
  const qtyField = kind === 'count' ? 'countedQuantity' : 'quantity';
  const preset = params.get('warehouseId') ? Number(params.get('warehouseId')) : undefined;

  return (
    <>
      {header}
      <Card style={{ maxWidth: 820 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={save.mutate}
          initialValues={{
            items: [{}], lines: [{}], direction: 'OUT',
            ...(kind === 'transfer' ? { fromWarehouseId: preset } : { warehouseId: preset }),
          }}
        >
          {kind === 'transfer' ? (
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="fromWarehouseId" label="من" rules={[{ required: true, message: 'مطلوب' }]}>
                  <Select loading={ws.isLoading} options={warehouseOptions(ws.data)} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="toWarehouseId"
                  label="إلى"
                  dependencies={['fromWarehouseId']}
                  rules={[
                    { required: true, message: 'مطلوب' },
                    ({ getFieldValue }) => ({
                      validator: (_, v) => (v && v === getFieldValue('fromWarehouseId') ? Promise.reject(new Error('لازم يكون مختلف عن "من"')) : Promise.resolve()),
                    }),
                  ]}
                >
                  <Select loading={ws.isLoading} options={warehouseOptions(ws.data)} />
                </Form.Item>
              </Col>
            </Row>
          ) : (
            <Form.Item name="warehouseId" label="المخزن / العهدة" rules={[{ required: true, message: 'مطلوب' }]} style={{ maxWidth: 420 }}>
              <Select loading={ws.isLoading} options={warehouseOptions(ws.data, kind === 'receipt' ? (w) => w.type === 'MAIN' : undefined)} />
            </Form.Item>
          )}

          {kind === 'adjust' && (
            <>
              <Form.Item name="direction" label="النوع">
                <Radio.Group optionType="button" options={[{ value: 'OUT', label: 'نقص (تالف / فاقد)' }, { value: 'IN', label: 'زيادة' }]} />
              </Form.Item>
              <Row gutter={16}>
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
                  <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>الأصناف</Typography.Text>
                  {fields.map((f) => (
                    <Space key={f.key} align="baseline" style={{ display: 'flex' }} wrap>
                      <Form.Item name={[f.name, 'productId']} rules={[{ required: true, message: 'اختر المنتج' }]}>
                        <ProductPicker style={{ width: 420, maxWidth: '70vw' }} />
                      </Form.Item>
                      <Form.Item name={[f.name, qtyField]} rules={[{ required: true, message: 'الكمية' }]}>
                        <InputNumber min={kind === 'count' ? 0 : 1} placeholder={kind === 'count' ? 'الفعلي' : 'الكمية'} />
                      </Form.Item>
                      {fields.length > 1 && <MinusCircleOutlined aria-label="حذف الصنف" onClick={() => remove(f.name)} />}
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()} block>إضافة صنف</Button>
                </>
              )}
            </Form.List>
          )}

          {kind !== 'adjust' && <Form.Item name="note" label="ملاحظة / مرجع" style={{ marginTop: 16 }}><Input /></Form.Item>}
          {kind === 'count' && <Alert type="info" showIcon style={{ marginBottom: 16 }} title="الأصناف اللي مش هتدخلها مش هتتأثر بالجرد." />}

          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
