import { PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App, Button, Card, Col, Form, Image, Input, InputNumber, Modal, Row, Select, Space, Switch, Table, Tabs, Tag,
  Typography,
} from 'antd';
import { useState } from 'react';
import { EnumTag } from '../../components/EnumTag';
import { ImageUploader } from '../../components/ImageUploader';
import { PageHeader } from '../../components/PageHeader';
import { useTabParam } from '../../lib/useOpenParam';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtMoney } from '../../lib/format';
import { PRODUCT_TYPE, options, type ProductType } from '../../lib/labels';
import type { Category, ProductRow } from './types';

export function ProductsPage() {
  const [tab, setTab] = useTabParam('products');
  return (
    <>
    <PageHeader title="المنتجات" subtitle="الأجهزة والشمعات وقطع الغيار المعروضة في المتجر وفواتير الفنيين" />
    <Card>
      <Tabs activeKey={tab} onChange={setTab} items={[
        { key: 'products', label: 'المنتجات', children: <ProductsTab /> },
        { key: 'categories', label: 'الفئات', children: <CategoriesTab /> },
      ]} />
    </Card>
    </>
  );
}

const useCategories = () => useQuery({
  queryKey: ['categories'],
  queryFn: async () => (await api.get<Category[]>('/categories')).data,
});

function ProductsTab() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; type?: ProductType; categoryId?: number }>({});
  const [editing, setEditing] = useState<ProductRow | 'new' | null>(null);
  const categories = useCategories();

  const { data, isFetching } = useQuery({
    queryKey: ['products', filters, page],
    queryFn: async () => (await api.get<Page<ProductRow>>('/products', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });
  const update = (patch: Partial<typeof filters>) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };

  return (
    <>
      <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space wrap>
          <Input.Search placeholder="الاسم أو الكود" allowClear onSearch={(v) => update({ search: v || undefined })} style={{ width: 240 }} />
          <Select allowClear placeholder="النوع" style={{ width: 150 }} options={options(PRODUCT_TYPE)} onChange={(v) => update({ type: v })} />
          <Select allowClear placeholder="الفئة" style={{ width: 180 }}
            options={categories.data?.map((c) => ({ value: c.id, label: c.nameAr }))} onChange={(v) => update({ categoryId: v })} />
        </Space>
        {can('product.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')}>منتج جديد</Button>}
      </Space>
      <Table<ProductRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        onRow={(p) => ({ onClick: () => can('product.write') && setEditing(p), style: { cursor: 'pointer' } })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          {
            title: '', width: 64,
            render: (_, p) => p.images[0] ? <Image src={p.images[0].url} width={44} height={44} style={{ objectFit: 'contain' }} preview={false} /> : null,
          },
          { title: 'المنتج', render: (_, p) => <>{p.nameAr}<br /><Typography.Text type="secondary">{p.sku}</Typography.Text></> },
          { title: 'النوع', dataIndex: 'type', render: (v: ProductType) => <EnumTag map={PRODUCT_TYPE} value={v} /> },
          { title: 'الفئة', render: (_, p) => p.category?.nameAr ?? '—' },
          { title: 'السعر', dataIndex: 'price', render: fmtMoney },
          { title: 'الضمان', dataIndex: 'warrantyMonths', render: (v) => (v ? `${v} شهر` : '—') },
          {
            title: 'الحالة',
            render: (_, p) => (
              <Space size={4}>
                {p.isActive ? <Tag color="green">نشط</Tag> : <Tag>موقوف</Tag>}
                {p.isSoldOnline && <Tag color="blue">بالمتجر</Tag>}
              </Space>
            ),
          },
        ]}
      />
      <ProductModal product={editing} categories={categories.data ?? []} onClose={() => setEditing(null)} />
    </>
  );
}

