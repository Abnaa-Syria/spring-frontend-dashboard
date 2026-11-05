import { DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import { PageHeader } from '../../components/PageHeader';
import { downloadCsv, fetchAll } from '../../lib/export';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Card, Col, Form, Input, Modal, Row, Table, Tag, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorMessage, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { fmtDate } from '../../lib/format';
import { PHONE_RULE } from '../../lib/validation';
import { AddressFields } from './AddressFields';
import type { CustomerDetail, CustomerRow } from './types';


export function CustomersPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: async () =>
      (await api.get<Page<CustomerRow>>('/customers', { params: { search: search || undefined, page } })).data,
    placeholderData: keepPreviousData,
  });

  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await fetchAll<CustomerRow>('/customers', { search: search || undefined });
      downloadCsv('customers', [
        { title: 'الاسم', value: (c) => c.name },
        { title: 'الموبايل', value: (c) => c.phone },
        { title: 'موبايل آخر', value: (c) => c.altPhone },
        { title: 'المحافظة', value: (c) => c.addresses[0]?.governorate },
        { title: 'المدينة', value: (c) => c.addresses[0]?.city },
        { title: 'المنطقة', value: (c) => c.addresses[0]?.area },
        { title: 'الأجهزة', value: (c) => c._count.devices },
        { title: 'طلبات الخدمة', value: (c) => c._count.serviceRequests },
        { title: 'طلبات المتجر', value: (c) => c._count.orders },
        { title: 'حساب التطبيق', value: (c) => (c.userId ? 'نعم' : 'لا') },
        { title: 'رقم النظام القديم', value: (c) => c.legacyCustomerId },
        { title: 'تاريخ الإضافة', value: (c) => fmtDate(c.createdAt) },
      ], rows);
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
    <PageHeader
      title="العملاء"
      subtitle={data ? `${data.total.toLocaleString('en-US')} عميل` : undefined}
      actions={<>
        <Button icon={<DownloadOutlined />} loading={exporting} onClick={exportCsv}>تصدير Excel</Button>
        {can('customer.write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>عميل جديد</Button>}
      </>}
    />
    <Card className="table-card">
      <div className="table-toolbar">
        <Input.Search
          placeholder="الاسم، الموبايل، أو رقم العميل في النظام القديم"
          allowClear
          onSearch={(v) => { setSearch(v.trim()); setPage(1); }}
          style={{ maxWidth: 360 }}
        />
      </div>
      <Table<CustomerRow>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 800 }}
        rowClassName="clickable"
        onRow={(c) => ({ onClick: () => navigate(`/customers/${c.id}`) })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'الاسم', dataIndex: 'name', render: (v: string) => <Typography.Text strong>{v}</Typography.Text> },
          { title: 'الموبايل', dataIndex: 'phone', render: (v: string) => <span dir="ltr">{v}</span> },
          {
            title: 'المنطقة',
            render: (_, c) => (c.addresses[0] ? [c.addresses[0].area, c.addresses[0].city].filter(Boolean).join('، ') : '—'),
          },
          { title: 'الأجهزة', render: (_, c) => c._count.devices },
          { title: 'طلبات الخدمة', render: (_, c) => c._count.serviceRequests },
          {
            title: 'الحساب',
            render: (_, c) => (c.userId ? <Tag color="green">مسجل بالتطبيق</Tag> : <Tag>بدون حساب</Tag>),
          },
          { title: 'تاريخ الإضافة', dataIndex: 'createdAt', render: fmtDate },
        ]}
      />
      <CreateCustomerModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(id) => navigate(`/customers/${id}`)}
      />
    </Card>
    </>
  );
}

function CreateCustomerModal({
  open, onClose, onCreated,
}: { open: boolean; onClose: () => void; onCreated: (id: number) => void }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (v: { name: string; phone: string; altPhone?: string; address: object }) =>
      (await api.post<CustomerDetail>('/customers', v)).data,
    onSuccess: (c) => {
      message.success('تم إضافة العميل');
      qc.invalidateQueries({ queryKey: ['customers'] });
      onCreated(c.id);
    },
    onError: (e) => message.error(errorMessage(e)),
  });

  return (
    <Modal
      open={open}
      title="عميل جديد"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="حفظ"
      cancelText="إلغاء"
      confirmLoading={create.isPending}
      width={680}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={create.mutate}>
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Form.Item name="name" label="الاسم" rules={[{ required: true, message: 'مطلوب' }]}><Input /></Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="phone" label="الموبايل" rules={[{ required: true, message: 'مطلوب' }, PHONE_RULE]}>
              <Input dir="ltr" />
            </Form.Item>
          </Col>
          <Col xs={12} md={8}>
            <Form.Item name="altPhone" label="موبايل آخر" rules={[PHONE_RULE]}><Input dir="ltr" /></Form.Item>
          </Col>
        </Row>
        <Typography.Text strong>العنوان</Typography.Text>
        <AddressFields prefix="address" />
      </Form>
    </Modal>
  );
}
