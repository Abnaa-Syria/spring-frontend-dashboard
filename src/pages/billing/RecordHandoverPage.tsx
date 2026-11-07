import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Flex, Form, Input, InputNumber, Skeleton } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { api, errorMessage } from '../../lib/api';
import { fmtMoney } from '../../lib/format';
import { useCashRows } from './types';

export function RecordHandoverPage() {
  const technicianId = Number(useParams().technicianId);
  const navigate = useNavigate();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const cash = useCashRows();
  const tech = cash.data?.find((c) => c.technicianId === technicianId);
  const save = useMutation({
    mutationFn: (v: { amount: number; note?: string }) => api.post('/custody/handovers', { ...v, technicianId }),
    onSuccess: () => {
      message.success('تم تسجيل استلام النقدية');
      qc.invalidateQueries({ queryKey: ['cash'] });
      qc.invalidateQueries({ queryKey: ['handovers'] });
      navigate('/invoices?tab=cash');
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  if (cash.isLoading) return <Card><Skeleton active /></Card>;
  const name = tech?.name ?? `فني #${technicianId}`;
  const available = tech ? Number(tech.cashInHand) - Number(tech.pendingHandovers) : 0;

  return (
    <>
      <PageHeader
        crumbs={[{ title: 'الفواتير والتحصيل', to: '/invoices' }, { title: 'العهدة النقدية', to: '/invoices?tab=cash' }, { title: name }]}
        title={`استلام نقدية من ${name}`}
      />
      <Card style={{ maxWidth: 560 }}>
        <Alert
          type="info" showIcon style={{ marginBottom: 20 }}
          title={`في العهدة: ${fmtMoney(tech?.cashInHand ?? 0)} — منها بانتظار المراجعة: ${fmtMoney(tech?.pendingHandovers ?? 0)}`}
        />
        <Form layout="vertical" onFinish={save.mutate} initialValues={{ amount: available > 0 ? available : undefined }}>
          <Form.Item name="amount" label="المبلغ المستلم" rules={[{ required: true, message: 'مطلوب' }]}>
            <InputNumber min={0.01} max={tech ? Number(tech.cashInHand) : undefined} precision={2} style={{ width: '100%' }} suffix="ج.م" />
          </Form.Item>
          <Form.Item name="note" label="ملاحظة"><Input /></Form.Item>
          <Flex gap={8}>
            <Button type="primary" htmlType="submit" loading={save.isPending} disabled={!tech}>تسجيل الاستلام</Button>
            <Button onClick={() => navigate(-1)}>إلغاء</Button>
          </Flex>
        </Form>
      </Card>
    </>
  );
}