function ProductModal({
  product, categories, onClose,
}: { product: ProductRow | 'new' | null; categories: Category[]; onClose: () => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const existing = product && product !== 'new' ? product : null;
  const type = Form.useWatch('type', form) as ProductType | undefined;

  const save = useMutation({
    mutationFn: (v: Record<string, unknown> & { imageUrls?: string[] }) => {
      const body = { ...v, imageUrls: v.imageUrls ?? [] };
      return existing ? api.patch(`/products/${existing.id}`, body) : api.post('/products', body);
    },
    onSuccess: () => {
      message.success('تم حفظ المنتج');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      onClose();
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={!!product}
      title={existing ? `تعديل: ${existing.nameAr}` : 'منتج جديد'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={save.isPending}
      width={720}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        preserve={false}
        onFinish={save.mutate}
        initialValues={existing ? {
          ...existing,
          price: Number(existing.price),
          compareAtPrice: existing.compareAtPrice ? Number(existing.compareAtPrice) : undefined,
          categoryId: existing.categoryId ?? undefined,
          nameEn: existing.nameEn ?? undefined,
          descriptionAr: existing.descriptionAr ?? undefined,
          warrantyMonths: existing.warrantyMonths ?? undefined,
          replacementIntervalDays: existing.replacementIntervalDays ?? undefined,
          imageUrls: existing.images.map((i) => i.url),
        } : { type: 'DEVICE', isActive: true, isSoldOnline: true }}
      >
        <Row gutter={12}>
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
              <Select allowClear options={categories.map((c) => ({ value: c.id, label: c.nameAr }))} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="price" label="السعر" rules={[{ required: true, message: 'مطلوب' }]}>
              <InputNumber min={0} precision={2} style={{ width: '100%' }} suffix="ج.م" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="compareAtPrice" label="السعر قبل الخصم">
              <InputNumber min={0} precision={2} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="warrantyMonths" label="الضمان (شهور)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          </Col>
          {type === 'CARTRIDGE' && (
            <Col xs={12} md={6}>
              <Form.Item name="replacementIntervalDays" label="مدة التغيير (يوم)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item>
            </Col>
          )}
          <Col span={24}>
            <Form.Item name="descriptionAr" label="الوصف"><Input.TextArea rows={3} /></Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="imageUrls" label="الصور" extra="JPG / PNG / WEBP — حتى 5 ميجا للصورة. أول صورة هي الصورة الرئيسية.">
              <ImageUploader />
            </Form.Item>
          </Col>
          <Col>
            <Form.Item name="isActive" label="نشط" valuePropName="checked"><Switch /></Form.Item>
          </Col>
          <Col>
            <Form.Item name="isSoldOnline" label="يظهر في المتجر" valuePropName="checked"><Switch /></Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}

function CategoriesTab() {
  const { can } = useAuth();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { data, isFetching } = useCategories();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [form] = Form.useForm();
  const existing = editing && editing !== 'new' ? editing : null;

  const save = useMutation({
    mutationFn: (v: object) => (existing ? api.patch(`/categories/${existing.id}`, v) : api.post('/categories', v)),
    onSuccess: () => {
      message.success('تم الحفظ');
      qc.invalidateQueries({ queryKey: ['categories'] });
      setEditing(null);
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <>
      {can('product.write') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing('new')} style={{ marginBottom: 16 }}>فئة جديدة</Button>
      )}
      <Table<Category>
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        onRow={(c) => ({ onClick: () => can('product.write') && setEditing(c), style: { cursor: 'pointer' } })}
        columns={[
          { title: 'الفئة', dataIndex: 'nameAr' },
          { title: 'الفئة الأم', render: (_, c) => data?.find((p) => p.id === c.parentId)?.nameAr ?? '—' },
          { title: 'عدد المنتجات', render: (_, c) => c._count?.products ?? 0 },
          { title: 'الترتيب', dataIndex: 'sortOrder' },
          { title: 'الحالة', render: (_, c) => (c.isActive ? <Tag color="green">نشطة</Tag> : <Tag>موقوفة</Tag>) },
        ]}
      />
      <Modal
        open={!!editing}
        title={existing ? 'تعديل الفئة' : 'فئة جديدة'}
        onCancel={() => setEditing(null)}
        onOk={() => form.submit()}
        okText="حفظ"
        cancelText="إلغاء"
        confirmLoading={save.isPending}
        destroyOnHidden
      >
        <Form
          form={form}
          layout="vertical"
          preserve={false}
          onFinish={save.mutate}
          initialValues={existing
            ? { nameAr: existing.nameAr, nameEn: existing.nameEn ?? undefined, parentId: existing.parentId ?? undefined, sortOrder: existing.sortOrder, isActive: existing.isActive }
            : { sortOrder: 0, isActive: true }}
        >
          <Form.Item name="nameAr" label="الاسم بالعربي" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
          <Form.Item name="nameEn" label="الاسم بالإنجليزي"><Input dir="ltr" /></Form.Item>
          <Form.Item name="parentId" label="الفئة الأم">
            <Select allowClear options={data?.filter((c) => c.id !== existing?.id).map((c) => ({ value: c.id, label: c.nameAr }))} />
          </Form.Item>
          <Space>
            <Form.Item name="sortOrder" label="الترتيب"><InputNumber /></Form.Item>
            <Form.Item name="isActive" label="نشطة" valuePropName="checked"><Switch /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
