import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import { useState } from 'react';
import { api, type Page } from '../lib/api';
import type { ProductRow } from '../pages/products/types';

/** Searchable product select (by name or SKU). */
export function ProductPicker({ value, onChange, style }: {
  value?: number;
  onChange?: (v: number) => void;
  style?: React.CSSProperties;
}) {
  const [search, setSearch] = useState('');
  const { data, isFetching } = useQuery({
    queryKey: ['products', 'picker', search],
    queryFn: async () =>
      (await api.get<Page<ProductRow>>('/products', { params: { search: search || undefined, isActive: true, pageSize: 20 } })).data.items,
  });
  return (
    <Select
      value={value}
      onChange={onChange}
      style={style}
      placeholder="ابحث باسم المنتج أو الكود"
      loading={isFetching}
      showSearch={{ filterOption: false, onSearch: setSearch }}
      options={data?.map((p) => ({ value: p.id, label: `${p.nameAr} (${p.sku})` }))}
    />
  );
}
