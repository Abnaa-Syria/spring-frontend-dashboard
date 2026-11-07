import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Flex, Form, Input, InputNumber, Row, Select, Skeleton, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { ImageUploader } from '../../components/ImageUploader';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { PRODUCT_TYPE, options, type ProductType } from '../../lib/labels';
import type { Category, ProductRow } from './types';

/** /products/new and /products/:id/edit */
export function ProductFormPage() {
  const { id: rawId } = useParams();
  const id = rawId ? Number(rawId) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const type = Form.useWatch('type', form) as ProductType | undefined;

  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')).data });
  const product = useQuery({
    queryKey: ['product', id],
    queryFn: async () => (await api.get<ProductRow>(`/products/${id}`)).data,
    enabled: id != null,
  });

  const save = useMutation({
    mutationFn: (v: Record<string, unknown> & { imageUrls?: string[] }) => {
      const body = { ...v, imageUrls: v.imageUrls ?? [] };
      return id != null ? api.patch(`/products/${id}`, body) : api.post('/products', body);
    },
    onSuccess: () => {
      message.success('تم حفظ المنتج');
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['product', id] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      navigate('/products');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (id != null && (product.isLoading || !product.data)) return <Card><Skeleton active /></Card>;
  const existing = product.data;
  const title = existing ? `تعديل: ${existing.nameAr}` : 'منتج جديد';

  return (
    <>
      <PageHeader crumbs={[{ title: 'المنتجات', to: '/products' }, { title }]} title={title} subtitle={existing?.sku} />
      <Card style={{ maxWidth: 960 }}>
        <Form
          form={form}
          layout="vertical"
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
          } :{ type: 'DEVICE', isActive: true, isSoldOnline: true }}
        >
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
              <Form.Item name="descriptionAr" label="الوصف"><Input.TextArea rows={4} /></Form.Item>
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
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
