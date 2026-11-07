import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Flex, Form, Input, InputNumber, Result, Row, Select, Skeleton, Switch } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import type { Category } from './types';

/** /products/categories/new and /products/categories/:id/edit */
export function CategoryFormPage() {
  const { id: rawId } = useParams();
  const id = rawId ? Number(rawId) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Category[]>('/categories')).data });

  const save = useMutation({
    mutationFn: (v: object) => (id != null ? api.patch(`/categories/${id}`, v) : api.post('/categories', v)),
    onSuccess: () => {
      message.success('تم حفظ الفئة');
      qc.invalidateQueries({ queryKey: ['categories'] });
      navigate('/products?tab=categories');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (isLoading || !data) return <Card><Skeleton active /></Card>;
  const existing = id != null ? data.find((c) => c.id === id) : undefined;
  if (id != null && !existing) return <Result status="404" title="الفئة غير موجودة" />;
  const title = existing ? `تعديل الفئة: ${existing.nameAr}` : 'فئة جديدة';

  return (
    <>
      <PageHeader crumbs={[{ title: 'المنتجات', to: '/products' }, { title: 'الفئات', to: '/products?tab=categories' }, { title }]} title={title} />
      <Card style={{ maxWidth: 640 }}>
        <Form
          layout="vertical"
          onFinish={save.mutate}
          initialValues={existing
            ? { nameAr: existing.nameAr, nameEn: existing.nameEn ?? undefined, parentId: existing.parentId ?? undefined, sortOrder: existing.sortOrder, isActive: existing.isActive }
            : { sortOrder: 0, isActive: true }}
        >
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="nameAr" label="الاسم بالعربي" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nameEn" label="الاسم بالإنجليزي"><Input dir="ltr" /></Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="parentId" label="الفئة الأم">
                <Select allowClear options={data.filter((c) => c.id !== existing?.id).map((c) => ({ value: c.id, label: c.nameAr }))} />
              </Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="sortOrder" label="الترتيب"><InputNumber style={{ width: '100%' }} /></Form.Item>
            </Col>
            <Col xs={12} md={6}>
              <Form.Item name="isActive" label="نشطة" valuePropName="checked"><Switch /></Form.Item>
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
