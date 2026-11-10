import { LockOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Checkbox, Col, Flex, Form, Input, Row, Skeleton, Switch, Typography, Select } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { useCoverage } from '../../lib/governorates';
import { SPECIALIZATION, options, type Specialization } from '../../lib/labels';
import { PHONE_RULE } from '../../lib/validation';

interface Technician {
  id: number; code: string; name: string; username: string; phone: string | null; isActive: boolean;
  isAvailable: boolean; serviceArea: string | null; governorates: string[]; areaIds: number[]; specializations: Specialization[];
}

/** /technicians/new and /technicians/:id/edit */
export function TechnicianFormPage() {
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const coverage = useCoverage();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['technician', editId],
    queryFn: async () => (await api.get<Technician>(`/technicians/${editId}`)).data,
    enabled: editId != null,
  });

  const save = useMutation({
    mutationFn: async (v: object) =>
      (editId ? await api.patch<Technician>(`/technicians/${editId}`, v) : await api.post<Technician>('/technicians', v)).data,
    onSuccess: (t) => {
      message.success('تم حفظ بيانات الفني');
      ['technicians', 'technician', 'technician-overview'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      navigate(`/technicians/${editId ?? t.id}`);
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (editId != null && (isLoading || !existing)) return <Card><Skeleton active /></Card>;

  const crumbs = [
    { title: 'الفنيين', to: '/technicians' },
    ...(existing ? [{ title: existing.name, to: `/technicians/${existing.id}` }] : []),
    { title: existing ? 'تعديل' : 'فني جديد' },
  ];

  return (
    <>
      <PageHeader crumbs={crumbs} title={existing ? `تعديل: ${existing.name}` : 'فني جديد'}
        subtitle={existing ? `كود ${existing.code} · اسم المستخدم ${existing.username}` : 'بيانات الفني وحساب الدخول على تطبيق الفنيين'} />
      <Flex vertical gap={16} style={{ maxWidth: 860 }}>
        <Card title="بيانات الفني">
          <Form
            form={form}
            layout="vertical"
            onFinish={save.mutate}
            initialValues={existing
              ? { name: existing.name, phone: existing.phone ?? undefined, code: existing.code, serviceArea: existing.serviceArea ?? undefined, governorates: existing.governorates ?? [], areaIds: existing.areaIds ?? [],
                  specializations: existing.specializations, isAvailable: existing.isAvailable, isActive: existing.isActive }
              : { specializations: [] }}
          >
            <Row gutter={12}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="code" label="كود الفني" rules={[{ required: true, message: 'مطلوب' }]}><Input dir="ltr" /></Form.Item>
              </Col>
              <Col xs={12} md={6}>
                <Form.Item name="phone" label="الموبايل (للدخول على التطبيق)" rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}><Input dir="ltr" /></Form.Item>
              </Col>
              {!existing && (
                <>
                  <Col xs={24} md={12}>
                    <Form.Item name="username" label="اسم المستخدم" rules={[
                      { required: true, message: 'مطلوب' },
                      { pattern: /^[a-zA-Z0-9_.]{3,32}$/, message: 'حروف إنجليزية وأرقام فقط (3 أحرف على الأقل)' },
                    ]}>
                      <Input dir="ltr" autoComplete="off" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="password" label="كلمة المرور" rules={[{ required: true, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}>
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                  </Col>
                </>
              )}
              <Col span={24}>
                <Form.Item name="specializations" label="التخصصات" rules={[{ required: true, type: 'array', min: 1, message: 'اختر تخصصاً واحداً على الأقل' }]}>
                  <Checkbox.Group options={options(SPECIALIZATION)} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="governorates" label="محافظات بيغطيها بالكامل" extra="الفنيين اللي بيغطّوا محافظة العميل بيظهروا الأول وقت التعيين">
                  <Select mode="multiple" allowClear placeholder="اختر المحافظات" loading={coverage.isLoading}
                    options={(coverage.data?.governorates ?? []).map((g) => ({ value: g.name, label: g.name }))} optionFilterProp="label" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="areaIds" label="مناطق محددة بيغطيها" extra="الفني اللي بيغطي منطقة العميل نفسها بيظهر قبل الكل">
                  <Select mode="multiple" allowClear placeholder="اختر المناطق" loading={coverage.isLoading} optionFilterProp="label"
                    options={(coverage.data?.governorates ?? []).filter((g) => g.areas.length).map((g) => ({
                      label: g.name, title: g.name, options: g.areas.map((a) => ({ value: a.id, label: `${a.name} — ${g.name}` })),
                    }))} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="serviceArea" label="الأحياء (وصف)"><Input placeholder="مثال: مدينة نصر، مصر الجديدة" /></Form.Item>
              </Col>
              {existing && (
                <>
                  <Col xs={12} md={6}><Form.Item name="isAvailable" label="متاح لاستلام مهام" valuePropName="checked"><Switch /></Form.Item></Col>
                  <Col xs={12} md={6}><Form.Item name="isActive" label="الحساب مفعل" valuePropName="checked"><Switch /></Form.Item></Col>
                </>
              )}
            </Row>
            <Flex gap={8}>
              <Button type="primary" htmlType="submit" loading={save.isPending}>حفظ</Button>
              <Button onClick={() => navigate(-1)}>إلغاء</Button>
            </Flex>
          </Form>
        </Card>
        {existing && <ResetPasswordCard technicianId={existing.id} />}
      </Flex>
    </>
  );
}

function ResetPasswordCard({ technicianId }: { technicianId: number }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const reset = useMutation({
    mutationFn: (v: { password: string }) => api.post(`/technicians/${technicianId}/reset-password`, v),
    onSuccess: () => { message.success('تم تغيير كلمة المرور وتسجيل خروج الفني من كل الأجهزة'); form.resetFields(); },
    onError: (e) => message.error(errorMessage(e)),
  });
  return (
    <Card title={<><LockOutlined /> تغيير كلمة المرور</>}>
      <Typography.Paragraph type="secondary">الفني هيتسجل خروجه من كل الأجهزة ويدخل بالكلمة الجديدة.</Typography.Paragraph>
      <Form form={form} layout="vertical" onFinish={reset.mutate} style={{ maxWidth: 420 }}>
        <Form.Item name="password" label="كلمة المرور الجديدة" rules={[{ required: true, message: 'مطلوب' }, { min: 8, message: '8 أحرف على الأقل' }]}>
          <Input.Password autoComplete="new-password" />
        </Form.Item>
        <Button htmlType="submit" loading={reset.isPending}>تغيير كلمة المرور</Button>
      </Form>
    </Card>
  );
}
