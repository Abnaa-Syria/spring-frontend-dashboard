import { DeleteOutlined, PlusOutlined, SwapOutlined, InboxOutlined, AuditOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert, App, AutoComplete, Button, Card, Checkbox, Col, Divider, Empty, Flex, Form, Input, InputNumber, Row, Select, Skeleton,
  Space, Statistic, Switch, Table, Tag, Typography,
} from 'antd';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtNumber } from '../../lib/format';
import { PRODUCT_TYPE, options, type ProductType } from '../../lib/labels';
import { useWarehouses } from '../inventory/shared';
import {
  PRODUCT_FEATURES, SPEC_LABELS, type Category, type ProductFeature, type ProductRow, type ProductSpec, type ProductStock,
} from './types';

type FormValues = Omit<Partial<ProductRow>, 'price' | 'compareAtPrice' | 'specs' | 'features' | 'images'> & {
  price?: number;
  compareAtPrice?: number;
  imageUrls?: string[];
  features?: ProductFeature[];
  specs?: Partial<ProductSpec>[];
  openingStock?: number;
};

/** /products/new and /products/:id/edit */
export function ProductFormPage() {
  const { id: rawId } = useParams();
  const id = rawId ? Number(rawId) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { can } = useAuth();
  const qc = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const type = Form.useWatch('type', form) as ProductType | undefined;

  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')).data });
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get<ProductRow>(`/products/${id}`)).data,
    enabled: id != null,
  });

  const save = useMutation({
    mutationFn: async (v: FormValues) => {
      const body = {
        ...v,
        imageUrls: v.imageUrls ?? [],
        features: v.features ?? [],
        specs: (v.specs ?? [])
          .map((s) => ({ label: s.label?.trim() ?? '', value: s.value?.trim() ?? '' }))
          .filter((s) => s.label && s.value),
        openingStock: id == null && v.openingStock ? v.openingStock : undefined,
      };
      return (id != null ? await api.patch<ProductRow>(`/products/${id}`, body) : await api.post<ProductRow>('/products', body)).data;
    },
    onSuccess: (p) => {
      message.success(id == null ? 'تم إضافة المنتج' : 'تم حفظ المنتج');
      ['products', 'product', 'categories', 'balances', 'movements', 'product-stock'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      // A new product lands on its own page, where its stock can be managed right away.
      navigate(id == null ? `/products/${p.id}/edit` : '/products', { replace: id == null });
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (id != null && (product.isLoading || !product.data)) return <Card><Skeleton active /></Card>;
  const existing = product.data;
  const title = existing ? `تعديل: ${existing.nameAr}` : 'منتج جديد';

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'المنتجات', to: '/products' }, { title }]}
        title={title}
        subtitle={existing ? <bdi dir="ltr">{existing.sku}</bdi> : 'بيانات المنتج كما تظهر في المتجر وتطبيق الفني، ورصيده في المخزن'}
      />
      {/* No <form> element: the stock panel below has its own form, and HTML forms can't nest. */}
      <Form<FormValues>
        form={form}
        component={false}
        layout="vertical"
        onFinish={save.mutate}
        onValuesChange={(changed: FormValues) => {
          // New product: entering a warranty period turns on the warranty badge.
          if (id == null && (changed.warrantyMonths ?? 0) > 0) {
            const f = form.getFieldValue('features') as ProductFeature[] | undefined;
            if (!f?.includes('WARRANTY')) form.setFieldValue('features', ['WARRANTY', ...(f ?? [])]);
          }
        }}
        initialValues={existing ? {
          ...existing,
          price: Number(existing.price),
          compareAtPrice: existing.compareAtPrice ? Number(existing.compareAtPrice) : undefined,
          categoryId: existing.categoryId ?? undefined,
          nameEn: existing.nameEn ?? undefined,
          subtitleAr: existing.subtitleAr ?? undefined,
          descriptionAr: existing.descriptionAr ?? undefined,
          warrantyMonths: existing.warrantyMonths ?? undefined,
          replacementIntervalDays: existing.replacementIntervalDays ?? undefined,
          imageUrls: existing.images.map((i) => i.url),
          features: existing.features ?? defaultFeatures(existing.type, existing.warrantyMonths),
          specs: existing.specs ?? [],
        } : { type: 'DEVICE', isActive: true, isSoldOnline: true, features: defaultFeatures('DEVICE', null), specs: [] }}
      >
        <Row gutter={[16, 16]} align="top">
          <Col xs={24} xl={16}>
            <Flex vertical gap={16}>
              <Card title="البيانات الأساسية">
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="nameAr" label="الاسم بالعربي" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="nameEn" label="الاسم بالإنجليزي"><Input dir="ltr" /></Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="sku" label="كود المنتج (SKU)" rules={[{ required: true, message: 'مطلوب' }]}><Input dir="ltr" /></Form.Item>
                  </Col>
                  <Col xs={12} md={8}>
                    <Form.Item name="type" label="النوع" rules={[{ required: true }]}><Select options={options(PRODUCT_TYPE)} /></Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="categoryId" label="الفئة">
                      <Select allowClear loading={categories.isLoading} options={categories.data?.map((c) => ({ value: c.id, label: c.nameAr }))} />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="price" label="السعر" rules={[{ required: true, message: 'مطلوب' }]}>
                      <InputNumber min={0} precision={2} style={{ width: '100%' }} suffix="ج.م" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="compareAtPrice" label="السعر قبل الخصم" extra="يظهر مشطوباً في المتجر">
                      <InputNumber min={0} precision={2} style={{ width: '100%' }} suffix="ج.م" />
                    </Form.Item>
                  </Col>
                  <Col xs={12} md={6}>
                    <Form.Item name="warrantyMonths" label="الضمان (شهور)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
                  </Col>
                  {type === 'CARTRIDGE' && (
                    <Col xs={12} md={6}>
                      <Form.Item name="replacementIntervalDays" label="مدة التغيير (يوم)" extra="لحساب موعد التغيير القادم">
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  )}
                </Row>
              </Card>

              <Card title="العرض في المتجر" extra={<Typography.Text type="secondary">صفحة المنتج في تطبيق العميل</Typography.Text>}>
                <Form.Item name="subtitleAr" label="وصف مختصر تحت الاسم" extra="مثال: مياه أكثر نقاءً وصحة لعائلتك">
                  <Input maxLength={160} showCount />
                </Form.Item>
                <Form.Item name="descriptionAr" label="وصف المنتج"><Input.TextArea rows={4} /></Form.Item>
                <Form.Item name="features" label="المميزات (تظهر بأيقونات تحت الوصف)">
                  <Checkbox.Group options={PRODUCT_FEATURES} />
                </Form.Item>
                <Divider titlePlacement="start" plain style={{ marginTop: 4 }}>تفاصيل المنتج (جدول المواصفات)</Divider>
                <Form.List name="specs">
                  {(fields, { add, remove, move }) => (
                    <Flex vertical gap={8}>
                      {fields.length === 0 && (
                        <Typography.Text type="secondary">لا توجد مواصفات بعد — أضف صفوفاً مثل عدد مراحل التنقية، سعة الخزان، الأبعاد…</Typography.Text>
                      )}
                      {fields.map((f, i) => (
                        <Flex key={f.key} gap={8} align="start">
                          <Form.Item name={[f.name, 'label']} style={{ flex: '0 0 38%', marginBottom: 0 }} rules={[{ required: true, message: 'اكتب البند' }]}>
                            <AutoComplete
                              options={SPEC_LABELS.map((l) => ({ value: l }))}
                              placeholder="البند (مثلاً: سعة خزان المياه)"
                              filterOption={(input, o) => (o?.value ?? '').includes(input)}
                            />
                          </Form.Item>
                          <Form.Item name={[f.name, 'value']} style={{ flex: 1, marginBottom: 0 }} rules={[{ required: true, message: 'اكتب القيمة' }]}>
                            <Input placeholder="القيمة (مثلاً: 12 لتر)" />
                          </Form.Item>
                          <Space.Compact>
                            <Button aria-label="لأعلى" disabled={i === 0} onClick={() => move(i, i - 1)}>↑</Button>
                            <Button aria-label="لأسفل" disabled={i === fields.length - 1} onClick={() => move(i, i + 1)}>↓</Button>
                            <Button aria-label="حذف" danger icon={<DeleteOutlined />} onClick={() => remove(f.name)} />
                          </Space.Compact>
                        </Flex>
                      ))}
                      <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ label: '', value: '' })} style={{ alignSelf: 'flex-start' }}>
                        إضافة صف
                      </Button>
                    </Flex>
                  )}
                </Form.List>
              </Card>

              <Card title="الصور">
                <Form.Item name="imageUrls" extra="JPG / PNG / WEBP — حتى 5 ميجا للصورة. أول صورة هي الصورة الرئيسية، والباقي يظهر كمعرض صور." style={{ marginBottom: 0 }}>
                  <ImageUploader />
                </Form.Item>
              </Card>
            </Flex>
          </Col>

          <Col xs={24} xl={8}>
            <Flex vertical gap={16} style={{ position: 'sticky', top: 88 }}>
              <Card title="الحالة">
                <Flex gap={32}>
                  <Form.Item name="isActive" label="نشط" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item>
                  <Form.Item name="isSoldOnline" label="يظهر في المتجر" valuePropName="checked" style={{ marginBottom: 0 }}><Switch /></Form.Item>
                </Flex>
              </Card>

              {existing ? (
                can('inventory.read') && <StockPanel productId={existing.id} />
              ) : can('inventory.write') ? (
                <Card title="المخزون">
                  <Form.Item
                    name="openingStock"
                    label="الكمية الافتتاحية في المخزن الرئيسي"
                    extra="تتسجل كحركة استلام في سجل المخزون. تقدر تزود الرصيد بعدين من صفحة المنتج."
                    style={{ marginBottom: 0 }}
                  >
                    <InputNumber min={0} max={100000} style={{ width: '100%' }} placeholder="0" />
                  </Form.Item>
                </Card>
              ) : null}

              <Card>
                <Flex gap={8}>
                  <Button type="primary" onClick={() => form.submit()} loading={save.isPending} block>حفظ</Button>
                  <Button onClick={() => navigate(-1)}>إلغاء</Button>
                </Flex>
              </Card>
            </Flex>
          </Col>
        </Row>
      </Form>
    </>
  );
}

