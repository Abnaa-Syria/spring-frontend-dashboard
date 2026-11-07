import { PlusOutlined } from '@ant-design/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Button, Card, Image, Input, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EnumTag } from '../../components/EnumTag';
import { PageHeader } from '../../components/PageHeader';
import { useTabParam } from '../../lib/useOpenParam';
import { api, type Page } from '../../lib/api';
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
  const navigate = useNavigate();
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
        {can('product.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/new')}>منتج جديد</Button>}
      </Space>
      <Table<ProductRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        rowClassName={can('product.write') ? 'clickable' : undefined}
        onRow={(p) => ({ onClick: () => can('product.write') && navigate(`/products/${p.id}/edit`) })}
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
    </>
  );
}

function CategoriesTab() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { data, isFetching } = useCategories();

  return (
    <>
      {can('product.write') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/products/categories/new')} style={{ marginBottom: 16 }}>فئة جديدة</Button>
      )}
      <Table<Category>
        rowKey="id"
        loading={isFetching}
        dataSource={data}
        pagination={false}
        rowClassName={can('product.write') ? 'clickable' : undefined}
        onRow={(c) => ({ onClick: () => can('product.write') && navigate(`/products/categories/${c.id}/edit`) })}
        columns={[
          { title: 'الفئة', dataIndex: 'nameAr' },
          { title: 'الفئة الأم', render: (_, c) => data?.find((p) => p.id === c.parentId)?.nameAr ?? '—' },
          { title: 'عدد المنتجات', render: (_, c) => c._count?.products ?? 0 },
          { title: 'الترتيب', dataIndex: 'sortOrder' },
          { title: 'الحالة', render: (_, c) => (c.isActive ? <Tag color="green">نشطة</Tag> : <Tag>موقوفة</Tag>) },
        ]}
      />
    </>
  );
}
