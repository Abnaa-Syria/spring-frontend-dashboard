import { Tag } from 'antd';

export function EnumTag<K extends string>({
  map, value,
}: { map: Record<K, { label: string; color?: string }>; value: K }) {
  const v = map[value];
  return <Tag color={v?.color}>{v?.label ?? value}</Tag>;
}