/** Badges a product shows when none were chosen yet (same defaults as the customer app). */
function defaultFeatures(type: ProductType, warrantyMonths: number | null): ProductFeature[] {
  return [
    ...((warrantyMonths ?? 0) > 0 ? ['WARRANTY' as const] : []),
    ...(type === 'DEVICE' ? ['INSTALLATION' as const] : []),
    'DELIVERY',
    'AFTER_SALES',
  ];
}

/** Current stock of the product + quick receipt into the main warehouse, without leaving the page. */
function StockPanel({ productId }: { productId: number }) {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [receiveForm] = Form.useForm<{ quantity: number; note?: string }>();
  const warehouses = useWarehouses();
  const main = warehouses.data?.find((w) => w.type === 'MAIN' && w.isActive);
  const stock = useQuery({
    queryKey: ['product-stock', productId],
    queryFn: async () => (await api.get<ProductStock>(`/products/${productId}/stock`)).data,
  });

  const receive = useMutation({
    mutationFn: (v: { quantity: number; note?: string }) =>
      api.post('/inventory/receipts', { warehouseId: main!.id, items: [{ productId, quantity: v.quantity }], note: v.note || 'استلام من صفحة المنتج' }),
    onSuccess: (_, v) => {
      message.success(`تم استلام ${fmtNumber(v.quantity)} في ${main?.name ?? 'المخزن الرئيسي'}`);
      receiveForm.resetFields();
      ['product-stock', 'balances', 'movements', 'products'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  const s = stock.data;
  const low = s != null && s.main <= s.lowStockThreshold;

  return (
    <Card title="المخزون" extra={<Link to="/inventory?tab=balances">كل الأرصدة</Link>}>
      {stock.isLoading || !s ? <Skeleton active paragraph={{ rows: 3 }} /> : (
        <Flex vertical gap={12}>
          <Row gutter={8}>
            <Col span={8}><Statistic title="المخزن الرئيسي" value={s.main} styles={{ content: { color: low ? 'var(--c-danger)' : undefined } }} /></Col>
            <Col span={8}><Statistic title="عهد الفنيين" value={s.custody} /></Col>
            <Col span={8}><Statistic title="الإجمالي" value={s.total} /></Col>
          </Row>
          {low && (
            <Alert type="warning" showIcon title={s.main === 0 ? 'المنتج غير متوفر في المخزن — هيظهر "غير متوفر" في المتجر' : `الرصيد قارب على النفاد (حد التنبيه ${s.lowStockThreshold})`} />
          )}
          {s.warehouses.length > 0 ? (
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={s.warehouses}
              columns={[
                {
                  title: 'المكان',
                  render: (_, w) => (
                    <Space size={6}>
                      {w.type === 'MAIN' ? <Tag color="blue">مخزن</Tag> : <Tag>عهدة</Tag>}
                      <Link to={`/inventory/warehouses/${w.id}`}>{w.name}</Link>
                    </Space>
                  ),
                },
                { title: 'الكمية', dataIndex: 'quantity', align: 'end', render: (q: number) => fmtNumber(q) },
              ]}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="لا يوجد رصيد في أي مخزن" />
          )}

          {can('inventory.write') && main && (
            <>
              <Divider plain style={{ margin: '4px 0' }}>استلام كمية جديدة</Divider>
              <Form form={receiveForm} layout="vertical" onFinish={receive.mutate} requiredMark={false}>
                <Flex gap={8} align="end">
                  <Form.Item name="quantity" label={`الكمية إلى ${main.name}`} rules={[{ required: true, message: 'اكتب الكمية' }]} style={{ flex: 1, marginBottom: 0 }}>
                    <InputNumber min={1} max={100000} style={{ width: '100%' }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" icon={<InboxOutlined />} loading={receive.isPending}>استلام</Button>
                </Flex>
                <Form.Item name="note" style={{ margin: '8px 0 0' }}>
                  <Input placeholder="ملاحظة (اختياري): رقم فاتورة المورد…" />
                </Form.Item>
              </Form>
            </>
          )}
          <Flex gap={8} wrap>
            {can('inventory.write') && (
              <Link to="/inventory/movements/transfer"><Button icon={<SwapOutlined />}>صرف عهدة لفني</Button></Link>
            )}
            {can('inventory.approve') && main && (
              <Link to={`/inventory/movements/count?warehouseId=${main.id}`}><Button icon={<AuditOutlined />}>جرد وتسوية</Button></Link>
            )}
          </Flex>
        </Flex>
      )}
    </Card>
  );
}
