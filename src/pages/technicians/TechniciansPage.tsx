import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  Button, Card, Input, Select, Space, Table, Tag,
} from 'antd';
import { useState } from 'react';
import { EnumTag } from '../../components/EnumTag';
import { api, type Page } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { SPECIALIZATION, options, type Specialization } from '../../lib/labels';

interface Technician {
  id: number;
  code: string;
  name: string;
  username: string;
  phone: string | null;
  isActive: boolean;
  isAvailable: boolean;
  serviceArea: string | null;
  specializations: Specialization[];
  openTasks: number;
}

export function TechniciansPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<{ search?: string; specialization?: Specialization }>({});

  const { data, isFetching } = useQuery({
    queryKey: ['technicians', filters, page],
    queryFn: async () => (await api.get<Page<Technician>>('/technicians', { params: { ...filters, page } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <>
    <PageHeader
      title="الفنيين"
      subtitle="اضغط على الفني لعرض مهامه وأداءه وعهدته"
      actions={can('technician.write') && (
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/technicians/new')}>فني جديد</Button>
      )}
    />
    <Card className="table-card">
      <Space wrap className="table-toolbar" style={{ display: 'flex' }}>
        <Input.Search placeholder="الاسم، الكود أو الموبايل" allowClear style={{ width: 260 }}
          onSearch={(v) => { setFilters((f) => ({ ...f, search: v || undefined })); setPage(1); }} />
        <Select allowClear placeholder="التخصص" style={{ width: 160 }} options={options(SPECIALIZATION)}
          onChange={(v) => { setFilters((f) => ({ ...f, specialization: v })); setPage(1); }} />
      </Space>
      <Table<Technician>
        rowKey="id"
        loading={isFetching}
        dataSource={data?.items}
        scroll={{ x: 900 }}
        rowClassName="clickable"
        onRow={(t) => ({ onClick: () => navigate(`/technicians/${t.id}`) })}
        pagination={{ current: page, pageSize: 20, total: data?.total, onChange: setPage, showSizeChanger: false }}
        columns={[
          { title: 'الكود', dataIndex: 'code', width: 100 },
          { title: 'الاسم', dataIndex: 'name' },
          { title: 'اسم المستخدم', dataIndex: 'username', render: (v) => <span dir="ltr">{v}</span> },
          { title: 'الموبايل', dataIndex: 'phone', render: (v) => <span dir="ltr">{v ?? '—'}</span> },
          {
            title: 'التخصصات',
            render: (_, t) => <Space size={4} wrap>{t.specializations.map((s) => <EnumTag key={s} map={SPECIALIZATION} value={s} />)}</Space>,
          },
          { title: 'المنطقة', dataIndex: 'serviceArea', render: (v) => v ?? '—' },
          { title: 'مهام مفتوحة', dataIndex: 'openTasks' },
          {
            title: 'الحالة',
            render: (_, t) => !t.isActive ? <Tag color="red">موقوف</Tag> : t.isAvailable ? <Tag color="green">متاح</Tag> : <Tag color="orange">غير متاح</Tag>,
          },
          {
            title: '',
            render: (_, t) => can('technician.write') && (
              <Space onClick={(e) => e.stopPropagation()}>
                <Button size="small" onClick={() => navigate(`/technicians/${t.id}/edit`)}>تعديل</Button>
              </Space>
            ),
          },
        ]}
      />
    </Card>
    </>
  );
}
