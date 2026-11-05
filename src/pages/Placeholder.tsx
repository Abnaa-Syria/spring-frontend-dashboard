import { Card, Empty } from 'antd';

export function Placeholder({ title }: { title: string }) {
  return (
    <Card title={title}>
      <Empty description="قيد التنفيذ" />
    </Card>
  );
}
