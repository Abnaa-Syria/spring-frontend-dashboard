import { BellOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge, Button, Empty, Flex, Popover, Typography } from 'antd';
import { api, type Page } from '../lib/api';
import { fmtDateTime } from '../lib/format';

interface Notification { id: number; title: string; body: string; readAt: string | null; createdAt: string }

export function NotificationBell() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get<Page<Notification> & { unread: number }>('/notifications', { params: { pageSize: 15 } })).data,
    refetchInterval: 60_000,
  });
  const readAll = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const content = (
    <div style={{ width: 320, maxHeight: 420, overflow: 'auto' }}>
      {!data?.items.length ? <Empty description="لا توجد إشعارات" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : (
        <Flex vertical gap={12}>
          {data.items.map((n) => (
            <div key={n.id} style={{ opacity: n.readAt ? 0.6 : 1 }}>
              <Typography.Text strong>{n.title}</Typography.Text>
              <div>{n.body}</div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>{fmtDateTime(n.createdAt)}</Typography.Text>
            </div>
          ))}
        </Flex>
      )}
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      title={
        <Flex justify="space-between" align="center">
          الإشعارات
          {!!data?.unread && <Button size="small" type="link" onClick={() => readAll.mutate()}>تعليم الكل كمقروء</Button>}
        </Flex>
      }
      content={content}
    >
      <Badge count={data?.unread} size="small">
        <Button type="text" icon={<BellOutlined />} aria-label="الإشعارات" />
      </Badge>
    </Popover>
  );
}
