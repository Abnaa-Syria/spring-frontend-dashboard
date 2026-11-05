import { FileTextOutlined, SearchOutlined, ShoppingCartOutlined, ToolOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { AutoComplete, Flex, Input, Typography } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { fmtMoney } from '../lib/format';
import { SERVICE_KIND, SERVICE_STATUS, type ServiceKind, type ServiceStatus } from '../lib/labels';

interface SearchResult {
  customers: { id: number; name: string; phone: string }[];
  requests: { id: number; number: string; kind: ServiceKind; status: ServiceStatus; customer: { name: string } }[];
  orders: { id: number; number: string; status: string; customer: { name: string } }[];
  invoices: { id: number; number: string; total: string; customer: { name: string } | null }[];
}

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const row = (icon: ReactNode, title: ReactNode, sub: ReactNode) => (
  <Flex align="center" gap={10}>
    <span style={{ color: '#5B6B80' }} aria-hidden>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{sub}</Typography.Text>
    </div>
  </Flex>
);

/** Header search across customers, service requests, orders and invoices. */
export function GlobalSearch() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const { data, isFetching } = useQuery({
    queryKey: ['search', q],
    queryFn: async () => (await api.get<SearchResult>('/search', { params: { q } })).data,
    enabled: q.length >= 2,
    staleTime: 30_000,
  });

  const options = !data || q.length < 2 ? [] : [
    data.customers.length && {
      label: 'العملاء',
      options: data.customers.map((c) => ({ value: `/customers/${c.id}`, label: row(<UserOutlined />, c.name, <bdi dir="ltr">{c.phone}</bdi>) })),
    },
    data.requests.length && {
      label: 'طلبات الخدمة',
      options: data.requests.map((r) => ({
        value: `/service-requests?open=${r.id}`,
        label: row(<ToolOutlined />, r.number, `${r.customer.name} · ${SERVICE_KIND[r.kind].label} · ${SERVICE_STATUS[r.status].label}`),
      })),
    },
    data.orders.length && {
      label: 'طلبات المتجر',
      options: data.orders.map((o) => ({ value: `/orders?open=${o.id}`, label: row(<ShoppingCartOutlined />, o.number, o.customer.name) })),
    },
    data.invoices.length && {
      label: 'الفواتير',
      options: data.invoices.map((i) => ({
        value: `/invoices?open=${i.id}`,
        label: row(<FileTextOutlined />, i.number, `${i.customer?.name ?? '—'} · ${fmtMoney(i.total)}`),
      })),
    },
  ].filter(Boolean) as { label: string; options: { value: string; label: ReactNode }[] }[];

  const empty = q.length >= 2 && data && !options.length;

  return (
    <AutoComplete
      value={text}
      onChange={setText}
      options={options}
      onSelect={(to: string) => { setText(''); navigate(to); }}
      notFoundContent={empty ? 'لا توجد نتائج' : null}
      style={{ width: '100%' }}
      popupMatchSelectWidth={420}
      listHeight={440}
    >
      <Input
        allowClear
        prefix={<SearchOutlined style={{ color: '#8A99AD' }} />}
        suffix={isFetching ? <Typography.Text type="secondary" style={{ fontSize: 12 }}>...</Typography.Text> : null}
        placeholder="ابحث برقم الطلب أو الفاتورة أو اسم/موبايل العميل"
        aria-label="بحث شامل"
        style={{ background: '#F4F7FB', borderColor: 'transparent' }}
      />
    </AutoComplete>
  );
}
